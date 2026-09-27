import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Crear pedido                                                       */
/* ------------------------------------------------------------------ */

const orderInput = z.object({
  method: z.enum(["transferencia", "mercadopago"]),
  items: z
    .array(
      z.object({
        slug: z.string().min(1).max(200),
        variantId: z.number().int().optional(),
        qty: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(50),
  customer: z.object({
    nombre: z.string().trim().min(2).max(80),
    apellido: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(120),
    telefono: z.string().trim().min(6).max(30),
    dni: z.string().trim().max(15).optional(),
    entrega: z.enum(["envio", "retiro"]),
    direccion: z.string().trim().max(160).optional(),
    ciudad: z.string().trim().max(80).optional(),
    provincia: z.string().trim().max(80).optional(),
    cp: z.string().trim().max(10).optional(),
    notas: z.string().trim().max(500).optional(),
  }),
});

export type OrderInput = z.infer<typeof orderInput>;

export const createOrder = createServerFn({ method: "POST" })
  .validator((data: unknown) => orderInput.parse(data))
  .handler(async ({ data }) => {
    const { getProduct, isPurchasable } = await import("@/lib/products");
    const { loadCatalogIntoModule } = await import("@/server/store");
    await loadCatalogIntoModule();
    const { newOrderId, saveOrder } = await import("@/server/orders");

    if (data.customer.entrega === "envio") {
      const c = data.customer;
      if (!c.direccion || !c.ciudad || !c.provincia || !c.cp) {
        throw new Error("Completá la dirección de envío.");
      }
    }

    // Los precios SIEMPRE se calculan en el servidor a partir del catálogo.
    const items = data.items.map((line) => {
      const p = getProduct(line.slug);
      if (!p || !isPurchasable(p)) throw new Error(`Producto sin stock: ${line.slug}`);
      const variant = line.variantId ? p.variants.find((v) => v.id === line.variantId) : undefined;
      if (line.variantId && (!variant || !variant.available)) {
        throw new Error(`Modelo sin stock: ${p.name}`);
      }
      if (p.variants.length > 0 && !variant) throw new Error(`Elegí el modelo de ${p.name}`);
      const max = variant ? variant.stock : p.stock;
      if (line.qty > max) throw new Error(`Solo hay ${max} u. de ${p.name}`);
      const unitPrice = data.method === "transferencia" ? p.priceTransfer! : p.priceCard!;
      return { slug: p.slug, name: p.name, variant: variant?.name, qty: line.qty, unitPrice };
    });

    const now = new Date().toISOString();
    const status = data.method === "transferencia" ? "pendiente_transferencia" : "pendiente_pago";
    const order = {
      id: newOrderId(),
      createdAt: now,
      updatedAt: now,
      status,
      method: data.method,
      items,
      total: items.reduce((a, i) => a + i.unitPrice * i.qty, 0),
      customer: data.customer,
      history: [{ at: now, status }],
    } as import("@/server/orders").Order;
    await saveOrder(order);
    console.log(`[pedidos] nuevo ${order.id} ${order.method} $${order.total}`);

    if (order.method === "mercadopago") {
      const { createPreference } = await import("@/server/mercadopago");
      const origin = new URL(getRequest().url).origin;
      const redirectUrl = await createPreference(order, origin);
      return { id: order.id, redirectUrl };
    }
    return { id: order.id, redirectUrl: null as string | null };
  });

/* ------------------------------------------------------------------ */
/*  Consultar pedido (página de confirmación)                          */
/* ------------------------------------------------------------------ */

export const fetchOrder = createServerFn({ method: "GET" })
  .validator((d: { id: string; paymentId?: string | undefined }) => d)
  .handler(async ({ data }) => {
    const { getOrder } = await import("@/server/orders");
    const { env } = await import("@/server/env");
    let order = await getOrder(data.id);
    if (!order) return null;

    // Al volver de Mercado Pago confirmamos el estado consultando a su API.
    if (order.method === "mercadopago" && order.status !== "pagado" && env("MP_ACCESS_TOKEN")) {
      try {
        const { syncPayment, syncByOrder } = await import("@/server/mercadopago");
        const synced = data.paymentId
          ? await syncPayment(data.paymentId)
          : await syncByOrder(order.id);
        if (synced && synced.id === order.id) order = synced;
      } catch (e) {
        console.error("[mercadopago] no se pudo verificar el pago", e);
      }
    }

    return {
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      method: order.method,
      items: order.items,
      total: order.total,
      nombre: order.customer.nombre,
      entrega: order.customer.entrega,
      transfer:
        order.method === "transferencia"
          ? {
              alias: env("TRANSFER_ALIAS") ?? "[COMPLETAR: alias]",
              titular: env("TRANSFER_TITULAR") ?? "[COMPLETAR: titular]",
            }
          : null,
    };
  });

export type PublicOrder = NonNullable<Awaited<ReturnType<typeof fetchOrder>>>;
