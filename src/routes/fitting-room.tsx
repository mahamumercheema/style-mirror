import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/fitting-room")({
  beforeLoad: () => {
    throw redirect({ to: "/studio" });
  },
});
