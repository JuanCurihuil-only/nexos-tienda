import { createFileRoute } from "@tanstack/react-router";

/**
 * Respaldo JSON (catálogo, descripciones, pedidos + índice de media en Storage).
 * Las imágenes binarias no se embuten (límite de respuesta del hosting);
 * están en Firebase Storage bajo media/.
 */
export const Route = createFileRoute("/api/admin/respaldo")({
  server: {
    handlers: {
      GET: async () => {
        const { isAdmin } = await import("@/server/auth");
        if (!(await isAdmin())) return new Response("No autorizado", { status: 401 });
        const store = await import("@/server/store");
        const { listOrders } = await import("@/server/orders");
        const { fetchAllMedia } = await import("@/server/db");
        const [catalogo, descripciones, pedidos, mediaRows] = await Promise.all([
          store.readCatalog(),
          store.readDescriptions(),
          listOrders(),
          fetchAllMedia().catch(() => []),
        ]);
        const fecha = new Date().toISOString().slice(0, 10);
        const media = mediaRows.map(({ name, contentType, base64 }) => ({
          name,
          contentType,
          bytesApprox: Math.floor((base64?.length ?? 0) * 0.75),
        }));
        return new Response(
          JSON.stringify(
            {
              version: 1,
              fecha,
              catalogo,
              descripciones,
              pedidos,
              media,
              nota: "Las imágenes del panel están en Firebase Storage (media/). Las del catálogo seed viven en /img/.",
            },
            null,
            1,
          ),
          {
            headers: {
              "content-type": "application/json; charset=utf-8",
              "content-disposition": `attachment; filename="respaldo-nexos-${fecha}.json"`,
              "cache-control": "no-store",
            },
          },
        );
      },
    },
  },
});
