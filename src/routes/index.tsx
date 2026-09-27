import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgePercent, CreditCard, ShieldCheck, Truck } from "lucide-react";
import type { CSSProperties } from "react";
import { WhatsAppIcon } from "@/components/site/BrandIcons";
import hero from "@/assets/hero-tools.webp";
import heroSmall from "@/assets/hero-tools-800.webp";
import { ProductCard } from "@/components/site/ProductCard";
import {
  DEFAULT_HERO_SUBTITLE,
  DEFAULT_HERO_TITLE,
  settings,
  absoluteUrl,
  discountPercent,
  getCategory,
  INSTALLMENTS,
  isPurchasable,
  productsByCategory,
  subcategories,
  WARRANTY_MONTHS,
  whatsappLink,
} from "@/lib/products";

const TITLE = "Nexos | Herramientas a batería y electrónica en Córdoba";
const DESCRIPTION =
  "Kits de herramientas a batería Total e Ingco, auriculares, smartwatch y más. 28% OFF con transferencia, 6 cuotas sin interés y envíos a todo el país.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: absoluteUrl("/") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/") }],
  }),
  component: Index,
});

/** Chispas del banner: posición, demora y desvío de cada una. */
const SPARKS = [
  { left: "58%", bottom: "12%", delay: "0s", dx: "30px" },
  { left: "64%", bottom: "20%", delay: "0.6s", dx: "-20px" },
  { left: "70%", bottom: "8%", delay: "1.2s", dx: "45px" },
  { left: "76%", bottom: "18%", delay: "1.8s", dx: "-35px" },
  { left: "82%", bottom: "10%", delay: "0.3s", dx: "25px" },
  { left: "88%", bottom: "24%", delay: "2.3s", dx: "-15px" },
  { left: "67%", bottom: "30%", delay: "2.7s", dx: "35px" },
  { left: "92%", bottom: "14%", delay: "1.5s", dx: "-40px" },
];

const benefits = [
  {
    icon: CreditCard,
    title: `${INSTALLMENTS} cuotas sin interés`,
    text: "Con tarjeta de crédito.",
  },
  {
    icon: BadgePercent,
    title: `${discountPercent()}% OFF`,
    text: "Pagando con transferencia o efectivo.",
  },
  { icon: Truck, title: "Envíos a todo el país", text: "Despachamos desde Córdoba." },
  {
    icon: ShieldCheck,
    title: `Garantía ${WARRANTY_MONTHS} meses`,
    text: "Y asesoramiento antes y después de comprar.",
  },
];

/** Destacados: productos con stock, ordenados según el orden de las subcategorías. */
function featured(slug: string, n = 8) {
  const order = subcategories(slug).map((s) => s.slug);
  return productsByCategory(slug)
    .filter(isPurchasable)
    .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category))
    .slice(0, n);
}

function CategoryHero({ slug }: { slug: string }) {
  const c = getCategory(slug)!;
  const cover = featured(slug, 1)[0]?.images[0];
  const count = productsByCategory(slug).length;
  return (
    <Link
      to="/categoria/$slug"
      params={{ slug }}
      className="card-elevated group relative flex min-h-56 items-center gap-4 overflow-hidden rounded-3xl border border-border p-6 sm:p-8"
    >
      <div className="relative z-10 max-w-[60%]">
        <p className="eyebrow text-primary">{count} productos</p>
        <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">{c.name}</h2>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{c.intro}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
          Ver todo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
      {cover && (
        <img
          src={cover.src}
          alt=""
          width={cover.w}
          height={cover.h}
          loading="lazy"
          className="absolute -right-6 bottom-0 h-full w-1/2 object-contain p-4 transition-transform duration-300 group-hover:scale-105"
        />
      )}
    </Link>
  );
}

function Shelf({ slug, title }: { slug: string; title: string }) {
  const list = featured(slug);
  if (list.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16" aria-labelledby={`t-${slug}`}>
      <div className="flex items-end justify-between gap-4">
        <h2 id={`t-${slug}`} className="text-2xl font-extrabold sm:text-3xl">
          {title}
        </h2>
        <Link
          to="/categoria/$slug"
          params={{ slug }}
          className="shrink-0 text-sm font-semibold text-primary hover:underline"
        >
          Ver todos
        </Link>
      </div>
      <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto pb-1">
        {subcategories(slug).map((s) => (
          <Link
            key={s.slug}
            to="/categoria/$slug"
            params={{ slug: s.slug }}
            className="shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
          >
            {s.name}
          </Link>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </section>
  );
}

function Index() {
  const h = settings.hero ?? {};
  const heroTitle = h.title || DEFAULT_HERO_TITLE;
  const heroSubtitle = h.subtitle || DEFAULT_HERO_SUBTITLE;
  const heroImg = h.image ?? { lg: hero, sm: heroSmall };
  return (
    <>
      <section className="surface-ink relative isolate overflow-hidden">
        {/* Capa 1: foto con el cartel luminoso de Nexos integrado en la pared del fondo
            (viene dentro de la misma imagen: no suma descargas) y movimiento lento de cámara. */}
        <img
          src={heroImg.lg}
          srcSet={`${heroImg.sm} 800w, ${heroImg.lg} 1600w`}
          sizes="100vw"
          alt=""
          width={1600}
          height={1008}
          fetchPriority="high"
          className="hero-media absolute inset-0 -z-10 h-full w-full object-cover object-[100%_center] opacity-50 sm:object-[center_top] sm:opacity-45"
        />
        {/* Capa 2: degradé para que el texto se lea siempre */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/30 via-ink/75 to-ink/90 sm:bg-gradient-to-r sm:from-ink sm:via-ink/80 sm:to-transparent"
        />
        {/* Capa 3: barrido de luz y chispas */}
        <div aria-hidden className="hero-sweep -z-10" />
        <div aria-hidden className="absolute inset-0 -z-10">
          {SPARKS.map((sp, i) => (
            <span
              key={i}
              className="hero-spark"
              style={
                {
                  left: sp.left,
                  bottom: sp.bottom,
                  animationDelay: sp.delay,
                  "--dx": sp.dx,
                } as CSSProperties
              }
            />
          ))}
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-5 px-4 py-20 lg:py-28">
          <p className="hero-rise eyebrow text-accent">Nexos · Córdoba</p>
          <h1
            className="hero-rise max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            {heroTitle}
          </h1>
          <div
            className="hero-rise flex flex-wrap items-center gap-3"
            style={{ animationDelay: "160ms" }}
          >
            <span className="hero-pulse inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-base font-extrabold uppercase tracking-wide text-white sm:text-lg">
              <CreditCard className="h-5 w-5" aria-hidden />
              {INSTALLMENTS} cuotas sin interés
            </span>
            <span className="text-sm opacity-90 sm:text-base">con tarjeta de crédito</span>
          </div>
          <p
            className="hero-rise max-w-xl text-base opacity-90 sm:text-lg"
            style={{ animationDelay: "240ms" }}
          >
            {heroSubtitle}
          </p>
          <div className="hero-rise mt-2 flex flex-wrap gap-3" style={{ animationDelay: "320ms" }}>
            <Link
              to="/categoria/$slug"
              params={{ slug: "herramientas" }}
              className="inline-flex min-h-12 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Ver herramientas
            </Link>
            <Link
              to="/categoria/$slug"
              params={{ slug: "electronica" }}
              className="inline-flex min-h-12 items-center rounded-lg bg-white px-6 text-sm font-semibold text-ink hover:bg-white/90"
            >
              Ver electrónica
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card" aria-label="Beneficios">
        <ul className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <li key={b.title} className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <b.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold">{b.title}</p>
                <p className="text-sm text-muted-foreground">{b.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 pt-14 md:grid-cols-2">
        <CategoryHero slug="herramientas" />
        <CategoryHero slug="electronica" />
      </section>

      <Shelf slug="herramientas" title="Herramientas destacadas" />
      <Shelf slug="electronica" title="Electrónica destacada" />

      <section className="mx-auto max-w-7xl px-4 pt-16">
        <div className="surface-ink flex flex-col items-start gap-5 rounded-3xl p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12">
          <div>
            <h2 className="text-2xl font-extrabold sm:text-3xl">¿No sabés cuál elegir?</h2>
            <p className="mt-2 max-w-xl opacity-90">
              Escribinos y te recomendamos la herramienta o el equipo justo para lo que necesitás.
              Showroom en Córdoba con visitas coordinadas.
            </p>
          </div>
          <a
            href={whatsappLink("Hola Nexos! Quiero hacer una consulta.")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-lg bg-[#1a7f45] px-6 text-sm font-semibold text-white hover:bg-[#156b3a]"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Hablar por WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}
