/**
 * Integración con Mercado Pago Checkout Pro (API REST oficial).
 * Docs: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/overview
 */
import { INSTALLMENTS } from "@/lib/products";
import { env, publicUrl, requireEnv } from "./env";
import { getOrder, setStatus, saveOrder, type Order } from "./orders";

// MP_API_URL solo se cambia para pruebas automáticas con un servidor simulado.
const API = () => env("MP_API_URL") ?? "https://api.mercadopago.com";

function token() {
  return requireEnv("MP_ACCESS_TOKEN");
}

async function mp<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${body.slice(0, 500)}`);
  return JSON.parse(body) as T;
}

/** Crea la preferencia de pago y devuelve la URL a la que hay que mandar al cliente. */
export async function createPreference(order: Order, origin: string) {
  const base = publicUrl(origin);
  const isPublic = base.startsWith("https://");
  const [first, ...rest] = order.customer.nombre.split(" ");

  const pref = await mp<{ id: string; init_point: string; sandbox_init_point?: string }>(
    "/checkout/preferences",
    {
      method: "POST",
      headers: { "X-Idempotency-Key": `pref-${order.id}` },
      body: JSON.stringify({
        external_reference: order.id,
        statement_descriptor: "NEXOS",
        items: order.items.map((i) => ({
          id: i.slug,
          title: i.variant ? `${i.name} (${i.variant})` : i.name,
          quantity: i.qty,
          unit_price: i.unitPrice,
          currency_id: "ARS",
        })),
        payer: {
          name: [first, ...rest].join(" "),
          surname: order.customer.apellido,
          email: order.customer.email,
          phone: { number: order.customer.telefono },
        },
        payment_methods: {
          // Hasta 6 cuotas. Que sean SIN interés se configura en la cuenta de
          // Mercado Pago (Tu negocio → Costos → Cuotas sin interés).
          installments: INSTALLMENTS,
        },
        back_urls: {
          success: `${base}/pedido/${order.id}`,
          pending: `${base}/pedido/${order.id}`,
          failure: `${base}/pedido/${order.id}`,
        },
        // auto_return y notification_url solo funcionan con una URL pública https
        ...(isPublic
          ? {
              auto_return: "approved",
              notification_url: `${base}/api/mercadopago/webhook`,
            }
          : {}),
      }),
    },
  );

  order.mp = { ...(order.mp ?? {}), preferenceId: pref.id };
  await saveOrder(order);

  const useSandbox = token().startsWith("TEST-") && pref.sandbox_init_point;
  return useSandbox ? pref.sandbox_init_point! : pref.init_point;
}

type MpPayment = {
  id: number;
  status: string;
  status_detail: string;
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
  installments?: number;
};

/**
 * Consulta el pago directamente a Mercado Pago y actualiza el pedido.
 * Es la única fuente de verdad: nunca se confía en lo que manda el navegador.
 */
export async function syncPayment(paymentId: string | number) {
  const p = await mp<MpPayment>(`/v1/payments/${encodeURIComponent(String(paymentId))}`);
  if (!p.external_reference) return null;
  const order = await getOrder(p.external_reference);
  if (!order || order.method !== "mercadopago") return null;

  order.mp = {
    ...(order.mp ?? {}),
    paymentId: String(p.id),
    status: p.status,
    statusDetail: p.status_detail,
  };
  await saveOrder(order);

  if (p.status === "approved") {
    const okAmount = p.currency_id === "ARS" && p.transaction_amount + 0.5 >= order.total;
    if (!okAmount) {
      return setStatus(
        order,
        "pendiente_pago",
        `Monto recibido ${p.transaction_amount} distinto del total ${order.total}: revisar`,
      );
    }
    return setStatus(
      order,
      "pagado",
      `Mercado Pago #${p.id}${p.installments ? ` en ${p.installments} cuota(s)` : ""}`,
    );
  }
  if (p.status === "rejected" || p.status === "cancelled") {
    return setStatus(order, "rechazado", `Mercado Pago: ${p.status_detail}`);
  }
  return setStatus(order, "pendiente_pago", `Mercado Pago: ${p.status}`);
}

/** Busca el último pago asociado al pedido (útil si el webhook no llegó). */
export async function syncByOrder(orderId: string) {
  const r = await mp<{ results: { id: number }[] }>(
    `/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc`,
  );
  const last = r.results?.[0];
  return last ? syncPayment(last.id) : null;
}

/**
 * Valida la firma x-signature de las notificaciones (webhooks).
 * https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */
export async function verifyWebhookSignature(request: Request, dataId: string) {
  const secret = env("MP_WEBHOOK_SECRET");
  if (!secret) {
    console.warn("[mercadopago] MP_WEBHOOK_SECRET sin configurar: no se valida la firma");
    return true;
  }
  const header = request.headers.get("x-signature") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  const parts = Object.fromEntries(
    header.split(",").map((kv) => kv.trim().split("=") as [string, string]),
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === v1;
}
