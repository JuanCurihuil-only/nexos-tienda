import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Image, Package, Percent, Plus, Tags } from "lucide-react";
import { Card, PageTitle, StatusBadge, formatDate } from "@/components/admin/ui";
import { adminDashboard } from "@/lib/admin";
import { formatPrice } from "@/lib/products";

export const Route = createFileRoute("/admin/")({
  loader: () => adminDashboard(),
  component: Dashboard,
});

const TILES = [
  {
    to: "/admin/productos/$slug",
    params: { slug: "nuevo" },
    label: "Cargar producto",
    icon: Plus,
    strong: true,
  },
  { to: "/admin/productos", label: "Productos", icon: Package },
  { to: "/admin/precios", label: "Cambiar precios", icon: Percent },
  { to: "/admin/categorias", label: "Categorías", icon: Tags },
  { to: "/admin/banner", label: "Banner", icon: Image },
  { to: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
] as const;

function Dashboard() {
  const d = Route.useLoaderData();
  return (
    <div>
      <PageTitle title="Hola" subtitle="¿Qué querés hacer hoy?" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {TILES.map((t) => (
          <Link
            key={t.label}
            to={t.to}
            {...("params" in t ? { params: t.params } : {})}
            className={`flex min-h-28 flex-col items-start justify-between rounded-2xl border p-5 text-lg font-bold transition-transform hover:-translate-y-0.5 ${
              "strong" in t
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card"
            }`}
          >
            <t.icon className="h-7 w-7" aria-hidden />
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          ["Productos", d.products],
          ["Con stock y precio", d.available],
          ["Pedidos por cobrar", d.pending],
          ["Pagados por enviar", d.toShip],
        ].map(([label, n]) => (
          <Card key={label as string}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-extrabold">{n}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Últimos pedidos</h2>
          <Link to="/admin/pedidos" className="font-semibold text-primary">
            Ver todos
          </Link>
        </div>
        {d.latest.length === 0 ? (
          <p className="mt-3 text-muted-foreground">Todavía no hay pedidos.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {d.latest.map((o) => (
              <li key={o.id}>
                <Link
                  to="/admin/pedidos/$id"
                  params={{ id: o.id }}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <span>
                    <span className="font-semibold">{o.nombre}</span>
                    <span className="block text-sm text-muted-foreground">
                      {o.id} · {formatDate(o.createdAt)}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-bold">{formatPrice(o.total)}</span>
                    <StatusBadge status={o.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
