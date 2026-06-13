import { supabase } from "@/integrations/supabase/client";
import type { Trip, TripStatus } from "./types";
import { isTerminal } from "./types";
import { postRideHistory } from "@/lib/mockApi";

export async function createTrip(input: {
  rider_id: string;
  pickup: { lat: number; lng: number; label?: string };
  dropoff: { lat: number; lng: number; label?: string };
  distance_km: number;
  fare_estimate: number;
  vehicle: "car" | "bike";
}): Promise<Trip> {
  const { data, error } = await supabase
    .from("trips")
    .insert({
      rider_id: input.rider_id,
      status: "requesting",
      pickup_lat: input.pickup.lat,
      pickup_lng: input.pickup.lng,
      pickup_label: input.pickup.label ?? null,
      dropoff_lat: input.dropoff.lat,
      dropoff_lng: input.dropoff.lng,
      dropoff_label: input.dropoff.label ?? null,
      distance_km: input.distance_km,
      fare_estimate: input.fare_estimate,
      vehicle: input.vehicle,
    } as never)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Trip;
}

export async function updateTripStatus(
  trip: Trip,
  status: TripStatus,
  extra?: Partial<Trip>,
): Promise<void> {
  const patch: Record<string, unknown> = { status, ...extra };
  const { error } = await supabase
    .from("trips")
    // biome-ignore lint/suspicious/noExplicitAny: dynamic patch
    .update(patch as any)
    .eq("id", trip.id);
  if (error) throw error;

  if (isTerminal(status)) {
    // Fire-and-forget: archive to mock REST.
    void postRideHistory({
      trip_id: trip.id,
      status: status as "completed" | "cancelled" | "rejected",
      rider_id: trip.rider_id,
      driver_id: trip.driver_id,
      pickup_label: trip.pickup_label,
      dropoff_label: trip.dropoff_label,
      distance_km: trip.distance_km,
      fare_estimate: trip.fare_estimate,
      created_at: trip.created_at,
      ended_at: new Date().toISOString(),
    }).catch((e) => console.warn("history archive failed", e));
  }
}

export async function updateDriverPosition(
  tripId: string,
  lat: number,
  lng: number,
): Promise<void> {
  const { error } = await supabase
    .from("trips")
    // biome-ignore lint/suspicious/noExplicitAny: dynamic patch
    .update({ driver_lat: lat, driver_lng: lng } as any)
    .eq("id", tripId);
  if (error) console.warn("position update failed", error);
}

export async function updateFare(tripId: string, fare: number): Promise<void> {
  const { error } = await supabase
    .from("trips")
    // biome-ignore lint/suspicious/noExplicitAny: dynamic patch
    .update({ fare_estimate: fare } as any)
    .eq("id", tripId);
  if (error) throw error;
}

export async function submitFeedback(
  tripId: string,
  rating: number,
  complaint: string,
): Promise<void> {
  const { error } = await supabase
    .from("trips")
    // biome-ignore lint/suspicious/noExplicitAny: dynamic patch
    .update({ rating, complaint: complaint || null } as any)
    .eq("id", tripId);
  if (error) throw error;
}

export async function fetchPendingTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("status", "requesting")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as unknown as Trip[];
}

export async function fetchTripById(id: string): Promise<Trip | null> {
  const { data, error } = await supabase.from("trips").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as Trip) ?? null;
}
