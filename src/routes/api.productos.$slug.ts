import { createFileRoute } from "@tanstack/react-router";

/**
 * Detalle de un producto (solo lectura).
 * GET /api/productos/:slug
 */
export const Route = createFileRoute("/api/productos/$slug")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { assertProductosApiKey, apiOrigin, mapProduct } = await import(
          "@/server/api-productos"
        );
        const denied = assertProductosApiKey(request);
        if (denied) return denied;

        const slug = params.slug?.trim();
        if (!slug) return Response.json({ error: "Falta slug" }, { status: 400 });

        const store = await import("@/server/store");
        const [catalog, descriptions] = await Promise.all([
          store.readCatalog(),
          store.readDescriptions(),
        ]);
        const product = catalog.products.find((entry) => entry.slug === slug);
        if (!product) return Response.json({ error: "Producto no encontrado" }, { status: 404 });

        const origin = apiOrigin(request);
        return Response.json(
          {
            updatedAt: new Date().toISOString(),
            product: mapProduct(origin, product, {
              description: descriptions[slug] ?? [],
              transferDiscount: catalog.settings.transferDiscount ?? null,
            }),
          },
          {
            headers: {
              "cache-control": "public, max-age=60, s-maxage=60",
              "access-control-allow-origin": "*",
            },
          },
        );
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET, OPTIONS",
            "access-control-allow-headers": "Content-Type, Authorization, X-API-Key",
          },
        }),
    },
  },
});
