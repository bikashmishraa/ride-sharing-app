import { createFileRoute } from "@tanstack/react-router";
import { RiderPanel } from "@/components/RiderPanel";

export const Route = createFileRoute("/app/rider")({
  head: () => ({
    meta: [{ title: "Rider · Namlo Rides" }],
  }),
  component: () => <RiderPanel />,
});
