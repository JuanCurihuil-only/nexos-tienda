import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { isPurchasable, type Product } from "@/lib/products";

type Sort = "relevancia" | "menor-precio" | "mayor-precio" | "nombre";

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const inStock = (p: Product) => isPurchasable(p) && p.stock > 0;

export function CatalogView({
  list,
  initialQuery = "",
  defaultOnlyStock = false,
  defaultSort = "relevancia",
}: {
  list: Product[];
  initialQuery?: string;
  defaultOnlyStock?: boolean;
  defaultSort?: Sort;
}) {
  const [q, setQ] = useState(initialQuery);
  const [brand, setBrand] = useState("todas");
  const [onlyStock, setOnlyStock] = useState(defaultOnlyStock);
  const [sort, setSort] = useState<Sort>(defaultSort);

  const brands = useMemo(
    () =>
      Array.from(new Set(list.map((p) => p.brand).filter((b): b is string => Boolean(b)))).sort(),
    [list],
  );

  const result = useMemo(() => {
    const terms = normalize(q).split(/\s+/).filter(Boolean);
    let r = list.filter((p) => {
      if (brand !== "todas" && p.brand !== brand) return false;
      if (onlyStock && !inStock(p)) return false;
      if (terms.length) {
        const hay = normalize(`${p.name} ${p.brand ?? ""} ${p.short}`);
        return terms.every((t) => hay.includes(t));
      }
      return true;
    });
    const price = (p: Product) => p.priceTransfer ?? Number.POSITIVE_INFINITY;
    if (sort === "menor-precio") r = [...r].sort((a, b) => price(a) - price(b));
    if (sort === "mayor-precio")
      r = [...r].sort((a, b) => (b.priceTransfer ?? -1) - (a.priceTransfer ?? -1));
    if (sort === "nombre") r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    // Siempre primero lo que hay en stock
    return [...r].sort((a, b) => Number(inStock(b)) - Number(inStock(a)));
  }, [list, q, brand, onlyStock, sort]);

  return (
    <div>
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-end">
        <SlidersHorizontal
          className="hidden h-5 w-5 self-center text-muted-foreground md:block"
          aria-hidden
        />
        <div className="flex-1">
          <label htmlFor="filtro-q" className="text-xs font-semibold text-muted-foreground">
            Buscar
          </label>
          <input
            id="filtro-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre, marca o modelo"
            className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 md:flex">
          <div>
            <label htmlFor="filtro-marca" className="text-xs font-semibold text-muted-foreground">
              Marca
            </label>
            <select
              id="filtro-marca"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm md:w-44"
            >
              <option value="todas">Todas</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filtro-orden" className="text-xs font-semibold text-muted-foreground">
              Ordenar
            </label>
            <select
              id="filtro-orden"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm md:w-44"
            >
              <option value="relevancia">Relevancia</option>
              <option value="menor-precio">Menor precio</option>
              <option value="mayor-precio">Mayor precio</option>
              <option value="nombre">Nombre A-Z</option>
            </select>
          </div>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={onlyStock}
            onChange={(e) => setOnlyStock(e.target.checked)}
            className="h-5 w-5 accent-[var(--primary)]"
          />
          Solo con stock
        </label>
      </div>

      <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">
        {result.length} {result.length === 1 ? "producto" : "productos"}
      </p>

      {result.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No encontramos productos con esos filtros.
        </p>
      ) : (
        <section aria-labelledby="lista-productos">
          <h2 id="lista-productos" className="sr-only">
            Productos
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {result.map((p, i) => (
              <ProductCard key={p.slug} product={p} priority={i < 4} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
