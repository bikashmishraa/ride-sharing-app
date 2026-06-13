import { createServerFn } from "@tanstack/react-start";

export type RouteResult = {
  encodedPolyline: string;
  distanceMeters: number;
  durationSeconds: number;
};

/**
 * Compute the best road route between two points using the public OSRM
 * demo server (https://project-osrm.org). Fully open-source, no API key,
 * uses OpenStreetMap data. Returns a Google-compatible encoded polyline
 * (OSRM defaults to the same precision-5 polyline format Google uses),
 * so the existing decoder in src/lib/polyline.ts works unchanged.
 *
 * Note: OSRM's public demo has no live-traffic data, so routes reflect
 * static road geometry only.
 */
export const computeRoute = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      pickup: { lat: number; lng: number };
      dropoff: { lat: number; lng: number };
    }) => data,
  )
  .handler(async ({ data }): Promise<RouteResult> => {
    const { pickup, dropoff } = data;
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}` +
      `?overview=full&geometries=polyline&alternatives=false&steps=false`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`OSRM ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as {
      code?: string;
      routes?: Array<{
        geometry?: string;
        distance?: number;
        duration?: number;
      }>;
    };
    const r = json.routes?.[0];
    if (json.code !== "Ok" || !r?.geometry) {
      throw new Error(`OSRM returned no route (${json.code ?? "unknown"})`);
    }
    return {
      encodedPolyline: r.geometry,
      distanceMeters: Math.round(r.distance ?? 0),
      durationSeconds: Math.round(r.duration ?? 0),
    };
  });
