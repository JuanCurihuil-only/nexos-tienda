import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/google")({
  server: {
    handlers: {
      GET: async () => {
        const { beginGoogleLogin } = await import("@/server/google");
        return beginGoogleLogin();
      },
    },
  },
});
