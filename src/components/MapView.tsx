import { memo, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { KATHMANDU, type LatLng } from "@/lib/geo";

// Fix default-marker icon paths (Leaflet ships with broken bundler-relative URLs).
const icon = (color: string) =>
  L.divIcon({
    className: "namlo-pin",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};box-shadow:0 0 0 4px rgba(255,255,255,0.15),0 2px 8px rgba(0,0,0,.5);border:2px solid white"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const ICONS = {
  pickup: icon("#22c55e"),
  dropoff: icon("#ef4444"),
  driver: icon("#3b82f6"),
};

export type MapMarkers = {
  pickup?: LatLng | null;
  dropoff?: LatLng | null;
  driver?: LatLng | null;
};

type Props = {
  markers: MapMarkers;
  onMapClick?: (p: LatLng) => void;
  /** Draws a polyline between pickup and dropoff (fallback only). */
  showRoute?: boolean;
  /** Real road path pickup -> dropoff (Google Routes API). */
  routePath?: LatLng[] | null;
  /** Real road path driver -> pickup (shown while driver is enroute). */
  driverPath?: LatLng[] | null;
};

/**
 * Map is mounted ONCE. Marker movement is applied imperatively
 * (`setLatLng`) so the 1Hz driver-position stream never triggers
 * React re-renders or full marker re-creation.
 */
function MapViewImpl({
  markers,
  onMapClick,
  showRoute = false,
  routePath,
  driverPath,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRefs = useRef<{
    pickup?: L.Marker;
    dropoff?: L.Marker;
    driver?: L.Marker;
  }>({});
  const routeRef = useRef<L.Polyline | null>(null);
  const driverRouteRef = useRef<L.Polyline | null>(null);
  const clickHandler = useRef(onMapClick);
  clickHandler.current = onMapClick;

  // Mount map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: KATHMANDU,
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);
    map.on("click", (e) => {
      clickHandler.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRefs.current = {};
      routeRef.current = null;
      driverRouteRef.current = null;
    };
  }, []);

  // Sync markers imperatively.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sync = (
      key: "pickup" | "dropoff" | "driver",
      point: LatLng | null | undefined,
    ) => {
      const existing = markerRefs.current[key];
      if (!point) {
        if (existing) {
          existing.remove();
          markerRefs.current[key] = undefined;
        }
        return;
      }
      if (existing) {
        existing.setLatLng([point.lat, point.lng]);
      } else {
        const m = L.marker([point.lat, point.lng], { icon: ICONS[key] }).addTo(map);
        markerRefs.current[key] = m;
      }
    };
    sync("pickup", markers.pickup);
    sync("dropoff", markers.dropoff);
    sync("driver", markers.driver);

    // Route line: prefer real road path, fall back to straight dashed line.
    const hasRealPath = routePath && routePath.length > 1;
    if (hasRealPath) {
      const latlngs: [number, number][] = routePath!.map((p) => [p.lat, p.lng]);
      if (routeRef.current) {
        routeRef.current.setLatLngs(latlngs);
        routeRef.current.setStyle({
          color: "#3b82f6",
          weight: 5,
          opacity: 0.9,
          dashArray: undefined,
        });
      } else {
        routeRef.current = L.polyline(latlngs, {
          color: "#3b82f6",
          weight: 5,
          opacity: 0.9,
        }).addTo(map);
      }
    } else if (showRoute && markers.pickup && markers.dropoff) {
      const latlngs: [number, number][] = [
        [markers.pickup.lat, markers.pickup.lng],
        [markers.dropoff.lat, markers.dropoff.lng],
      ];
      if (routeRef.current) {
        routeRef.current.setLatLngs(latlngs);
        routeRef.current.setStyle({ dashArray: "8 8", opacity: 0.6, weight: 4 });
      } else {
        routeRef.current = L.polyline(latlngs, {
          color: "#3b82f6",
          weight: 4,
          opacity: 0.6,
          dashArray: "8 8",
        }).addTo(map);
      }
    } else if (routeRef.current) {
      routeRef.current.remove();
      routeRef.current = null;
    }

    // Driver -> pickup line (amber dashed) while driver is approaching.
    const hasDriverPath = driverPath && driverPath.length > 1;
    if (hasDriverPath) {
      const latlngs: [number, number][] = driverPath!.map((p) => [p.lat, p.lng]);
      if (driverRouteRef.current) {
        driverRouteRef.current.setLatLngs(latlngs);
      } else {
        driverRouteRef.current = L.polyline(latlngs, {
          color: "#f59e0b",
          weight: 4,
          opacity: 0.9,
          dashArray: "10 6",
        }).addTo(map);
      }
    } else if (driverRouteRef.current) {
      driverRouteRef.current.remove();
      driverRouteRef.current = null;
    }
  }, [markers.pickup, markers.dropoff, markers.driver, showRoute, routePath, driverPath]);

  return <div ref={containerRef} className="h-full w-full" data-testid="map" />;
}

export const MapView = memo(MapViewImpl);
