import { Link } from "@tanstack/react-router";
import { absoluteUrl } from "@/lib/products";

export type Crumb = { name: string; path?: string | undefined };

/** Migas de pan visibles + datos estructurados BreadcrumbList para Google. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ name: "Inicio", path: "/" }, ...items];
  return (
    <nav aria-label="Migas de pan" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {all.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {c.path && i < all.length - 1 ? (
              <Link to={c.path} className="hover:text-primary hover:underline">
                {c.name}
              </Link>
            ) : (
              <span aria-current="page" className="line-clamp-1 text-foreground">
                {c.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function breadcrumbJsonLd(items: Crumb[]) {
  const all: Crumb[] = [{ name: "Inicio", path: "/" }, ...items];
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: all.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        ...(c.path ? { item: absoluteUrl(c.path) } : {}),
      })),
    }),
  };
}
