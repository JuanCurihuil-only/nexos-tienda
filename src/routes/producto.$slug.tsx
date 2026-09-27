import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Dirección vieja de la versión de prueba.
 * Las fichas ahora viven en /productos/:slug (misma URL que en Tiendanube,
 * así Google no pierde el posicionamiento).
 */
export const Route = createFileRoute("/producto/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/productos/$slug", params: { slug: params.slug }, statusCode: 301 });
  },
});
