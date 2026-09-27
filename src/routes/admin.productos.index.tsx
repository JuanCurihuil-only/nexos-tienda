import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PageTitle, Select, TextInput } from "@/components/admin/ui";
import { adminProducts } from "@/lib/admin";
import { cashPrice, formatPrice } from "@/lib/products";

export const Route = createFileRoute("/admin/productos/")({
  loader: () => adminProducts(),
  component: ProductList,
});

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function ProductList() {
  const { products, categories } = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [stock, setStock] = useState("");

  const catName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;

  const list = useMemo(() => {
    const terms = norm(q).split(/\s+/).filter(Boolean);
    const inCat = (c: string) =>
      !cat || c === cat || categories.find((x) => x.slug === c)?.parent === cat;
    return products.filter((p) => {
      if (!inCat(p.category)) return false;
      if (stock === "si" && !(p.available && p.priceCard != null)) return false;
      if (stock === "no" && p.available && p.priceCard != null) return false;
      const hay = norm(`${p.name} ${p.brand ?? ""}`);
      return terms.every((t) => hay.includes(t));
    });
  }, [products, categories, q, cat, stock]);

  return (
    <div>
      <PageTitle
        title="Productos"
        subtitle={`${products.length} productos cargados`}
        actions={
          <Link
            to="/admin/productos/$slug"
            params={{ slug: "nuevo" }}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
          >
            <Plus className="h-5 w-5" /> Nuevo producto
          </Link>
        }
      />

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-[1fr_220px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" aria-hidden />
          <TextInput
            aria-label="Buscar"
            placeholder="Buscar por nombre o marca"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select aria-label="Categoría" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.parent ? "— " : ""}
              {c.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Stock" value={stock} onChange={(e) => setStock(e.target.value)}>
          <option value="">Con y sin stock</option>
          <option value="si">Solo a la venta</option>
          <option value="no">Solo sin stock</option>
        </Select>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">{list.length} resultados</p>
      <ul className="mt-2 space-y-2">
        {list.map((p) => {
          const onSale = p.available && p.priceCard != null;
          return (
            <li key={p.slug}>
              <Link
                to="/admin/productos/$slug"
                params={{ slug: p.slug }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:border-primary"
              >
                {p.images[0] ? (
                  <img
                    src={p.images[0].src}
                    alt=""
                    width={64}
                    height={64}
                    loading="lazy"
                    className="h-16 w-16 shrink-0 rounded-xl border border-border bg-white object-contain p-1"
                  />
                ) : (
                  <span className="h-16 w-16 shrink-0 rounded-xl bg-surface" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 font-semibold">{p.name}</span>
                  <span className="block text-sm text-muted-foreground">
                    {catName(p.category)}
                    {p.brand ? ` · ${p.brand}` : ""}
                  </span>
                </span>
                <span className="hidden text-right sm:block">
                  {p.priceCard != null ? (
                    <>
                      <span className="block font-bold">{formatPrice(cashPrice(p)!)}</span>
                      <span className="block text-xs text-muted-foreground">
                        cuotas {formatPrice(p.priceCard)}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin precio</span>
                  )}
                </span>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                    onSale ? "bg-emerald-100 text-emerald-900" : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {onSale ? `Stock ${p.stock}` : "Sin stock"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
