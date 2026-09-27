import { Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { Installments } from "./Price";

export function CartDrawer() {
  const { open, setOpen, items, totalTransfer, totalCard, setQty, remove } = useCart();
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="carrito-titulo"
        className="relative flex h-full w-full max-w-md flex-col bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="carrito-titulo" className="text-lg font-bold">
            Tu carrito
          </h2>
          <button
            ref={closeBtn}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar carrito"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-muted-foreground">Todavía no agregaste productos.</p>
            <Link
              to="/catalogo"
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Ver productos
            </Link>
          </div>
        ) : (
          <ul className="flex-1 space-y-4 overflow-y-auto p-5">
            {items.map(({ key, product, variant, qty, maxQty }) => (
              <li key={key} className="flex gap-3">
                {product.images[0] && (
                  <img
                    src={product.images[0].src}
                    alt=""
                    width={80}
                    height={80}
                    loading="lazy"
                    className="h-20 w-20 shrink-0 rounded-lg border border-border bg-white object-contain p-1"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">{product.name}</p>
                  {variant && (
                    <p className="text-xs text-muted-foreground">Modelo: {variant.name}</p>
                  )}
                  <p className="text-sm font-bold">
                    {formatPrice(product.priceTransfer! * qty)}{" "}
                    <span className="font-normal text-muted-foreground">con transferencia</span>
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQty(key, qty - 1)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border"
                      aria-label={`Restar una unidad de ${product.name}`}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold" aria-live="polite">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(key, Math.min(maxQty, qty + 1))}
                      disabled={qty >= maxQty}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border disabled:opacity-40"
                      aria-label={`Sumar una unidad de ${product.name}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(key)}
                      className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive"
                      aria-label={`Quitar ${product.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <div className="space-y-3 border-t border-border p-5">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Total con transferencia</span>
              <span className="font-display text-2xl font-extrabold">
                {formatPrice(totalTransfer)}
              </span>
            </div>
            <Installments priceCard={totalCard} />
            <p className="text-xs text-muted-foreground">
              Total con tarjeta: {formatPrice(totalCard)}
            </p>
            <Link
              to="/checkout"
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center justify-center rounded-lg bg-primary px-4 text-base font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Iniciar compra
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Seguir comprando
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
