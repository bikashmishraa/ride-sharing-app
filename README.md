# Ride Sharing App — NangloTech Internship
A real-time ride-sharing simulation platform with both **Rider** and **Driver** interfaces in a single unified frontend. Built for the NangloTech internship challenge.
---
## Quick Start
### Prerequisites
- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/) 1.1+
- A Supabase project (database + realtime)
- A Google Maps API key (for maps and geocoding)
### 1. Clone & Install
```bash
git clone <repo-url>
cd <repo-folder>
bun install          # or: npm install
```
> **Note:** This project uses Bun by default (`bun.lock` is present). If you use npm, delete `bun.lock` first.
### 2. Environment Variables
Copy the included `.env` and fill in any missing values:
```bash
cp .env .env.local   # optional — .env is already tracked for demo purposes
```
| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` | Google Maps JS API key |
| `VITE_MOCKAPI_RIDES_URL` | *(Optional)* MockAPI/Beeceptor URL for ride history persistence. Falls back to `localStorage` if omitted. |
### 3. Run Locally
```bash
bun dev              # starts dev server on http://localhost:3000
```
### 4. Build for Production
```bash
bun run build        # outputs to .output/public (Nitro / serverless)
bun run preview      # preview the production build locally
```
### 5. Lint & Format
```bash
bun run lint         # ESLint
bun run format       # Prettier
```
---
## Architecture Overview
### Stack
| Layer | Choice |
|-------|--------|
| Framework | **TanStack Start v1** — full-stack React (SSR + file-based routing + server functions) |
| UI | React 19, Tailwind CSS v4, shadcn/ui primitives |
| State (server) | **Supabase** — PostgreSQL + realtime broadcasts |
| State (client) | TanStack Query + React hooks |
| Maps | Leaflet + OpenStreetMap tiles (Google Maps API for geocoding only) |
| Routing | OSRM public demo server (free, no key) |
| Auth | Hardcoded session-only login (`intern@namlotech.com` / `namlo2026`) |
### File-Based Routing
Routes live under `src/routes/` and are auto-registered by TanStack Router:
```
src/routes/
  __root.tsx          # App shell (HTML, providers, error boundary)
  index.tsx           # /  → redirects to login or /app/rider
  login.tsx           # /login
  app.tsx             # /app layout (tabs: Rider | Driver | History)
  app.rider.tsx       # /app/rider
  app.rider.trip.tsx  # /app/rider/trip/:tripId
  app.driver.tsx      # /app/driver
  app.history.tsx     # /app/history
```
No `src/pages/`, no manual route table. Adding a file like `src/routes/about.tsx` automatically creates `/about`.
### Data Flow
1. **Loader** — `context.queryClient.ensureQueryData(...)` fetches on the server (or during SSR) so the first render is never loading.
2. **Component** — `useSuspenseQuery(...)` reads cached data; no `useEffect` + `fetch`.
3. **Mutations** — `createServerFn` from `@tanstack/react-start` provides typed RPC. Server handlers run in a serverless Worker (Cloudflare-compatible).
4. **Realtime** — Supabase `postgres_changes` channels push trip updates to both Rider and Driver UIs without polling.
### Trip State Machine
Trips follow a strict finite-state machine (`src/features/trip/tripMachine.ts`):
```
requesting → accepted → driver_enroute → in_progress → completed
     ↓           ↓            ↓              ↓
  cancelled   cancelled    cancelled      cancelled
  rejected
```
Invalid transitions are rejected at the UI level, preventing race conditions.
### Key Patterns
- **Route computation** — `createServerFn` calls the OSRM public API server-side, returning an encoded polyline compatible with the client-side decoder.
- **Map layers** — Leaflet markers + polylines are managed with `useRef` to avoid React re-renders on every GPS tick.
- **Cleanup** — All Supabase channels, intervals, and map listeners are removed in `useEffect` cleanup to prevent memory leaks.
- **Responsive layout** — Flexbox + Tailwind utility classes; mobile-first with `sm:` breakpoints.
---
## Project Structure
```
src/
  components/           # Reusable UI components (MapView, LocationSearch, DriverPanel, etc.)
  components/ui/        # shadcn/ui primitives (Button, Dialog, Tabs, etc.)
  features/trip/        # Trip domain: types, API, state machine, realtime hooks, route logic
  hooks/                # Shared custom hooks (use-mobile, etc.)
  integrations/supabase/  # Supabase client, auth middleware, generated types
  lib/                  # Utilities (auth, geocoding, polyline decoder, mock API, config)
  routes/               # TanStack Start file-based routes
  router.tsx            # Router factory (per-request QueryClient)
  server.ts             # SSR entry wrapper (error normalization)
  start.ts              # TanStack Start instance config (middleware)
  styles.css            # Tailwind v4 theme tokens + global styles
```
---
## Deployment Notes
This is a **full-stack app** (SSR + server functions). It cannot be deployed as static HTML.
- **Output format:** Nitro (serverless bundle) — default target is Cloudflare Workers.
- **Required env vars at runtime:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- If deploying to Vercel, use the **Other** framework preset, build command `bun run build`, and output directory `.output/public`.
---
## License
Internship project — not for production use.
