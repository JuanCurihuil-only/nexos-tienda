/**
 * Serialización de productos para la API pública de solo lectura (n8n, integraciones).
 */
import type { Category, ProductImage, RawProduct, Variant } from "@/lib/products";
import { env, publicUrl } from "./env";

export function assertProductosApiKey(request: Request): Response | null {
  const expected = env("API_PRODUCTOS_KEY");
  if (!expected) return null;
  const header =
    request.headers.get("x-api-key")?.trim() ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    "";
  const query = new URL(request.url).searchParams.get("key")?.trim() || "";
  if (header === expected || query === expected) return null;
  return Response.json({ error: "No autorizado" }, { status: 401 });
}

function abs(origin: string, path: string) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function mapImage(origin: string, image: ProductImage) {
  return {
    url: abs(origin, image.src),
    src: image.src,
    width: image.w,
    height: image.h,
  };
}

function mapVariant(origin: string, variant: Variant) {
  return {
    id: variant.id,
    name: variant.name,
    stock: variant.stock,
    available: variant.available,
    image: variant.image ? abs(origin, variant.image) : null,
  };
}

export function mapProduct(origin: string, product: RawProduct, description?: string[]) {
  const images = (product.images ?? []).map((image) => mapImage(origin, image));
  return {
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    priceCard: product.priceCard,
    priceTransfer: product.priceTransfer ?? null,
    stock: product.stock,
    available: product.available,
    short: product.short ?? "",
    url: abs(origin, `/productos/${product.slug}`),
    image: images[0]?.url ?? null,
    images,
    variants: (product.variants ?? []).map((variant) => mapVariant(origin, variant)),
    weightKg: product.weightKg ?? null,
    heightCm: product.heightCm ?? null,
    widthCm: product.widthCm ?? null,
    lengthCm: product.lengthCm ?? null,
    ...(description ? { description } : {}),
  };
}

export function mapCategory(category: Category) {
  return {
    slug: category.slug,
    name: category.name,
    parent: category.parent ?? null,
    seoTitle: category.seoTitle,
    seoDescription: category.seoDescription,
    intro: category.intro,
  };
}

export function apiOrigin(request: Request) {
  return publicUrl(new URL(request.url).origin);
}
