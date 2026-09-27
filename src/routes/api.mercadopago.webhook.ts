import { createFileRoute } from "@tanstack/react-router";

/**
 * Notificaciones (webhooks) de Mercado Pago.
 * URL a configurar en Mercado Pago Developers → Tus integraciones → Webhooks:
 *   https://TU-DOMINIO/api/mercadopago/webhook   (evento: Pagos)
 */
export const Route = createFileRoute("/api/mercadopago/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { syncPayment, verifyWebhookSignature } = await import("@/server/mercadopago");
        const url = new URL(request.url);
        let body: { type?: string; action?: string; data?: { id?: string | number } } = {};
        try {
          body = await request.json();
        } catch {
          /* algunas notificaciones llegan solo por query string */
        }
        const type = body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
        const id = String(
          body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "",
        );

        if (type !== "payment" || !id) return new Response("ignorado", { status: 200 });

        if (!(await verifyWebhookSignature(request, id))) {
          console.warn("[mercadopago] firma inválida en webhook", id);
          return new Response("firma inválida", { status: 401 });
        }

        try {
          await syncPayment(id);
        } catch (e) {
          console.error("[mercadopago] error procesando webhook", e);
          // 500 => Mercado Pago reintenta más tarde
          return new Response("error", { status: 500 });
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
