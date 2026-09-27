import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageTitle, StatusBadge, formatDate } from "@/components/admin/ui";
import { adminOrders } from "@/lib/admin";
import { formatPrice } from "@/lib/products";

export const Route = createFileRoute("/admin/pedidos/")({
  loader: () => adminOrders(),
  component: Pedidos,
});

const TABS = [
  { id: "todos", label: "Todos", match: () => true },
  {
    id: "cobrar",
    label: "Por cobrar",
    match: (s: string) => s === "pendiente_transferencia" || s === "pendiente_pago",
  },
  { id: "enviar", label: "Pagados por enviar", match: (s: string) => s === "pagado" },
  { id: "enviados", label: "Enviados", match: (s: string) => s === "enviado" },
  {
    id: "otros",
    label: "Cancelados / rechazados",
    match: (s: string) => s === "cancelado" || s === "rechazado",
  },
];

function Pedidos() {
  const orders = Route.useLoaderData();
  const [tab, setTab] = useState("todos");
  const t = TABS.find((x) => x.id === tab)!;
  const list = orders.filter((o) => t.match(o.status));

  return (
    <div>
      <PageTitle title="Pedidos" subtitle={`${orders.length} pedidos en total`} />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setTab(x.id)}
            className={`min-h-11 shrink-0 rounded-xl px-4 font-semibold ${
              tab === x.id ? "bg-primary text-primary-foreground" : "border border-border bg-card"
            }`}
          >
            {x.label} ({orders.filter((o) => x.match(o.status)).length})
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <Card>
          <p className="text-muted-foreground">No hay pedidos en esta lista.</p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {list.map((o) => (
            <li key={o.id}>
              <Link
                to="/admin/pedidos/$id"
                params={{ id: o.id }}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{o.nombre}</span>
                  <span className="block text-sm text-muted-foreground">
                    {o.id} · {formatDate(o.createdAt)} · {o.items} producto(s) ·{" "}
                    {o.method === "transferencia" ? "Transferencia" : "Mercado Pago"} ·{" "}
                    {o.entrega === "envio" ? "Envío" : "Retiro"}
                  </span>
                </span>
                <span className="font-extrabold">{formatPrice(o.total)}</span>
                <StatusBadge status={o.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
