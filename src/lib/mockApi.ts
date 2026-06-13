/**
 * Persistent ride history via a mock REST endpoint.
 *
 * Set VITE_MOCKAPI_RIDES_URL to your MockAPI.io (or Beeceptor) URL, e.g.
 *   https://<project>.mockapi.io/api/v1/rides
 *
 * Falls back to localStorage so the demo still works before the URL is wired.
 */
const URL = import.meta.env.VITE_MOCKAPI_RIDES_URL as string | undefined;
const FALLBACK_KEY = "namlo_history_fallback_v1";

export type RideHistoryRecord = {
  id?: string;
  trip_id: string;
  status: "completed" | "cancelled" | "rejected";
  rider_id: string;
  driver_id: string | null;
  pickup_label: string | null;
  dropoff_label: string | null;
  distance_km: number | null;
  fare_estimate: number | null;
  created_at: string;
  ended_at: string;
};

function readFallback(): RideHistoryRecord[] {
  try {
    return JSON.parse(localStorage.getItem(FALLBACK_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeFallback(rows: RideHistoryRecord[]) {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(rows));
}

export async function postRideHistory(record: RideHistoryRecord): Promise<RideHistoryRecord> {
  if (!URL) {
    const rows = readFallback();
    const row = { ...record, id: crypto.randomUUID() };
    rows.unshift(row);
    writeFallback(rows);
    return row;
  }
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(`History POST failed: ${res.status}`);
  return res.json();
}

export async function fetchRideHistory(): Promise<RideHistoryRecord[]> {
  if (!URL) return readFallback();
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`History GET failed: ${res.status}`);
  const data = (await res.json()) as Array<Partial<RideHistoryRecord>>;
  // MockAPI seeds new resources with default faker rows that don't have
  // our fields — filter to records that look like real trip archives.
  return data
    .filter((r): r is RideHistoryRecord => !!r.trip_id && !!r.status && !!r.ended_at)
    .sort((a, b) => (a.ended_at < b.ended_at ? 1 : -1));
}

export const usingFallback = !URL;
