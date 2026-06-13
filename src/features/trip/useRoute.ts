import { useEffect, useState } from "react";
import { computeRoute } from "@/lib/routes.functions";
import { decodePolyline } from "@/lib/polyline";
import type { LatLng } from "@/lib/geo";

export type RoutePath = {
  path: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
};

/**
 * Fetch a traffic-aware road route between two points.
 * Returns null while loading or on failure. Refetches when endpoints change.
 */
export function useRoute(
  pickup: LatLng | null | undefined,
  dropoff: LatLng | null | undefined,
): RoutePath | null {
  const [route, setRoute] = useState<RoutePath | null>(null);

  useEffect(() => {
    if (!pickup || !dropoff) {
      setRoute(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await computeRoute({
          data: {
            pickup: { lat: pickup.lat, lng: pickup.lng },
            dropoff: { lat: dropoff.lat, lng: dropoff.lng },
          },
        });
        if (cancelled) return;
        setRoute({
          path: decodePolyline(r.encodedPolyline),
          distanceMeters: r.distanceMeters,
          durationSeconds: r.durationSeconds,
        });
      } catch (e) {
        console.error("Route fetch failed", e);
        if (!cancelled) setRoute(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Re-fetch only when the endpoints actually change.
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  return route;
}
