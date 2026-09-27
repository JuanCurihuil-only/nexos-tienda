import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Truck } from "lucide-react";
import { WhatsAppIcon } from "@/components/site/BrandIcons";
import { useState, type ReactNode } from "react";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/site/Breadcrumbs";
import { Price } from "@/components/site/Price";
import { ProductCard } from "@/components/site/ProductCard";
import { useCart } from "@/lib/cart";
import { getProductDescription } from "@/lib/product-detail";
import {
  absoluteUrl,
  categoryTrail,
  getProduct,
  isPurchasable,
  productsByCategory,
  WARRANTY_MONTHS,
  whatsappLink,
  type Product,
} from "@/lib/products";

export const Route = createFileRoute("/productos/$slug")({
  loader: async ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    const description = await getProductDescription({ data: params.slug });
    return { product, description };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Producto no encontrado | Nexos" }, { name: "robots", content: "noindex" }],
      };
    }
    const p = loaderData.product;
    const url = absoluteUrl(`/productos/${params.slug}`);
    const title = seoTitle(p);
    const description = seoDescription(p);
    const trail = categoryTrail(p.category);
    const crumbs = [
      ...trail.map((c) => ({ name: c.name, path: `/categoria/${c.slug}` })),
      { name: p.name },
    ];
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(p.images[0] ? [{ property: "og:image", content: absoluteUrl(p.images[0].src) }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [breadcrumbJsonLd(crumbs), productJsonLd(p, url, loaderData.description)],
    };
  },
  component: ProductoPage,
});

function seoTitle(p: Product) {
  const base = `${p.name} | Nexos`;
  return base.length <= 65 ? base : `${p.name.slice(0, 56).trimEnd()}… | Nexos`;
}

function seoDescription(p: Product) {
  const parts = [
    p.short || p.name,
    isPurchasable(p) ? "28% OFF con transferencia y 6 cuotas sin interés." : "",
    "Envíos a todo el país desde Córdoba.",
  ].filter(Boolean);
  const text = parts.join(" ");
  return text.length <= 158 ? text : `${text.slice(0, 155).trimEnd()}…`;
}

function productJsonLd(p: Product, url: string, description: string[]) {
  const offers =
    p.priceCard != null && p.priceTransfer != null
      ? {
          "@type": "Offer",
          url,
          priceCurrency: "ARS",
          price: p.priceTransfer,
          priceSpecification: [
            {
              "@type": "UnitPriceSpecification",
              name: "Transferencia o efectivo",
              price: p.priceTransfer,
              priceCurrency: "ARS",
            },
            {
              "@type": "UnitPriceSpecification",
              name: "Tarjeta (6 cuotas sin interés)",
              price: p.priceCard,
              priceCurrency: "ARS",
            },
          ],
          availability: isPurchasable(p)
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@type": "Organization", name: "Nexos" },
        }
      : undefined;
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      url,
      image: p.images.map((i) => absoluteUrl(i.src)),
      description: description.join(" ").slice(0, 5000) || p.short,
      ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
      ...(offers ? { offers } : {}),
    }),
  };
}

/* ---------- Descripción: convierte las líneas de texto en bloques legibles ---------- */

const BULLET = /^[-•*✅✔️▪️●·]+\s*/u;

function Description({ lines }: { lines: string[] }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`}>
          {list.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  lines.forEach((line, i) => {
    if (BULLET.test(line)) {
      list.push(line.replace(BULLET, ""));
      return;
    }
    flush();
    if (line.endsWith(":") && line.length < 70) blocks.push(<h3 key={i}>{line}</h3>);
    else blocks.push(<p key={i}>{line}</p>);
  });
  flush();
  return (
    <div className="description-content text-[15px] leading-relaxed text-muted-foreground">
      {blocks}
    </div>
  );
}

/* ---------- Página ---------- */

function ProductoPage() {
  const { product, description } = Route.useLoaderData();
  const { add, setOpen } = useCart();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const firstAvailable = product.variants.find((v) => v.available && v.stock > 0);
  const [variantId, setVariantId] = useState<number | undefined>(firstAvailable?.id);

  const trail = categoryTrail(product.category);
  const variant = product.variants.find((v) => v.id === variantId);
  const stock = variant ? variant.stock : product.stock;
  const buyable = isPurchasable(product) && stock > 0;
  const related = productsByCategory(product.category)
    .filter((p) => p.slug !== product.slug)
    .sort((a, b) => Number(isPurchasable(b)) - Number(isPurchasable(a)))
    .slice(0, 4);
  const img = product.images[active] ?? product.images[0];

  const consult = whatsappLink(
    `Hola Nexos! Quiero consultar por: ${product.name}${variant ? ` (${variant.name})` : ""} — ${absoluteUrl(`/productos/${product.slug}`)}`,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumbs
        items={[
          ...trail.map((c) => ({ name: c.name, path: `/categoria/${c.slug}` })),
          { name: product.name },
        ]}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        {/* Galería */}
        <div>
          <div className="overflow-hidden rounded-3xl border border-border bg-white">
            {img && (
              <img
                src={img.src}
                alt={product.name}
                width={img.w}
                height={img.h}
                fetchPriority="high"
                className="mx-auto aspect-square w-full object-contain p-6"
              />
            )}
          </div>
          {product.images.length > 1 && (
            <ul
              className="scrollbar-none mt-3 flex gap-2 overflow-x-auto"
              aria-label="Fotos del producto"
            >
              {product.images.map((im, i) => (
                <li key={im.src} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Ver foto ${i + 1} de ${product.images.length}`}
                    aria-pressed={i === active}
                    className={`h-20 w-20 overflow-hidden rounded-xl border-2 bg-white p-1 ${
                      i === active ? "border-primary" : "border-border"
                    }`}
                  >
                    <img
                      src={im.src}
                      alt=""
                      width={80}
                      height={80}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Compra */}
        <div className="lg:sticky lg:top-40 lg:self-start">
          {product.brand && <p className="eyebrow text-primary">{product.brand}</p>}
          <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">{product.name}</h1>

          <div className="mt-5 rounded-2xl border border-border bg-card p-5">
            <Price product={product} size="lg" />

            <p
              className={`mt-4 text-sm font-semibold ${buyable ? "text-success" : "text-destructive"}`}
            >
              {buyable
                ? `Stock disponible${stock > 0 ? ` (${stock} u.)` : ""}`
                : "Sin stock por el momento"}
            </p>

            {product.variants.length > 0 && (
              <fieldset className="mt-4">
                <legend className="text-sm font-semibold">Modelo</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <label
                      key={v.id}
                      className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium ${
                        !v.available || v.stock < 1
                          ? "cursor-not-allowed border-dashed text-muted-foreground line-through opacity-60"
                          : v.id === variantId
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary"
                      }`}
                    >
                      <input
                        type="radio"
                        name="variante"
                        value={v.id}
                        disabled={!v.available || v.stock < 1}
                        checked={v.id === variantId}
                        onChange={() => setVariantId(v.id)}
                        className="sr-only"
                      />
                      {v.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {buyable ? (
              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    add(product.slug, variantId);
                    setOpen(false);
                    navigate({ to: "/checkout" });
                  }}
                  className="min-h-12 rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Comprar ahora
                </button>
                <button
                  type="button"
                  onClick={() => add(product.slug, variantId)}
                  className="min-h-12 rounded-lg border-2 border-primary bg-white px-6 text-base font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Agregar al carrito
                </button>
              </div>
            ) : null}
            <a
              href={consult}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border px-6 text-sm font-semibold hover:border-primary"
            >
              <WhatsAppIcon className="h-4 w-4 text-[#1a7f45]" />
              {buyable ? "Consultar por WhatsApp" : "Avisame cuando vuelva a entrar"}
            </a>

            <ul className="mt-5 grid gap-2 border-t border-border pt-4 text-sm">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> Garantía de{" "}
                {WARRANTY_MONTHS} meses
              </li>
              <li className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" aria-hidden /> Envíos a todo el país desde
                Córdoba
              </li>
            </ul>
          </div>
        </div>
      </div>

      {description.length > 0 && (
        <section className="mt-12 max-w-3xl" aria-labelledby="t-desc">
          <h2 id="t-desc" className="text-xl font-extrabold">
            Descripción y características
          </h2>
          <Description lines={description} />
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-16" aria-labelledby="t-rel">
          <h2 id="t-rel" className="text-2xl font-extrabold">
            También te puede interesar
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-10 text-sm">
        <Link to="/catalogo" className="font-semibold text-primary hover:underline">
          ← Ver todos los productos
        </Link>
      </p>
    </div>
  );
}
