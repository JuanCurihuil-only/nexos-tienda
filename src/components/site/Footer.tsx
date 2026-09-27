import { Link } from "@tanstack/react-router";
import { InstagramBadge, TikTokBadge, WhatsAppIcon } from "./BrandIcons";
import {
  discountPercent,
  INSTAGRAM_URL,
  INSTALLMENTS,
  subcategories,
  TIKTOK_URL,
  topCategories,
  WARRANTY_MONTHS,
  WHATSAPP_DISPLAY,
  whatsappLink,
} from "@/lib/products";

export function Footer() {
  return (
    <footer className="surface-ink mt-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <p className="font-display text-xl font-bold">Nexos</p>
          <p className="mt-3 max-w-sm text-sm opacity-85">
            Herramientas a batería Total e Ingco y electrónica en Córdoba. {discountPercent()}% OFF
            pagando con transferencia o efectivo, {INSTALLMENTS} cuotas sin interés con tarjeta y
            garantía de {WARRANTY_MONTHS} meses.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white/10 px-4 text-sm font-semibold hover:bg-white/20"
            >
              <WhatsAppIcon className="h-4 w-4" />
              WhatsApp {WHATSAPP_DISPLAY}
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram de Nexos (@nexoscba)"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg transition-transform hover:scale-110"
            >
              <InstagramBadge className="h-10 w-10" />
            </a>
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok de Nexos (@nexoscba)"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg transition-transform hover:scale-110"
            >
              <TikTokBadge className="h-10 w-10 ring-1 ring-white/25" />
            </a>
          </div>
        </div>

        {topCategories.map((c) => (
          <div key={c.slug}>
            <p className="eyebrow opacity-75">
              <Link to="/categoria/$slug" params={{ slug: c.slug }} className="hover:underline">
                {c.name}
              </Link>
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {subcategories(c.slug).map((s) => (
                <li key={s.slug}>
                  <Link
                    to="/categoria/$slug"
                    params={{ slug: s.slug }}
                    className="opacity-85 hover:underline"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <p className="eyebrow opacity-75">Ayuda</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/contacto" className="opacity-85 hover:underline">
                Contacto y showroom
              </Link>
            </li>
            <li>
              <Link to="/politica-de-devolucion" className="opacity-85 hover:underline">
                Política de cambios y devoluciones
              </Link>
            </li>
            <li>
              <Link to="/catalogo" className="opacity-85 hover:underline">
                Todos los productos
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs opacity-80">
        © {new Date().getFullYear()} Nexos · Córdoba, Argentina
      </div>
    </footer>
  );
}
