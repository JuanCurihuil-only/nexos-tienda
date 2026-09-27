import { createFileRoute, redirect } from "@tanstack/react-router";

// URL vieja de Tiendanube: /productos/ → catálogo completo
export const Route = createFileRoute("/productos/")({
  beforeLoad: () => {
    throw redirect({ to: "/catalogo", statusCode: 301 });
  },
});
