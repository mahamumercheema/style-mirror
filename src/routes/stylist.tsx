import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/stylist")({
  beforeLoad: () => {
    throw redirect({ to: "/generate" });
  },
});
