import { createFileRoute } from "@tanstack/react-router";
import { legacyCategoryRedirect } from "@/lib/legacy-redirects";

// URLs viejas de Tiendanube: /herramientas/...
export const Route = createFileRoute("/herramientas/$")({
  beforeLoad: ({ params }) => legacyCategoryRedirect("herramientas", params._splat),
});
