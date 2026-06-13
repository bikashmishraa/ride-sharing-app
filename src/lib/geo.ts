export const KATHMANDU: [number, number] = [27.7172, 85.324];

export type LatLng = { lat: number; lng: number };

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Linear interpolation between two points; t in [0,1]. */
export function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

/** A random point within ~radiusKm of center, biased uniformly. */
export function randomNear(center: LatLng, radiusKm = 3): LatLng {
  const r = (Math.random() * radiusKm) / 111;
  const theta = Math.random() * 2 * Math.PI;
  return { lat: center.lat + r * Math.cos(theta), lng: center.lng + r * Math.sin(theta) };
}

export type VehicleType = "car" | "bike";

export const VEHICLE_RATES: Record<VehicleType, { base: number; perKm: number; label: string }> = {
  car: { base: 80, perKm: 55, label: "Car" },
  bike: { base: 50, perKm: 30, label: "Bike" },
};

export function estimateFareNPR(distanceKm: number, vehicle: VehicleType = "bike"): number {
  const { base, perKm } = VEHICLE_RATES[vehicle];
  return Math.round(base + distanceKm * perKm);
}
