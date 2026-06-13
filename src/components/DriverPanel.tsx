import { useEffect, useMemo, useRef, useState } from "react";
import { MapView } from "./MapView";
import { Button } from "@/components/ui/button";
import { usePendingTrips, useTripSubscription } from "@/features/trip/useTripChannel";
import { useRoute } from "@/features/trip/useRoute";
import { updateDriverPosition, updateTripStatus } from "@/features/trip/api";
import { statusLabel } from "@/features/trip/tripMachine";
import { isTerminal, type Trip } from "@/features/trip/types";
import { KATHMANDU, lerp, randomNear, type LatLng } from "@/lib/geo";
import { toast } from "sonner";

const DRIVER_ID = "driver-demo";
const TICK_MS = 1000;
const STEP = 0.04; // progress per tick toward target (~25 ticks end-to-end)

export function DriverPanel() {
  const pending = usePendingTrips();
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const trip = useTripSubscription(activeTripId);

  const pickup = trip ? { lat: trip.pickup_lat, lng: trip.pickup_lng } : null;
  const dropoff = trip ? { lat: trip.dropoff_lat, lng: trip.dropoff_lng } : null;
  const route = useRoute(pickup, dropoff);

  // Driver's idle position (when no active trip).
  const idlePos = useRef<LatLng>(randomNear({ lat: KATHMANDU[0], lng: KATHMANDU[1] }, 1));

  // Index of next polyline point to advance to while in_progress.
  const pathIdxRef = useRef(0);
  useEffect(() => {
    if (trip?.status !== "in_progress") pathIdxRef.current = 0;
  }, [trip?.status, trip?.id]);

  // Drop active trip when it terminates.
  useEffect(() => {
    if (trip && isTerminal(trip.status)) {
      const t = setTimeout(() => setActiveTripId(null), 2500);
      return () => clearTimeout(t);
    }
  }, [trip?.status, trip]);

  // Simulator: moves the driver each tick. No auto status transitions —
  // the driver advances the trip stage manually via buttons.
  useEffect(() => {
    if (!trip) return;
    if (isTerminal(trip.status)) return;
    if (trip.status === "requesting" || trip.status === "rejected") return;
    if (trip.status === "accepted") return; // wait for driver to start heading

    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      const current: LatLng =
        trip.driver_lat != null && trip.driver_lng != null
          ? { lat: trip.driver_lat, lng: trip.driver_lng }
          : idlePos.current;

      // In-progress: follow the real road path point-by-point, stop at last.
      if (trip.status === "in_progress" && route && route.path.length > 1) {
        if (pathIdxRef.current >= route.path.length - 1) return;
        const idx = Math.min(pathIdxRef.current + 1, route.path.length - 1);
        pathIdxRef.current = idx;
        const next = route.path[idx];
        await updateDriverPosition(trip.id, next.lat, next.lng);
        return;
      }

      // driver_enroute (or in_progress before route loads): LERP toward target.
      const target: LatLng =
        trip.status === "in_progress"
          ? { lat: trip.dropoff_lat, lng: trip.dropoff_lng }
          : { lat: trip.pickup_lat, lng: trip.pickup_lng };

      const next = lerp(current, target, STEP);
      const dx = Math.hypot(next.lat - target.lat, next.lng - target.lng);
      if (dx < 0.0005) return; // arrived — wait for driver button
      await updateDriverPosition(trip.id, next.lat, next.lng);
    }, TICK_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [trip?.id, trip?.status, trip, route]);

  const driverPos = useMemo<LatLng | null>(() => {
    if (trip?.driver_lat != null && trip.driver_lng != null)
      return { lat: trip.driver_lat, lng: trip.driver_lng };
    return idlePos.current;
  }, [trip?.driver_lat, trip?.driver_lng]);

  const handleAccept = async (t: Trip) => {
    try {
      await updateTripStatus(t, "accepted", {
        driver_id: DRIVER_ID,
        driver_lat: idlePos.current.lat,
        driver_lng: idlePos.current.lng,
      });
      setActiveTripId(t.id);
      toast.success("Trip accepted");
    } catch (e) {
      console.error(e);
      toast.error("Could not accept (already taken?)");
    }
  };

  const handleReject = async (t: Trip) => {
    try {
      await updateTripStatus(t, "rejected");
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartEnroute = async () => {
    if (!trip) return;
    await updateTripStatus(trip, "driver_enroute");
  };

  const handleStartTrip = async () => {
    if (!trip) return;
    await updateTripStatus(trip, "in_progress", {
      driver_lat: trip.pickup_lat,
      driver_lng: trip.pickup_lng,
    });
  };

  const handleCompleteTrip = async () => {
    if (!trip) return;
    await updateTripStatus(trip, "completed", {
      driver_lat: trip.dropoff_lat,
      driver_lng: trip.dropoff_lng,
    });
    toast.success("Ride completed");
  };

  const handleCancel = async () => {
    if (!trip) return;
    await updateTripStatus(trip, "cancelled");
  };

  return (
    <div className="relative h-full w-full">
      <MapView
        markers={{ pickup, dropoff, driver: driverPos }}
        showRoute={!!trip && !isTerminal(trip.status)}
        routePath={route?.path ?? null}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] px-3 pb-3 sm:p-4 md:left-4 md:right-auto md:w-[380px]">
        <div className="pointer-events-auto mx-auto w-full max-w-md rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur md:mx-0">
          {trip ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs uppercase tracking-wider text-muted-foreground">
                  Active · {trip.id.slice(0, 8)}
                </p>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {trip.vehicle === "car" ? "🚗 Car" : "🏍️ Bike"}
                </span>
              </div>
              <p className="mt-1 text-lg font-semibold">{statusLabel(trip.status)}</p>
              <p className="text-xs text-muted-foreground">
                {trip.distance_km?.toFixed(2)} km · NPR {trip.fare_estimate}
              </p>
              {trip.pickup_label && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  <span className="text-emerald-400">●</span> {trip.pickup_label}
                </p>
              )}
              {trip.dropoff_label && (
                <p className="truncate text-xs text-muted-foreground">
                  <span className="text-rose-400">●</span> {trip.dropoff_label}
                </p>
              )}

              {trip.status === "accepted" && (
                <Button className="mt-3 w-full" onClick={handleStartEnroute}>
                  Start heading to pickup
                </Button>
              )}
              {trip.status === "driver_enroute" && (
                <Button className="mt-3 w-full" onClick={handleStartTrip}>
                  Arrived — Start trip
                </Button>
              )}
              {trip.status === "in_progress" && (
                <Button className="mt-3 w-full" onClick={handleCompleteTrip}>
                  Complete ride
                </Button>
              )}
              {!isTerminal(trip.status) && (
                <Button
                  variant="ghost"
                  className="mt-2 w-full text-destructive hover:text-destructive"
                  onClick={handleCancel}
                >
                  Cancel trip
                </Button>
              )}
              {isTerminal(trip.status) && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Returning to inbox…
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Driver inbox · {pending.length} pending
              </p>
              <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
                {pending.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Waiting for ride requests…
                  </p>
                )}
                {pending.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-secondary p-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {t.vehicle === "car" ? "🚗" : "🏍️"} {t.distance_km?.toFixed(2)} km · NPR {t.fare_estimate}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {t.pickup_label ?? t.id.slice(0, 8)}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleReject(t)}>
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => handleAccept(t)}>
                        Accept
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
