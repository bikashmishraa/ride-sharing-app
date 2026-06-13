/**
 * Free geocoding via OpenStreetMap Nominatim.
 * Restricted strictly to the Kathmandu Valley.
 */
const ENDPOINT = "https://nominatim.openstreetmap.org/search";

// Kathmandu Valley bounding box (covers Kathmandu, Lalitpur, Bhaktapur).
// left,top,right,bottom for viewbox; also used to filter results.
const KTM_LEFT = 85.15;
const KTM_RIGHT = 85.55;
const KTM_TOP = 27.85;
const KTM_BOTTOM = 27.60;
const KTM_VIEWBOX = `${KTM_LEFT},${KTM_TOP},${KTM_RIGHT},${KTM_BOTTOM}`;

export type GeoResult = {
  label: string;
  lat: number;
  lng: number;
};

export function isInKathmandu(p: { lat: number; lng: number }): boolean {
  return (
    p.lat >= KTM_BOTTOM &&
    p.lat <= KTM_TOP &&
    p.lng >= KTM_LEFT &&
    p.lng <= KTM_RIGHT
  );
}

export async function geocode(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = new URL(ENDPOINT);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "8");
  url.searchParams.set("countrycodes", "np");
  url.searchParams.set("viewbox", KTM_VIEWBOX);
  // bounded=1 forces Nominatim to return results only within the viewbox.
  url.searchParams.set("bounded", "1");
  url.searchParams.set("addressdetails", "0");
  const res = await fetch(url.toString(), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;
  return data
    .map((d) => ({
      label: d.display_name,
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
    }))
    .filter((r) => isInKathmandu(r));
}
