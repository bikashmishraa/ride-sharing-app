import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { RiderTripDashboard } from "@/components/RiderTripDashboard";

const searchSchema = z.object({ id: z.string() });

export const Route = createFileRoute("/app/rider/trip")({
  head: () => ({
    meta: [{ title: "Your ride · Namlo Rides" }],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useSearch();
  return <RiderTripDashboard tripId={id} />;
}
