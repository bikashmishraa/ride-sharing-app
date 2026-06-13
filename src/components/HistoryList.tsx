import { useQuery } from "@tanstack/react-query";
import { fetchRideHistory, usingFallback } from "@/lib/mockApi";

const badgeClass: Record<string, string> = {
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
};

export function HistoryList() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["ride-history"],
    queryFn: fetchRideHistory,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ride history</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Persisted to{" "}
            {usingFallback ? (
              <span className="text-amber-400">
                local fallback — set <code>VITE_MOCKAPI_RIDES_URL</code> to use MockAPI.io
              </span>
            ) : (
              "your mock REST endpoint"
            )}
            .
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/80"
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-red-400">Failed to load history.</p>}

      <div className="space-y-2">
        {data?.length === 0 && (
          <p className="text-muted-foreground">No completed trips yet.</p>
        )}
        {data?.map((r) => (
          <div
            key={r.id ?? r.trip_id}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  Trip {(r.trip_id ?? "").slice(0, 8) || "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.ended_at ? new Date(r.ended_at).toLocaleString() : "—"}
                </div>
                {(r.pickup_label || r.dropoff_label) && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {r.pickup_label ?? "—"} → {r.dropoff_label ?? "—"}
                  </div>
                )}
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  badgeClass[r.status] ?? ""
                }`}
              >
                {r.status}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>Distance: {r.distance_km != null ? Number(r.distance_km).toFixed(2) : "—"} km</div>
              <div>Fare: NPR {r.fare_estimate ?? "—"}</div>
              <div>Driver: {r.driver_id ?? "—"}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
