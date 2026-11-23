import { createFileRoute } from "@tanstack/react-router";

/**
 * API de solo lectura para n8n / integraciones.
 * GET /api/productos
 * GET /api/productos?available=1
 * GET /api/productos?category=electronica
 *
 * Auth opcional: variable API_PRODUCTOS_KEY + header X-API-Key / Bearer / ?key=
 */
export const Route = createFileRoute("/api/productos")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { assertProductosApiKey, apiOrigin, mapProduct, mapCategory } = await import(
          "@/server/api-productos"
        );
        const denied = assertProductosApiKey(request);
        if (denied) return denied;

        const url = new URL(request.url);
        const onlyAvailable = ["1", "true", "yes"].includes(
          (url.searchParams.get("available") ?? "").toLowerCase(),
        );
        const category = url.searchParams.get("category")?.trim() || "";

        const store = await import("@/server/store");
        const catalog = await store.readCatalog();
        const origin = apiOrigin(request);

        let products = catalog.products.map((product) => mapProduct(origin, product));
        if (onlyAvailable) products = products.filter((product) => product.available);
        if (category) products = products.filter((product) => product.category === category);

        return Response.json(
          {
            updatedAt: new Date().toISOString(),
            count: products.length,
            categories: catalog.categories.map(mapCategory),
            products,
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
