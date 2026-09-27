/* ------------------------------------------------------------------ */
/*  Configuración comercial                                            */
/* ------------------------------------------------------------------ */

export const SITE_URL = "https://nexoscba.com";
export const SITE_NAME = "Nexos";
export const WHATSAPP_NUMBER = "5493517644695";
export const WHATSAPP_DISPLAY = "351 764-4695";
export const INSTAGRAM_URL = "https://instagram.com/nexoscba";
export const TIKTOK_URL = "https://www.tiktok.com/@nexoscba";
export const SOCIAL_LINKS = [
  { name: "Instagram", url: INSTAGRAM_URL },
  { name: "TikTok", url: TIKTOK_URL },
  { name: "Facebook", url: "https://www.facebook.com/Nexoscba" },
];

/** Descuento por pagar con transferencia o efectivo (igual que en Tiendanube). */
export const TRANSFER_DISCOUNT = 0.28;
/** Cuotas sin interés con tarjeta (el costo lo absorbe Nexos). */
export const INSTALLMENTS = 6;
export const WARRANTY_MONTHS = 6;

/** Textos de fábrica del banner (se pueden cambiar desde el panel). */
export const DEFAULT_HERO_TITLE =
  "Herramientas a batería y tecnología, con 28% OFF pagando con transferencia";
export const DEFAULT_HERO_SUBTITLE =
  "Kits Total e Ingco, auriculares, smartwatch, gaming y más. Envíos a todo el país.";

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */

export type ProductImage = { src: string; w: number; h: number };
export type Variant = { id: number; name: string; stock: number; available: boolean };

export type Product = {
  slug: string;
  name: string;
  brand: string | null;
  category: string;
  /** Precio de lista = precio con tarjeta. null = sin precio publicado. */
  priceCard: number | null;
  /** Precio con transferencia o efectivo (28% off). */
  priceTransfer: number | null;
  stock: number;
  available: boolean;
  images: ProductImage[];
  variants: Variant[];
  short: string;
};

export type Category = {
  slug: string;
  name: string;
  parent?: string | undefined;
  /** <title> SEO (máx. ~60 caracteres) */
  seoTitle: string;
  /** meta description (máx. ~155 caracteres) */
  seoDescription: string;
  /** Texto introductorio visible en la página de la categoría */
  intro: string;
};

/** Producto tal como se guarda: sin el precio de transferencia (se calcula solo). */
export type RawProduct = Omit<Product, "priceTransfer">;

export type HeroSettings = {
  title?: string | undefined;
  subtitle?: string | undefined;
  /** Imagen propia subida desde el panel (si no hay, se usa la de fábrica). */
  image?: { lg: string; sm: string } | undefined;
};

export type StoreSettings = { hero?: HeroSettings | undefined };

export type CatalogData = {
  products: RawProduct[];
  categories: Category[];
  settings: StoreSettings;
};

/* ------------------------------------------------------------------ */
/*  Catálogo vivo                                                      */
/*  Los datos se administran desde el panel (/admin) y se cargan al    */
/*  entrar a la tienda. Estas variables se actualizan con setCatalog.  */
/* ------------------------------------------------------------------ */

export let products: Product[] = [];
export let categories: Category[] = [];
export let topCategories: Category[] = [];
export let brands: string[] = [];
export let settings: StoreSettings = {};
export let catalogLoaded = false;

export function transferPrice(priceCard: number | null) {
  return priceCard == null ? null : Math.round(priceCard * (1 - TRANSFER_DISCOUNT));
}

export function setCatalog(data: CatalogData) {
  products = data.products.map((p) => ({ ...p, priceTransfer: transferPrice(p.priceCard) }));
  categories = data.categories;
  topCategories = categories.filter((c) => !c.parent);
  brands = Array.from(
    new Set(products.map((p) => p.brand).filter((b): b is string => Boolean(b))),
  ).sort((a, b) => a.localeCompare(b));
  settings = data.settings ?? {};
  catalogLoaded = true;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function subcategories(parentSlug: string) {
  return categories.filter((c) => c.parent === parentSlug);
}

/** Productos de una categoría. Si es categoría madre, incluye sus subcategorías. */
export function productsByCategory(slug: string) {
  const subs = subcategories(slug).map((c) => c.slug);
  const set = new Set([slug, ...subs]);
  return products.filter((p) => set.has(p.category));
}

export function categoryTrail(slug: string): Category[] {
  const c = getCategory(slug);
  if (!c) return [];
  const parent = c.parent ? getCategory(c.parent) : undefined;
  return parent ? [parent, c] : [c];
}

/** Marca con la que se muestra cada rama: Electrónica = NEX-GO, el resto = Nexos. */
export type StoreBrand = "nexos" | "nexgo";

export function categoryBrand(categorySlug: string): StoreBrand {
  const c = getCategory(categorySlug);
  const root = c?.parent ?? c?.slug;
  return root === "electronica" ? "nexgo" : "nexos";
}

/** Imagen que se ve al compartir el link (1200x630). */
export function shareImage(brand: StoreBrand) {
  return absoluteUrl(brand === "nexgo" ? "/og-electronica.jpg" : "/og-herramientas.jpg");
}

/** Marca que corresponde a una URL (para el encabezado). */
export function brandForPath(pathname: string): StoreBrand {
  const cat = pathname.match(/^\/categoria\/([^/]+)/);
  if (cat) return categoryBrand(cat[1]!);
  const prod = pathname.match(/^\/productos\/([^/]+)/);
  if (prod) {
    const p = products.find((x) => x.slug === prod[1]);
    if (p) return categoryBrand(p.category);
  }
  return "nexos";
}

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

const ars = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function formatPrice(n: number) {
  return ars.format(Math.round(n));
}

/** Valor de cada cuota: precio de tarjeta dividido la cantidad de cuotas. */
export function installmentValue(priceCard: number) {
  return Math.round(priceCard / INSTALLMENTS);
}

export function discountPercent() {
  return Math.round(TRANSFER_DISCOUNT * 100);
}

export function isPurchasable(p: Product) {
  return p.available && p.priceCard != null && p.priceTransfer != null;
}

export function whatsappLink(text?: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path}`;
}
