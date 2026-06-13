import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapView } from "./MapView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type LatLng } from "@/lib/geo";
import {
  submitFeedback,
  updateFare,
  updateTripStatus,
} from "@/features/trip/api";
import { useTripSubscription } from "@/features/trip/useTripChannel";
import { useRoute } from "@/features/trip/useRoute";
import { statusLabel } from "@/features/trip/tripMachine";
import { isTerminal } from "@/features/trip/types";
import {
  clearActiveRiderTripId,
  setActiveRiderTripId,
} from "@/features/trip/activeTrip";
import { toast } from "sonner";

const FARE_STEP = 10;

type Props = { tripId: string };

export function RiderTripDashboard({ tripId }: Props) {
  const navigate = useNavigate();
  const trip = useTripSubscription(tripId);

  const [rating, setRating] = useState(0);
  const [complaint, setComplaint] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [fareDraft, setFareDraft] = useState<number | null>(null);

  const pickup = useMemo<LatLng | null>(
    () => (trip ? { lat: trip.pickup_lat, lng: trip.pickup_lng } : null),
    [trip?.pickup_lat, trip?.pickup_lng],
  );
  const dropoff = useMemo<LatLng | null>(
    () => (trip ? { lat: trip.dropoff_lat, lng: trip.dropoff_lng } : null),
    [trip?.dropoff_lat, trip?.dropoff_lng],
  );
  const driverPos = useMemo<LatLng | null>(
    () =>
      trip?.driver_lat != null && trip.driver_lng != null
        ? { lat: trip.driver_lat, lng: trip.driver_lng }
        : null,
    [trip?.driver_lat, trip?.driver_lng],
  );

  const route = useRoute(pickup, dropoff);

  const showDriverApproach =
    !!trip &&
    (trip.status === "accepted" || trip.status === "driver_enroute") &&
    !!driverPos;
  const driverApproachRoute = useRoute(
    showDriverApproach ? driverPos : null,
    showDriverApproach && trip ? { lat: trip.pickup_lat, lng: trip.pickup_lng } : null,
  );

  const showInProgress = !!trip && trip.status === "in_progress" && !!driverPos;
  const driverToDropoffRoute = useRoute(
    showInProgress ? driverPos : null,
    showInProgress && trip ? { lat: trip.dropoff_lat, lng: trip.dropoff_lng } : null,
  );

  const baseFare = trip?.fare_estimate ?? 0;
  const displayFare = fareDraft ?? trip?.fare_estimate ?? 0;

  const goBack = () => {
    clearActiveRiderTripId();
    navigate({ to: "/app/rider" });
  };

  // Track this trip as the rider's active session so switching tabs and
  // coming back restores this view instead of resetting to the form.
  useEffect(() => {
    if (tripId) setActiveRiderTripId(tripId);
  }, [tripId]);

  // Do NOT auto-return on cancelled/rejected/completed — keep the map and
  // status visible until the rider explicitly dismisses via a button.

  const handleCancel = async () => {
    if (!trip) return;
    if (trip.status !== "requesting") {
      const ok = window.confirm("The driver has already accepted. Cancel this ride?");
      if (!ok) return;
    }
    try {
      await updateTripStatus(trip, "cancelled");
      toast("Ride cancelled");
    } catch (e) {
      console.error(e);
    }
  };

  const setFare = async (next: number) => {
    if (!trip) return;
    const clamped = Math.max(baseFare, Math.round(next / FARE_STEP) * FARE_STEP);
    setFareDraft(clamped);
    if (trip.status === "requesting") {
      try {
        await updateFare(trip.id, clamped);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSubmitFeedback = async () => {
    if (!trip) return;
    if (rating < 1) {
      toast.error("Please pick a rating");
      return;
    }
    try {
      await submitFeedback(trip.id, rating, complaint.trim().slice(0, 500));
      setFeedbackSent(true);
      toast.success("Thanks for the feedback!");
    } catch (e) {
      console.error(e);
      toast.error("Could not submit feedback");
    }
  };

  if (!trip) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading trip…
      </div>
    );
  }

  const isCompleted = trip.status === "completed";

  return (
    <div className="relative h-full w-full">
      <MapView
        markers={{ pickup, dropoff, driver: driverPos }}
        showRoute
        routePath={route?.path ?? null}
        driverPath={
          showDriverApproach
            ? driverApproachRoute?.path ?? null
            : showInProgress
              ? driverToDropoffRoute?.path ?? null
              : null
        }
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] px-3 pb-3 sm:p-4 md:left-4 md:right-auto md:w-[380px]">
        <div className="pointer-events-auto mx-auto w-full max-w-md rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur md:mx-0">
          {!isCompleted && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Trip · {trip.id.slice(0, 8)}
                </p>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {trip.vehicle === "car" ? "🚗 Car" : "🏍️ Bike"}
                </span>
              </div>
              {trip.status === "requesting" && (
                <>
                  <p className="mt-1 text-lg font-semibold">{statusLabel(trip.status)}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
                    Broadcasting your request to nearby drivers…
                  </p>
                </>
              )}

              {(trip.status === "accepted" ||
                trip.status === "driver_enroute" ||
                trip.status === "in_progress") && (
                <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                      Connected with driver
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-lg">
                      {trip.vehicle === "car" ? "🚗" : "🏍️"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        Driver {trip.driver_id?.slice(0, 8) ?? "assigned"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {trip.status === "accepted" && "Preparing to depart"}
                        {trip.status === "driver_enroute" &&
                          (driverApproachRoute
                            ? `Arriving in ~${Math.max(1, Math.round(driverApproachRoute.durationSeconds / 60))} min`
                            : "On the way to pickup")}
                        {trip.status === "in_progress" &&
                          (driverToDropoffRoute
                            ? `~${Math.max(1, Math.round(driverToDropoffRoute.durationSeconds / 60))} min to destination`
                            : "Trip in progress")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1">
                    {(
                      [
                        { key: "accepted", label: "Assigned" },
                        { key: "driver_enroute", label: "En route" },
                        { key: "in_progress", label: "In trip" },
                      ] as const
                    ).map((step, i) => {
                      const order = ["accepted", "driver_enroute", "in_progress"];
                      const reached = order.indexOf(trip.status) >= i;
                      return (
                        <div key={step.key} className="flex flex-1 items-center gap-1">
                          <div
                            className={`h-1.5 flex-1 rounded-full ${
                              reached ? "bg-emerald-400" : "bg-muted"
                            }`}
                          />
                          <span
                            className={`text-[10px] uppercase tracking-wider ${
                              reached ? "text-emerald-300" : "text-muted-foreground/60"
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {driverPos && (
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      Driver @ {driverPos.lat.toFixed(4)}, {driverPos.lng.toFixed(4)}
                    </p>
                  )}
                </div>
              )}

              {(trip.status === "cancelled" || trip.status === "rejected") && (
                <p className="mt-1 text-lg font-semibold">{statusLabel(trip.status)}</p>
              )}

              {trip.pickup_label && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  From: {trip.pickup_label}
                </p>
              )}
              {trip.dropoff_label && (
                <p className="truncate text-xs text-muted-foreground">
                  To: {trip.dropoff_label}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {trip.distance_km?.toFixed(2)} km · NPR {trip.fare_estimate}
              </p>

              {trip.status === "requesting" && (
                <div className="mt-3 rounded-lg border border-border bg-secondary/40 p-3">
                  <div className="text-center text-xs text-muted-foreground">
                    Adjust your offer (min NPR {baseFare})
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => void setFare(displayFare - FARE_STEP)}
                    >
                      −{FARE_STEP}
                    </Button>
                    <Input
                      type="number"
                      step={FARE_STEP}
                      min={baseFare}
                      value={displayFare}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!Number.isNaN(val)) void setFare(val);
                      }}
                      className="text-center font-semibold"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => void setFare(displayFare + FARE_STEP)}
                    >
                      +{FARE_STEP}
                    </Button>
                  </div>
                </div>
              )}

              {!isTerminal(trip.status) && (
                <Button
                  variant="destructive"
                  className="mt-3 w-full"
                  onClick={handleCancel}
                >
                  Cancel ride
                </Button>
              )}

              {(trip.status === "cancelled" || trip.status === "rejected") && (
                <Button variant="secondary" className="mt-3 w-full" onClick={goBack}>
                  Back to request
                </Button>
              )}
            </>
          )}

          {isCompleted && (
            <>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Ride complete · {trip.id.slice(0, 8)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {trip.distance_km?.toFixed(2)} km · NPR {trip.fare_estimate}
              </p>

              {!feedbackSent ? (
                <>
                  <p className="mt-3 text-sm font-medium">Rate your driver</p>
                  <div className="mt-1 flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        className={`text-2xl leading-none transition-colors ${
                          n <= rating ? "text-amber-400" : "text-muted-foreground/40"
                        }`}
                        aria-label={`${n} star`}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  <p className="mt-3 text-sm font-medium">Complaint (optional)</p>
                  <Textarea
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value.slice(0, 500))}
                    placeholder="Tell us what went wrong…"
                    rows={3}
                    className="mt-1"
                  />

                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" className="flex-1" onClick={goBack}>
                      Skip
                    </Button>
                    <Button className="flex-1" onClick={handleSubmitFeedback}>
                      Submit
                    </Button>
                  </div>
                </>
              ) : (
                <div className="mt-3 flex flex-col items-center gap-2">
                  <p className="text-sm text-emerald-400">Feedback received — thank you!</p>
                  <Button className="w-full" onClick={goBack}>
                    Done
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
