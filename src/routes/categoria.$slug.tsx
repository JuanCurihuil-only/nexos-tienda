import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/site/Breadcrumbs";
import { CatalogView } from "@/components/site/CatalogView";
import {
  absoluteUrl,
  categoryBrand,
  categoryTrail,
  getCategory,
  productsByCategory,
  shareImage,
  subcategories,
} from "@/lib/products";

export const Route = createFileRoute("/categoria/$slug")({
  loader: ({ params }) => {
    const category = getCategory(params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Categoría no encontrada | Nexos" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const c = loaderData.category;
    const url = absoluteUrl(`/categoria/${params.slug}`);
    const crumbs = categoryTrail(c.slug).map((x, i, arr) => ({
      name: x.name,
      path: i < arr.length - 1 ? `/categoria/${x.slug}` : undefined,
    }));
    const list = productsByCategory(c.slug);
    return {
      meta: [
        { title: c.seoTitle },
        { name: "description", content: c.seoDescription },
        { property: "og:title", content: c.seoTitle },
        { property: "og:description", content: c.seoDescription },
        { property: "og:url", content: url },
        // Vista previa al compartir: logo Nexos (herramientas) o NEX-GO (electrónica)
        { property: "og:image", content: shareImage(categoryBrand(c.slug)) },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        {
          property: "og:image:alt",
          content: categoryBrand(c.slug) === "nexgo" ? "NEX-GO Electrónica" : "Nexos Herramientas",
        },
        { name: "twitter:image", content: shareImage(categoryBrand(c.slug)) },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        breadcrumbJsonLd(crumbs),
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: c.name,
            description: c.seoDescription,
            url,
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: list.length,
              itemListElement: list.slice(0, 30).map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: absoluteUrl(`/productos/${p.slug}`),
                name: p.name,
              })),
            },
          }),
        },
      ],
    };
  },
  component: CategoriaPage,
});

function CategoriaPage() {
  const { category } = Route.useLoaderData();
  const list = productsByCategory(category.slug);
  const trail = categoryTrail(category.slug);
  const subs = subcategories(category.slug);
  const siblings = category.parent ? subcategories(category.parent) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Breadcrumbs
        items={trail.map((x, i) => ({
          name: x.name,
          path: i < trail.length - 1 ? `/categoria/${x.slug}` : undefined,
        }))}
      />

      <header className="mt-4 max-w-3xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{category.name}</h1>
        <p className="mt-3 text-muted-foreground">{category.intro}</p>
      </header>

      {(subs.length > 0 || siblings.length > 0) && (
        <nav
          aria-label="Subcategorías"
          className="scrollbar-none mt-6 flex gap-2 overflow-x-auto pb-1"
        >
          {(subs.length > 0 ? subs : siblings).map((s) => (
            <Link
              key={s.slug}
              to="/categoria/$slug"
              params={{ slug: s.slug }}
              activeProps={{
                className: "border-primary bg-primary text-primary-foreground",
                "aria-current": "page",
              }}
              inactiveProps={{
                className: "border-border bg-card hover:border-primary hover:text-primary",
              }}
              className="shrink-0 rounded-full border px-4 py-2 text-sm font-medium"
            >
              {s.name}
              <span className="ml-1.5 font-normal">({productsByCategory(s.slug).length})</span>
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-6">
        <CatalogView key={category.slug} list={list} />
      </div>
    </div>
  );
}
