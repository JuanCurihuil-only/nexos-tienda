import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgePercent,
  Clock,
  CreditCard,
  MapPin,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { InstagramIcon, TikTokIcon, WhatsAppIcon } from "@/components/site/BrandIcons";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/site/Breadcrumbs";
import {
  absoluteUrl,
  discountPercent,
  INSTAGRAM_URL,
  INSTALLMENTS,
  TIKTOK_URL,
  WARRANTY_MONTHS,
  WHATSAPP_DISPLAY,
  whatsappLink,
} from "@/lib/products";

const TITLE = "Contacto y showroom en Córdoba | Nexos";
const DESCRIPTION =
  "Escribinos por WhatsApp al 351 764-4695 o coordiná una visita a nuestro showroom en Córdoba Capital. Envíos a todo el país.";

export const Route = createFileRoute("/contacto")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: absoluteUrl("/contacto") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/contacto") }],
    scripts: [
      breadcrumbJsonLd([{ name: "Contacto" }]),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: TITLE,
          url: absoluteUrl("/contacto"),
        }),
      },
    ],
  }),
  component: Contacto,
});

const WA_MSG = "Hola Nexos! Quiero hacer una consulta.";

function Contacto() {
  return (
    <div>
      {/* Franja superior */}
      <section className="surface-ink relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-28 pt-8 sm:pb-32">
          <div className="[&_a]:text-white/80 [&_nav]:text-white/80 [&_span]:text-white">
            <Breadcrumbs items={[{ name: "Contacto" }]} />
          </div>
          <p className="eyebrow mt-8 text-accent">Contacto</p>
          <h1 className="mt-2 max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
            Hablemos. Te ayudamos a elegir.
          </h1>
          <p className="mt-4 max-w-xl text-base opacity-90 sm:text-lg">
            Te asesoramos antes y después de la compra. La forma más rápida de hablar con nosotros
            es por WhatsApp.
          </p>
          <a
            href={whatsappLink(WA_MSG)}
            target="_blank"
            rel="noreferrer"
            className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#1a7f45] px-6 text-base font-bold text-white shadow-lg hover:bg-[#156b3a]"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Escribinos al {WHATSAPP_DISPLAY}
          </a>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {/* Tarjetas de contacto */}
        <section
          aria-label="Formas de contacto"
          className="relative -mt-20 grid gap-5 md:grid-cols-3"
        >
          <article className="card-elevated flex flex-col rounded-2xl border border-border p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a7f45]/10 text-[#1a7f45]">
              <WhatsAppIcon className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-lg font-bold">WhatsApp</h2>
            <p className="mt-1 text-muted-foreground">
              Consultas, stock, precios y seguimiento de pedidos.
            </p>
            <p className="mt-3 font-display text-xl font-extrabold">{WHATSAPP_DISPLAY}</p>
            <a
              href={whatsappLink(WA_MSG)}
              target="_blank"
              rel="noreferrer"
              className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-primary hover:underline"
            >
              Abrir chat <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </article>

          <article className="card-elevated flex flex-col rounded-2xl border border-border p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-bold">Showroom</h2>
            <p className="mt-1 text-muted-foreground">
              Córdoba Capital, a 4 cuadras de La Mujer Urbana.
            </p>
            <p className="mt-3 text-sm font-medium">Visitas coordinadas con el cliente.</p>
            <a
              href={whatsappLink("Hola Nexos! Quiero coordinar una visita al showroom.")}
              target="_blank"
              rel="noreferrer"
              className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-primary hover:underline"
            >
              Coordinar visita <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </article>

          <article className="card-elevated flex flex-col rounded-2xl border border-border p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink/10 text-ink">
              <Clock className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-bold">Horarios de atención</h2>
            <p className="mt-1 text-muted-foreground">
              Coordinamos el horario con cada cliente para brindarle la mejor atención.
            </p>
            <a
              href={whatsappLink("Hola Nexos! Quiero coordinar un horario de atención.")}
              target="_blank"
              rel="noreferrer"
              className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-primary hover:underline"
            >
              Coordinar horario <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </article>
        </section>

        {/* Redes */}
        <section className="mt-14" aria-labelledby="t-redes">
          <h2 id="t-redes" className="text-2xl font-extrabold">
            Seguinos en redes
          </h2>
          <p className="mt-1 text-muted-foreground">Novedades, ingresos de stock y promociones.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-4 rounded-2xl bg-gradient-to-br from-[#833ab4] via-[#c13584] to-[#e1306c] p-5 text-white shadow-lg transition-transform hover:-translate-y-0.5"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                <InstagramIcon className="h-7 w-7" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium opacity-90">Instagram</span>
                <span className="block text-xl font-extrabold">@nexoscba</span>
              </span>
              <ArrowRight
                className="h-5 w-5 transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            </a>
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-4 rounded-2xl bg-[#111] p-5 text-white shadow-lg transition-transform hover:-translate-y-0.5"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                <TikTokIcon className="h-7 w-7" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium opacity-90">TikTok</span>
                <span className="block text-xl font-extrabold">@nexoscba</span>
              </span>
              <ArrowRight
                className="h-5 w-5 transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            </a>
          </div>
        </section>

        {/* Antes de escribir */}
        <section
          className="mt-14 rounded-3xl border border-border bg-card p-6 sm:p-8"
          aria-labelledby="t-info"
        >
          <h2 id="t-info" className="text-xl font-extrabold">
            Lo que más nos consultan
          </h2>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <li className="flex gap-3">
              <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
              <div>
                <p className="font-semibold">{INSTALLMENTS} cuotas sin interés</p>
                <p className="text-sm text-muted-foreground">Con tarjeta de crédito.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <BadgePercent className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-semibold">{discountPercent()}% OFF</p>
                <p className="text-sm text-muted-foreground">
                  Pagando con transferencia o efectivo.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-semibold">Envíos a todo el país</p>
                <p className="text-sm text-muted-foreground">Despachamos desde Córdoba.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-semibold">Garantía de {WARRANTY_MONTHS} meses</p>
                <p className="text-sm text-muted-foreground">
                  <Link to="/politica-de-devolucion" className="text-primary hover:underline">
                    Ver política de cambios y devoluciones
                  </Link>
                </p>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
