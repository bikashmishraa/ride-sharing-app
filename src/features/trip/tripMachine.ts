import type { TripStatus } from "./types";

/**
 * Pure state-machine transition table.
 * Returns null if the transition is not allowed (UI should ignore).
 */
const ALLOWED: Record<TripStatus, TripStatus[]> = {
  requesting: ["accepted", "cancelled", "rejected"],
  accepted: ["driver_enroute", "cancelled"],
  driver_enroute: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  rejected: [],
};

export function canTransition(from: TripStatus, to: TripStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function nextStatus(from: TripStatus, to: TripStatus): TripStatus | null {
  return canTransition(from, to) ? to : null;
}

export function statusLabel(s: TripStatus): string {
  switch (s) {
    case "requesting":
      return "Looking for a driver";
    case "accepted":
      return "Driver assigned";
    case "driver_enroute":
      return "Driver on the way";
    case "in_progress":
      return "Trip in progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "rejected":
      return "Rejected";
  }
}
