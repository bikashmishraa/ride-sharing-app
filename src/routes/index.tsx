import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAuthed } from "@/lib/auth";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    throw redirect({ to: isAuthed() ? "/app/rider" : "/login" });
  },
  component: () => null,
});
