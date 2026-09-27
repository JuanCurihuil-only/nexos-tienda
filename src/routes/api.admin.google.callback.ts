import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { finishGoogleLogin } = await import("@/server/google");
        return finishGoogleLogin(request);
      },
    },
  },
});
