import { Link } from "@tanstack/react-router";
import { isPurchasable, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { Price } from "./Price";

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { add } = useCart();
  const img = product.images[0];
  const buyable = isPurchasable(product);
  const needsVariant = product.variants.length > 0;

  return (
    <article className="card-elevated group relative flex flex-col overflow-hidden rounded-2xl border border-border">
      <div className="relative bg-white">
        {img && (
          <img
            src={img.src}
            alt={product.name}
            width={img.w}
            height={img.h}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="aspect-square w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
        {!buyable && (
          <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-foreground">
            Sin stock
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 border-t border-border p-3 sm:p-4">
        {product.brand && (
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {product.brand}
          </p>
        )}
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug">
          <Link
            to="/productos/$slug"
            params={{ slug: product.slug }}
            className="after:absolute after:inset-0 hover:text-primary"
          >
            {product.name}
          </Link>
        </h3>

        <div className="mt-auto pt-2">
          <Price product={product} />
          {buyable && !needsVariant && (
            <button
              type="button"
              onClick={() => add(product.slug)}
              className="relative z-10 mt-3 min-h-11 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <span className="sm:hidden">Agregar</span>
              <span className="hidden sm:inline">Agregar al carrito</span>
            </button>
          )}
          {buyable && needsVariant && (
            <span className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary">
              Elegir modelo
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
