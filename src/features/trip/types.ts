export type TripStatus =
  | "requesting"
  | "accepted"
  | "driver_enroute"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected";

export const TERMINAL: TripStatus[] = ["completed", "cancelled", "rejected"];

export function isTerminal(s: TripStatus): boolean {
  return TERMINAL.includes(s);
}

export type Trip = {
  id: string;
  status: TripStatus;
  rider_id: string;
  driver_id: string | null;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  driver_lat: number | null;
  driver_lng: number | null;
  pickup_label: string | null;
  dropoff_label: string | null;
  fare_estimate: number | null;
  distance_km: number | null;
  vehicle: "car" | "bike";
  rating: number | null;
  complaint: string | null;
  created_at: string;
  updated_at: string;
};
