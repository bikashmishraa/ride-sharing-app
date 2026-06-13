import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { isAuthed, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";


export const Route = createFileRoute("/app")({
  // Client-only guard; demo auth lives in sessionStorage.
  ssr: false,
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthed()) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/app/rider", label: "Rider" },
    { to: "/app/driver", label: "Driver" },
    { to: "/app/history", label: "History" },
  ] as const;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <span className="shrink-0 font-semibold tracking-tight">Namlo</span>
          <nav className="flex items-center gap-1 rounded-full border border-border bg-secondary p-1">
            {tabs.map((t) => {
              const active = pathname === t.to;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors sm:px-3 sm:text-sm ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0"
          onClick={() => {
            signOut();
            navigate({ to: "/login" });
          }}
        >
          Sign out
        </Button>
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      
    </div>
  );
}
