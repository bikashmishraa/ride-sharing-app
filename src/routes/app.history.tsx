import { createFileRoute } from "@tanstack/react-router";
import { HistoryList } from "@/components/HistoryList";

export const Route = createFileRoute("/app/history")({
  head: () => ({
    meta: [{ title: "History · Namlo Rides" }],
  }),
  component: () => (
    <div className="h-full overflow-auto">
      <HistoryList />
    </div>
  ),
});
