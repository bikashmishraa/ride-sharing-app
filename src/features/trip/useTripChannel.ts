import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Trip } from "./types";
import { fetchTripById } from "./api";

/** Subscribe to a single trip row by id. Cleans up on unmount / id change. */
export function useTripSubscription(tripId: string | null): Trip | null {
  const [trip, setTrip] = useState<Trip | null>(null);

  useEffect(() => {
    if (!tripId) {
      setTrip(null);
      return;
    }
    let cancelled = false;
    fetchTripById(tripId).then((t) => {
      if (!cancelled) setTrip(t);
    });

    const channel = supabase
      .channel(`trip:${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips", filter: `id=eq.${tripId}` },
        (payload) => {
          if (payload.eventType === "DELETE") setTrip(null);
          else setTrip(payload.new as Trip);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  return trip;
}

/** Subscribe to all pending trip requests (for the Driver inbox). */
export function usePendingTrips(): Trip[] {
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    let cancelled = false;

    const reload = async () => {
      const { data } = await supabase
        .from("trips")
        .select("*")
        .eq("status", "requesting")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled) setTrips((data ?? []) as unknown as Trip[]);
    };

    reload();

    const channel = supabase
      .channel("trips:pending")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips" },
        () => {
          // Any change to trips might affect the pending list; just reload.
          reload();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return trips;
}
