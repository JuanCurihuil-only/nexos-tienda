import { getProduct, isPurchasable, packageMeasure } from "@/lib/products";
import type { ShippingParcel } from "./types";

export type QuoteLine = {
  slug: string;
  variantId?: number | undefined;
  qty: number;
};

const postalCode = /^\d{4}$/;

export function normalizePostalCode(value: string) {
  const digits = value.replace(/\D/g, "");
  return postalCode.test(digits) ? digits : null;
}

/** Builds the boxes to quote from the live catalog. Prices never come from the browser. */
export function buildShipment(lines: QuoteLine[], method: "transferencia" | "mercadopago") {
  const parcels: ShippingParcel[] = [];
  let merchandise = 0;

  for (const line of lines) {
    const product = getProduct(line.slug);
    if (!product || !isPurchasable(product)) {
      throw new Error(`Producto sin stock: ${line.slug}`);
    }
    const variant = line.variantId
      ? product.variants.find((entry) => entry.id === line.variantId)
      : undefined;
    if (line.variantId && (!variant || !variant.available)) {
      throw new Error(`Modelo sin stock: ${product.name}`);
    }
    if (product.variants.length > 0 && !variant) throw new Error(`Elegí el modelo de ${product.name}`);
    const max = variant ? variant.stock : product.stock;
    if (line.qty > max) throw new Error(`Solo hay ${max} u. de ${product.name}`);

    const unitPrice = method === "transferencia" ? product.priceTransfer : product.priceCard;
    if (unitPrice == null) throw new Error(`${product.name} no tiene precio.`);
    merchandise += unitPrice * line.qty;

    const weightKg = packageMeasure(product.weightKg);
    const heightCm = packageMeasure(product.heightCm);
    const widthCm = packageMeasure(product.widthCm);
    const lengthCm = packageMeasure(product.lengthCm);
    if (weightKg == null || heightCm == null || widthCm == null || lengthCm == null) {
      throw new Error(
        `${product.name} no tiene peso y medidas cargados. Completalos en el admin para poder cotizar el envío.`,
      );
    }

    parcels.push({
      weightKg,
      heightCm,
      widthCm,
      lengthCm,
      declaredValue: unitPrice,
      quantity: line.qty,
    });
  }

  if (parcels.length === 0) throw new Error("El carrito está vacío.");
  return { parcels, merchandise };
}
