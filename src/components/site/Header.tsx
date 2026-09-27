import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Home, Menu, Search, ShoppingCart, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import logo from "@/assets/logo-nexos.png";
import logoNexgo from "@/assets/logo-nexgo.webp";
import { InstagramBadge, TikTokBadge } from "./BrandIcons";
import {
  brandForPath,
  discountPercent,
  INSTAGRAM_URL,
  INSTALLMENTS,
  TIKTOK_URL,
  subcategories,
  topCategories,
  WHATSAPP_DISPLAY,
  whatsappLink,
} from "@/lib/products";
import { useCart } from "@/lib/cart";

function SearchBox({ id, onDone }: { id: string; onDone?: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault();
        navigate({ to: "/catalogo", search: { q: q.trim() || undefined } });
        onDone?.();
      }}
    >
      <label htmlFor={id} className="sr-only">
        Buscar productos
      </label>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar taladros, kits, auriculares…"
        className="h-11 w-full rounded-full border border-border bg-surface pl-4 pr-12 text-sm outline-none transition focus:border-primary focus:bg-white"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
}

export function Header() {
  const { count, setOpen } = useCart();
  const [nav, setNav] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const brand = brandForPath(pathname);

  useEffect(() => setNav(false), [pathname]);

  useEffect(() => {
    if (!nav) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNav(false);
        menuBtn.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      {/* Barra de beneficios */}
      <div className="surface-ink">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs">
          <p className="flex min-w-0 items-center gap-5 overflow-hidden whitespace-nowrap font-medium">
            <span className="rounded-full bg-success px-2.5 py-0.5 font-bold text-white">
              {INSTALLMENTS} CUOTAS SIN INTERÉS
            </span>
            <span className="hidden sm:inline">{discountPercent()}% OFF con transferencia</span>
            <span aria-hidden className="hidden sm:inline">
              ·
            </span>
            <span className="hidden sm:inline">Envíos a todo el país</span>
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram de Nexos"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-transform hover:scale-110"
            >
              <InstagramBadge className="h-6 w-6" />
            </a>
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok de Nexos"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-transform hover:scale-110"
            >
              <TikTokBadge className="h-6 w-6 ring-1 ring-white/25" />
            </a>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noreferrer"
              className="ml-2 hidden font-semibold hover:underline sm:inline"
            >
              WhatsApp {WHATSAPP_DISPLAY}
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:gap-6">
        <button
          ref={menuBtn}
          type="button"
          onClick={() => setNav((v) => !v)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border lg:hidden"
          aria-label={nav ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={nav}
          aria-controls="menu-movil"
        >
          {nav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {brand === "nexgo" ? (
          <Link
            to="/categoria/$slug"
            params={{ slug: "electronica" }}
            className="shrink-0"
            aria-label="NEX-GO Electrónica"
          >
            <img
              src={logoNexgo}
              alt="NEX-GO"
              width={386}
              height={100}
              className="h-7 w-auto sm:h-8"
            />
          </Link>
        ) : (
          <Link to="/" className="shrink-0" aria-label="Nexos, ir al inicio">
            <img src={logo} alt="Nexos" width={575} height={230} className="h-9 w-auto sm:h-10" />
          </Link>
        )}

        <div className="hidden flex-1 md:block">
          <SearchBox id="buscar-desktop" />
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 md:ml-0"
          aria-label={`Abrir carrito, ${count} productos`}
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="hidden sm:inline">Carrito</span>
          {count > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] font-bold text-ink-foreground">
              {count}
            </span>
          )}
        </button>
      </div>

      <div className="px-4 pb-3 md:hidden">
        <SearchBox id="buscar-movil" />
      </div>

      {/* Navegación de escritorio */}
      <nav aria-label="Menú principal" className="hidden border-t border-border lg:block">
        <ul className="mx-auto flex max-w-7xl items-center gap-1 px-4 text-sm font-medium">
          <li>
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-primary", "aria-current": "page" }}
              className="inline-flex items-center gap-1.5 px-3 py-3 hover:text-primary"
            >
              <Home className="h-4 w-4" aria-hidden />
              Inicio
            </Link>
          </li>
          {topCategories.map((c) => (
            <li key={c.slug} className="group relative">
              <Link
                to="/categoria/$slug"
                params={{ slug: c.slug }}
                activeProps={{ className: "text-primary", "aria-current": "page" }}
                className="inline-flex items-center gap-1 px-3 py-3 hover:text-primary"
              >
                {c.name}
                <ChevronDown className="h-4 w-4" aria-hidden />
              </Link>
              <div className="invisible absolute left-0 top-full z-50 w-72 translate-y-1 rounded-xl border border-border bg-card p-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <ul>
                  {subcategories(c.slug).map((s) => (
                    <li key={s.slug}>
                      <Link
                        to="/categoria/$slug"
                        params={{ slug: s.slug }}
                        className="block rounded-lg px-3 py-2 hover:bg-surface hover:text-primary"
                      >
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
          <li>
            <Link
              to="/catalogo"
              activeProps={{ className: "text-primary", "aria-current": "page" }}
              className="inline-block px-3 py-3 hover:text-primary"
            >
              Todos los productos
            </Link>
          </li>
          <li className="ml-auto">
            <Link to="/contacto" className="inline-block px-3 py-3 hover:text-primary">
              Contacto
            </Link>
          </li>
        </ul>
      </nav>

      {/* Menú móvil */}
      {nav && (
        <nav
          id="menu-movil"
          aria-label="Menú principal"
          className="max-h-[70vh] overflow-y-auto border-t border-border bg-card px-4 py-3 lg:hidden"
        >
          <Link
            to="/"
            className="flex items-center gap-2 border-b border-border py-3 font-display text-base font-bold"
          >
            <Home className="h-5 w-5 text-primary" aria-hidden />
            Inicio
          </Link>
          {topCategories.map((c) => (
            <div key={c.slug} className="py-2">
              <Link
                to="/categoria/$slug"
                params={{ slug: c.slug }}
                className="block py-2 font-display text-base font-bold"
              >
                {c.name}
              </Link>
              <ul className="grid grid-cols-2 gap-x-3">
                {subcategories(c.slug).map((s) => (
                  <li key={s.slug}>
                    <Link
                      to="/categoria/$slug"
                      params={{ slug: s.slug }}
                      className="block py-2 text-sm text-muted-foreground"
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex gap-4 border-t border-border pt-3 text-sm font-semibold">
            <Link to="/catalogo" className="py-2">
              Todos los productos
            </Link>
            <Link to="/contacto" className="py-2">
              Contacto
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
