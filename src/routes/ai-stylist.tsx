import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ai-stylist")({
  beforeLoad: () => {
    throw redirect({ to: "/generate" });
  },
});
