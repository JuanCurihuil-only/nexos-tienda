import type { RawProduct } from "@/lib/products";
import { claimOrderStock, releaseOrderStock } from "./db";
import type { Order, OrderItem, OrderStatus } from "./orders";
import { readCatalog, writeCatalog } from "./store";

const saleConfirmed = (status: OrderStatus) => status === "pagado" || status === "enviado";

function applyLine(product: RawProduct, item: OrderItem, sign: 1 | -1) {
  const delta = sign * item.qty;
  if (product.variants.length > 0) {
    const variant = item.variant
      ? product.variants.find((entry) => entry.name === item.variant)
      : undefined;
    if (!variant) {
      console.warn(`[stock] variante no encontrada: ${product.slug} / ${item.variant ?? ""}`);
      return;
    }
    variant.stock = Math.max(0, variant.stock + delta);
    if (variant.stock === 0) variant.available = false;
    else if (sign > 0) variant.available = true;
    product.stock = product.variants.reduce(
      (sum, entry) => sum + (entry.available ? entry.stock : 0),
      0,
    );
  } else {
    product.stock = Math.max(0, product.stock + delta);
  }
  if (product.stock === 0) product.available = false;
  else if (sign > 0) product.available = true;
}

async function adjustProductStock(items: OrderItem[], sign: 1 | -1) {
  const catalog = await readCatalog();
  const products = catalog.products.map((product) => ({
    ...product,
    variants: product.variants.map((variant) => ({ ...variant })),
  }));
  let changed = false;
  for (const item of items) {
    const product = products.find((entry) => entry.slug === item.slug);
    if (!product) {
      console.warn(`[stock] producto no encontrado: ${item.slug}`);
      continue;
    }
    applyLine(product, item, sign);
    changed = true;
  }
  if (changed) await writeCatalog({ ...catalog, products });
}

/** Deducts stock when a sale is confirmed, and puts it back if that sale is cancelled. */
export async function syncOrderStock(
  order: Order,
  next: OrderStatus,
): Promise<"deducted" | "restored" | "none"> {
  const nextHolds = saleConfirmed(next);
  if (nextHolds && !order.stockApplied) {
    const claimed = await claimOrderStock(order.id);
    if (!claimed) {
      order.stockApplied = true;
      return "none";
    }
    try {
      await adjustProductStock(order.items, -1);
    } catch (error) {
      await releaseOrderStock(order.id);
      throw error;
    }
    order.stockApplied = true;
    return "deducted";
  }
  if (!nextHolds && order.stockApplied) {
    const released = await releaseOrderStock(order.id);
    if (!released) {
      order.stockApplied = false;
      return "none";
    }
    try {
      await adjustProductStock(order.items, 1);
    } catch (error) {
      await claimOrderStock(order.id);
      throw error;
    }
    order.stockApplied = false;
    return "restored";
  }
  return "none";
}
