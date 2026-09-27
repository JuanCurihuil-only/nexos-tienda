import { createFileRoute } from "@tanstack/react-router";
import { legacyCategoryRedirect } from "@/lib/legacy-redirects";

// URLs viejas de Tiendanube: /electronica/...
export const Route = createFileRoute("/electronica/$")({
  beforeLoad: ({ params }) => legacyCategoryRedirect("electronica", params._splat),
});
