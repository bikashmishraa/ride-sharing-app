import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signIn, isAuthed } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · Namlo Rides" },
      { name: "description", content: "Sign in to the ride-sharing simulation." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");

  if (typeof window !== "undefined" && isAuthed()) {
    // Defer redirect to avoid setState-during-render.
    queueMicrotask(() => navigate({ to: "/app/rider", replace: true }));
  }

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (signIn(email, pwd)) {
      navigate({ to: "/app/rider" });
    } else {
      toast.error("Invalid credentials");
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <form
        onSubmit={handle}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <h1 className="text-2xl font-semibold tracking-tight">Namlo Rides</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ride-sharing simulation · sign in
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="intern@namlotech.com"
              autoComplete="username"
            />
          </div>
          <div>
            <Label htmlFor="pwd">Password</Label>
            <Input
              id="pwd"
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Demo credentials:
          <br />
          <code className="text-foreground">intern@namlotech.com</code> /{" "}
          <code className="text-foreground">namlo2026</code>
        </p>
      </form>
    </div>
  );
}
