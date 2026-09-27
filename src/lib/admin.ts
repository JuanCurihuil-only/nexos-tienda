/**
 * Funciones del panel de administración. Todas (menos login) exigen sesión iniciada.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  applyTransferPercent,
  cashPrice,
  DEFAULT_TRANSFER_PERCENT,
  normalizeDiscountPercent,
  transferPrice,
  type Category,
  type RawProduct,
} from "./products";

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

async function guard() {
  const { requireAdmin } = await import("@/server/auth");
  await requireAdmin();
  return import("@/server/store");
}

/* ------------------------------ Sesión ------------------------------ */

export const adminSession = createServerFn({ method: "GET" }).handler(async () => {
  const { adminConfigured, googleConfigured, isAdmin, passwordConfigured } = await import("@/server/auth");
  return {
    configured: adminConfigured(),
    google: googleConfigured(),
    password: passwordConfigured(),
    loggedIn: await isAdmin(),
  };
});

export const adminLogin = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ user: z.string().max(100), pass: z.string().max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { login } = await import("@/server/auth");
    return { ok: await login(data.user, data.pass) };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { logout } = await import("@/server/auth");
  logout();
  return { ok: true };
});

/* ------------------------------ Resumen ----------------------------- */

export const adminDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const store = await guard();
  const { listOrders } = await import("@/server/orders");
  const [cat, orders] = await Promise.all([store.readCatalog(), listOrders()]);
  return {
    products: cat.products.length,
    available: cat.products.filter((p) => p.available && p.priceCard != null && p.stock > 0)
      .length,
    categories: cat.categories.length,
    pending: orders.filter(
      (o) => o.status === "pendiente_transferencia" || o.status === "pendiente_pago",
    ).length,
    toShip: orders.filter((o) => o.status === "pagado").length,
    latest: orders.slice(0, 5).map((o) => ({
      id: o.id,
      createdAt: o.createdAt,
      status: o.status,
      total: o.total,
      nombre: `${o.customer.nombre} ${o.customer.apellido}`,
    })),
  };
});

/* ----------------------------- Productos ---------------------------- */

export const adminProducts = createServerFn({ method: "GET" }).handler(async () => {
  const store = await guard();
  const cat = await store.readCatalog();
  return {
    products: cat.products,
    categories: cat.categories,
    transferDiscount: cat.settings.transferDiscount ?? DEFAULT_TRANSFER_PERCENT,
  };
});

export const adminProduct = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const store = await guard();
    const [cat, desc] = await Promise.all([store.readCatalog(), store.readDescriptions()]);
    const product = cat.products.find((p) => p.slug === slug) ?? null;
    return { product, description: (desc[slug] ?? []).join("\n"), categories: cat.categories };
  });

const imageSchema = z.object({ src: z.string().max(300), w: z.number(), h: z.number() });

const productInput = z.object({
  originalSlug: z.string().optional(),
  name: z.string().trim().min(2).max(200),
  brand: z.string().trim().max(60).optional(),
  category: z.string().min(1),
  priceCard: z.number().int().positive().nullable(),
  priceTransfer: z.number().int().positive().nullable(),
  stock: z.number().int().min(0).max(100000),
  available: z.boolean(),
  short: z.string().trim().max(300).optional(),
  images: z.array(imageSchema).max(12),
  variants: z
    .array(
      z.object({
        id: z.number(),
        name: z.string().trim().min(1).max(60),
        stock: z.number().int().min(0),
        available: z.boolean(),
      }),
    )
    .max(40),
  description: z.string().max(20000).optional(),
});

export const adminSaveProduct = createServerFn({ method: "POST" })
  .validator((d: unknown) => productInput.parse(d))
  .handler(async ({ data }) => {
    const store = await guard();
    const [cat, desc] = await Promise.all([store.readCatalog(), store.readDescriptions()]);
    if (!cat.categories.some((c) => c.slug === data.category))
      throw new Error("Elegí una categoría válida");
    if ((data.priceCard == null) !== (data.priceTransfer == null)) {
      throw new Error("Completá el precio en efectivo y el de cuotas, o dejá los dos vacíos.");
    }
    if (
      data.priceCard != null &&
      data.priceTransfer != null &&
      data.priceTransfer > data.priceCard
    ) {
      throw new Error("El precio en efectivo no puede ser mayor que el precio en cuotas.");
    }
    applyTransferPercent(cat.settings.transferDiscount);
    const suggested = transferPrice(data.priceCard);
    const priceTransfer =
      data.priceTransfer != null && data.priceTransfer === suggested ? null : data.priceTransfer;

    let slug = data.originalSlug;
    const idx = slug ? cat.products.findIndex((p) => p.slug === slug) : -1;
    if (!slug || idx === -1) {
      // Producto nuevo: la dirección web se arma con el nombre
      const base = slugify(data.name) || "producto";
      slug = base;
      let n = 2;
      while (cat.products.some((p) => p.slug === slug)) slug = `${base}-${n++}`;
    }

    const lines = (data.description ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const firstLine =
      lines.find((l) => l.length > 25 && !l.endsWith(":"))?.replace(/^[-•*]\s*/, "") ?? "";

    const product: RawProduct = {
      slug,
      name: data.name,
      brand: data.brand ? data.brand : null,
      category: data.category,
      priceCard: data.priceCard,
      priceTransfer,
      stock: data.variants.length
        ? data.variants.reduce((a, v) => a + (v.available ? v.stock : 0), 0)
        : data.stock,
      available: data.available,
      images: data.images,
      variants: data.variants,
      short: data.short || (firstLine.length > 150 ? `${firstLine.slice(0, 147)}…` : firstLine),
    };

    const products = [...cat.products];
    if (idx === -1) products.unshift(product);
    else products[idx] = product;
    await store.writeCatalog({ ...cat, products });
    await store.writeDescriptions({ ...desc, [slug]: lines });
    return { slug };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .validator((slug: string) => z.string().min(1).parse(slug))
  .handler(async ({ data: slug }) => {
    const store = await guard();
    const [cat, desc] = await Promise.all([store.readCatalog(), store.readDescriptions()]);
    await store.writeCatalog({ ...cat, products: cat.products.filter((p) => p.slug !== slug) });
    const { [slug]: _removed, ...rest } = desc;
    await store.writeDescriptions(rest);
    return { ok: true };
  });

/** Recibe una foto ya achicada en el navegador (WebP en base64) y la guarda. */
export const adminUploadImage = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        base: z.string().max(80),
        dataUrl: z.string().startsWith("data:image/webp;base64,").max(4_000_000),
        w: z.number().int().positive().max(4000),
        h: z.number().int().positive().max(4000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const store = await guard();
    const bytes = Uint8Array.from(atob(data.dataUrl.split(",")[1]!), (c) => c.charCodeAt(0));
    const name = `${slugify(data.base) || "foto"}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.webp`;
    const src = await store.saveMedia(name, bytes);
    return { src, w: data.w, h: data.h };
  });

/* --------------------------- Precios masivos ------------------------ */

export const adminBulkPrice = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        category: z.string().optional(),
        brand: z.string().optional(),
        percent: z.number().min(-90).max(500),
        apply: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const store = await guard();
    const cat = await store.readCatalog();
    applyTransferPercent(cat.settings.transferDiscount);
    const subs = new Set(
      data.category
        ? [
            data.category,
            ...cat.categories.filter((c) => c.parent === data.category).map((c) => c.slug),
          ]
        : [],
    );
    const match = (p: RawProduct) =>
      p.priceCard != null &&
      (!data.category || subs.has(p.category)) &&
      (!data.brand || p.brand === data.brand);
    const factor = 1 + data.percent / 100;
    const rows = cat.products.filter(match).map((p) => {
      const after = Math.round(p.priceCard! * factor);
      const transferBefore = cashPrice(p)!;
      const transferAfter =
        p.priceTransfer != null ? Math.round(p.priceTransfer * factor) : transferPrice(after)!;
      return {
        slug: p.slug,
        name: p.name,
        before: p.priceCard!,
        after,
        transferBefore,
        transferAfter,
      };
    });
    if (data.apply && rows.length) {
      const map = new Map(rows.map((r) => [r.slug, r]));
      await store.writeCatalog({
        ...cat,
        products: cat.products.map((p) => {
          const next = map.get(p.slug);
          if (!next) return p;
          return {
            ...p,
            priceCard: next.after,
            ...(p.priceTransfer != null ? { priceTransfer: next.transferAfter } : {}),
          };
        }),
      });
    }
    return { rows, applied: data.apply };
  });

export const adminSetTransferDiscount = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ percent: z.number().min(0).max(90) }).parse(d))
  .handler(async ({ data }) => {
    const store = await guard();
    const cat = await store.readCatalog();
    const percent = normalizeDiscountPercent(data.percent);
    await store.writeCatalog({
      ...cat,
      settings: { ...cat.settings, transferDiscount: percent },
    });
    applyTransferPercent(percent);
    return { percent };
  });

/* ----------------------------- Categorías --------------------------- */

const categoryInput = z.object({
  originalSlug: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  parent: z.string().optional(),
  seoTitle: z.string().trim().max(90),
  seoDescription: z.string().trim().max(200),
  intro: z.string().trim().max(600),
});

export const adminCategories = createServerFn({ method: "GET" }).handler(async () => {
  const store = await guard();
  const cat = await store.readCatalog();
  const counts: Record<string, number> = {};
  for (const p of cat.products) counts[p.category] = (counts[p.category] ?? 0) + 1;
  return { categories: cat.categories, counts };
});

export const adminSaveCategory = createServerFn({ method: "POST" })
  .validator((d: unknown) => categoryInput.parse(d))
  .handler(async ({ data }) => {
    const store = await guard();
    const cat = await store.readCatalog();
    const categories = [...cat.categories];
    const idx = data.originalSlug ? categories.findIndex((c) => c.slug === data.originalSlug) : -1;
    let slug = idx >= 0 ? categories[idx]!.slug : slugify(data.name);
    if (idx === -1) {
      const base = slug || "categoria";
      let n = 2;
      while (categories.some((c) => c.slug === slug)) slug = `${base}-${n++}`;
    }
    if (data.parent && data.parent === slug)
      throw new Error("Una categoría no puede estar dentro de sí misma");
    const c: Category = {
      slug,
      name: data.name,
      ...(data.parent ? { parent: data.parent } : {}),
      seoTitle: data.seoTitle || `${data.name} | Nexos`,
      seoDescription: data.seoDescription,
      intro: data.intro,
    };
    if (idx === -1) categories.push(c);
    else categories[idx] = c;
    await store.writeCatalog({ ...cat, categories });
    return { slug };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .validator((slug: string) => z.string().min(1).parse(slug))
  .handler(async ({ data: slug }) => {
    const store = await guard();
    const cat = await store.readCatalog();
    if (cat.products.some((p) => p.category === slug))
      throw new Error("La categoría tiene productos: movelos a otra antes de borrarla");
    if (cat.categories.some((c) => c.parent === slug))
      throw new Error("La categoría tiene subcategorías");
    await store.writeCatalog({ ...cat, categories: cat.categories.filter((c) => c.slug !== slug) });
    return { ok: true };
  });

/* ------------------------------- Banner ----------------------------- */

export const adminSaveHero = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        title: z.string().trim().max(160),
        subtitle: z.string().trim().max(300),
        image: z.object({ lg: z.string().max(300), sm: z.string().max(300) }).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const store = await guard();
    const cat = await store.readCatalog();
    await store.writeCatalog({
      ...cat,
      settings: {
        ...cat.settings,
        hero: {
          ...(data.title ? { title: data.title } : {}),
          ...(data.subtitle ? { subtitle: data.subtitle } : {}),
          ...(data.image ? { image: data.image } : {}),
        },
      },
    });
    return { ok: true };
  });

/* ------------------------------ Pedidos ----------------------------- */

export const adminOrders = createServerFn({ method: "GET" }).handler(async () => {
  await guard();
  const { listOrders } = await import("@/server/orders");
  return (await listOrders()).map((o) => ({
    id: o.id,
    createdAt: o.createdAt,
    status: o.status,
    method: o.method,
    total: o.total,
    items: o.items.reduce((a, i) => a + i.qty, 0),
    nombre: `${o.customer.nombre} ${o.customer.apellido}`,
    entrega: o.customer.entrega,
  }));
});

export const adminOrder = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    await guard();
    const { getOrder } = await import("@/server/orders");
    return getOrder(id);
  });

export const adminSetOrderStatus = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        id: z.string(),
        status: z.enum([
          "pendiente_transferencia",
          "pendiente_pago",
          "pagado",
          "enviado",
          "cancelado",
        ]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await guard();
    const { getOrder, setStatus } = await import("@/server/orders");
    const order = await getOrder(data.id);
    if (!order) throw new Error("Pedido no encontrado");
    await setStatus(order, data.status, "Cambio manual desde el panel");
    return { ok: true };
  });

export const adminDeleteOrder = createServerFn({ method: "POST" })
  .validator((id: string) => z.string().min(1).parse(id))
  .handler(async ({ data: id }) => {
    await guard();
    const { removeOrder } = await import("@/server/orders");
    await removeOrder(id);
    return { ok: true };
  });
