import { createFileRoute } from "@tanstack/react-router";
import { DriverPanel } from "@/components/DriverPanel";

export const Route = createFileRoute("/app/driver")({
  head: () => ({
    meta: [{ title: "Driver · Namlo Rides" }],
  }),
  component: () => <DriverPanel />,
});
