// Persists the rider's active trip id across tab switches / reloads so
// switching to "Driver" and back doesn't reset the in-progress ride.
const KEY = "namlo.activeRiderTripId";

export function getActiveRiderTripId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setActiveRiderTripId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
}

export function clearActiveRiderTripId(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
