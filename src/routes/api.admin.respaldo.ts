import { createFileRoute } from "@tanstack/react-router";

/** Descarga un respaldo completo (productos, categorías, banner, descripciones y pedidos). */
export const Route = createFileRoute("/api/admin/respaldo")({
  server: {
    handlers: {
      GET: async () => {
        const { isAdmin } = await import("@/server/auth");
        if (!(await isAdmin())) return new Response("No autorizado", { status: 401 });
        const store = await import("@/server/store");
        const { listOrders } = await import("@/server/orders");
        const [catalogo, descripciones, pedidos] = await Promise.all([
          store.readCatalog(),
          store.readDescriptions(),
          listOrders(),
        ]);
        const fecha = new Date().toISOString().slice(0, 10);
        return new Response(JSON.stringify({ fecha, catalogo, descripciones, pedidos }, null, 1), {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "content-disposition": `attachment; filename="respaldo-nexos-${fecha}.json"`,
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
