import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapView } from "./MapView";
import { LocationSearch } from "./LocationSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  estimateFareNPR,
  haversineKm,
  VEHICLE_RATES,
  type LatLng,
  type VehicleType,
} from "@/lib/geo";
import { createTrip, fetchTripById } from "@/features/trip/api";
import { useRoute } from "@/features/trip/useRoute";
import { isInKathmandu } from "@/lib/geocode";
import {
  clearActiveRiderTripId,
  getActiveRiderTripId,
  setActiveRiderTripId,
} from "@/features/trip/activeTrip";
import { isTerminal } from "@/features/trip/types";
import { toast } from "sonner";

const RIDER_ID = "rider-demo";
const FARE_STEP = 10;

type Place = { lat: number; lng: number; label: string };

export function RiderPanel() {
  const navigate = useNavigate();
  const [pickup, setPickup] = useState<Place | null>(null);
  const [dropoff, setDropoff] = useState<Place | null>(null);
  const [pickupQuery, setPickupQuery] = useState("");
  const [dropoffQuery, setDropoffQuery] = useState("");
  const [pickingMode, setPickingMode] = useState<"pickup" | "dropoff">("pickup");
  const [fareOffer, setFareOffer] = useState<number | null>(null);
  const [vehicle, setVehicle] = useState<VehicleType>("bike");
  const [submitting, setSubmitting] = useState(false);

  // If we already have an active trip stored, jump back into it. This makes
  // tab-switching to Driver/History and back non-destructive.
  useEffect(() => {
    const id = getActiveRiderTripId();
    if (!id) return;
    let cancelled = false;
    fetchTripById(id).then((t) => {
      if (cancelled) return;
      if (!t || isTerminal(t.status)) {
        clearActiveRiderTripId();
        return;
      }
      navigate({ to: "/app/rider/trip", search: { id } });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const route = useRoute(pickup, dropoff);

  const baseDistanceKm = useMemo(() => {
    if (route) return route.distanceMeters / 1000;
    if (pickup && dropoff) return haversineKm(pickup, dropoff);
    return 0;
  }, [route, pickup, dropoff]);
  const baseFare = useMemo(
    () => estimateFareNPR(baseDistanceKm, vehicle),
    [baseDistanceKm, vehicle],
  );
  const displayFare = fareOffer ?? baseFare;

  useEffect(() => {
    setFareOffer(null);
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, vehicle]);

  const handleMapClick = (p: LatLng) => {
    if (!isInKathmandu(p)) {
      toast.error("Service available only within Kathmandu Valley");
      return;
    }
    const place: Place = { ...p, label: `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}` };
    if (pickingMode === "pickup") {
      setPickup(place);
      setPickupQuery(place.label);
      setPickingMode("dropoff");
    } else {
      setDropoff(place);
      setDropoffQuery(place.label);
    }
  };

  const handleRequest = async () => {
    if (!pickup || !dropoff || submitting) return;
    setSubmitting(true);
    try {
      const t = await createTrip({
        rider_id: RIDER_ID,
        pickup,
        dropoff,
        distance_km: baseDistanceKm,
        fare_estimate: displayFare,
        vehicle,
      });
      toast.success("Ride requested");
      setActiveRiderTripId(t.id);
      navigate({ to: "/app/rider/trip", search: { id: t.id } });
    } catch (e) {
      toast.error("Failed to request ride");
      console.error(e);
      setSubmitting(false);
    }
  };

  const clampFare = (v: number) =>
    Math.max(baseFare, Math.round(v / FARE_STEP) * FARE_STEP);
  const setFare = (v: number) => setFareOffer(clampFare(v));
  const adjustFare = (delta: number) => setFare(displayFare + delta);

  const ready = !!(pickup && dropoff);

  return (
    <div className="relative h-full w-full">
      <MapView
        markers={{ pickup, dropoff }}
        onMapClick={handleMapClick}
        showRoute={ready}
        routePath={route?.path ?? null}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] px-3 pb-3 sm:p-4 md:left-4 md:right-auto md:w-[380px]">
        <div className="pointer-events-auto mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur md:mx-0">
          {/* Drag handle */}
          <div className="flex justify-center pt-2 md:hidden">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Where to?
            </p>

            {/* Stacked locations with timeline dots */}
            <div className="mt-2 flex gap-3">
              <div className="flex flex-col items-center pt-3">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" />
                <span className="my-1 h-6 w-px bg-border" />
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-400 ring-2 ring-rose-400/30" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <LocationSearch
                  accent="pickup"
                  placeholder="Pickup location"
                  value={pickupQuery}
                  onChange={(v) => {
                    setPickupQuery(v);
                    if (!v) setPickup(null);
                  }}
                  onPick={(r) => {
                    setPickup({ lat: r.lat, lng: r.lng, label: r.label });
                    setPickupQuery(r.label);
                    setPickingMode("dropoff");
                  }}
                />
                <LocationSearch
                  accent="dropoff"
                  placeholder="Where are you going?"
                  value={dropoffQuery}
                  onChange={(v) => {
                    setDropoffQuery(v);
                    if (!v) setDropoff(null);
                  }}
                  onPick={(r) => {
                    setDropoff({ lat: r.lat, lng: r.lng, label: r.label });
                    setDropoffQuery(r.label);
                  }}
                />
              </div>
            </div>

            {/* Vehicle pills */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(Object.keys(VEHICLE_RATES) as VehicleType[]).map((v) => {
                const r = VEHICLE_RATES[v];
                const est = ready ? estimateFareNPR(baseDistanceKm, v) : null;
                const active = vehicle === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVehicle(v)}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-secondary/40 hover:bg-secondary"
                    }`}
                  >
                    <span className="text-xl">{v === "car" ? "🚗" : "🏍️"}</span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{r.label}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {est != null ? `NPR ${est}` : `NPR ${r.base}+${r.perKm}/km`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {!ready && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                Tip: tap the map to set {pickingMode === "pickup" ? "pickup" : "dropoff"}.
              </p>
            )}

            {ready && (
              <div className="mt-3 rounded-xl border border-border bg-secondary/40 p-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {route
                      ? `${(route.distanceMeters / 1000).toFixed(2)} km · ~${Math.round(route.durationSeconds / 60)} min`
                      : `~${haversineKm(pickup, dropoff).toFixed(2)} km`}
                  </span>
                  <span>Min NPR {baseFare}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 rounded-full border border-border"
                    onClick={() => adjustFare(-FARE_STEP)}
                  >
                    −
                  </Button>
                  <div className="min-w-0 flex-1 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Your offer
                    </div>
                    <Input
                      type="number"
                      step={FARE_STEP}
                      min={baseFare}
                      value={displayFare}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!Number.isNaN(val)) setFare(val);
                      }}
                      className="border-0 bg-transparent text-center text-2xl font-bold shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 rounded-full border border-border"
                    onClick={() => adjustFare(FARE_STEP)}
                  >
                    +
                  </Button>
                </div>
              </div>
            )}

            <Button
              className="mt-3 h-12 w-full text-base font-semibold"
              disabled={!ready || submitting}
              onClick={handleRequest}
            >
              {submitting
                ? "Requesting…"
                : ready
                  ? `Request ride · NPR ${displayFare}`
                  : "Set pickup & dropoff"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
