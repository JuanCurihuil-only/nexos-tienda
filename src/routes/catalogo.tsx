import { createFileRoute, Link } from "@tanstack/react-router";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/site/Breadcrumbs";
import { CatalogView } from "@/components/site/CatalogView";
import { absoluteUrl, products, topCategories } from "@/lib/products";

const TITLE = "Todos los productos | Nexos Córdoba";
const DESCRIPTION =
  "Catálogo completo de Nexos: kits y herramientas a batería Total e Ingco, auriculares, smartwatch, gaming y electrónica. 28% OFF con transferencia.";

export const Route = createFileRoute("/catalogo")({
  validateSearch: (search: Record<string, unknown>): { q?: string | undefined } => ({
    q: typeof search["q"] === "string" && search["q"] ? search["q"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: absoluteUrl("/catalogo") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/catalogo") }],
    scripts: [breadcrumbJsonLd([{ name: "Todos los productos" }])],
  }),
  component: Catalogo,
});

function Catalogo() {
  const { q } = Route.useSearch();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Breadcrumbs items={[{ name: "Todos los productos" }]} />
      <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">
        {q ? `Resultados para “${q}”` : "Todos los productos"}
      </h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {topCategories.map((c) => (
          <Link
            key={c.slug}
            to="/categoria/$slug"
            params={{ slug: c.slug }}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
          >
            {c.name}
          </Link>
        ))}
      </div>
      <div className="mt-6">
        <CatalogView key={q ?? ""} list={products} initialQuery={q ?? ""} />
      </div>
    </div>
  );
}
