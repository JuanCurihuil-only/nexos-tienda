import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Ban, CheckCircle2, Trash2, Truck } from "lucide-react";
import { WhatsAppIcon } from "@/components/site/BrandIcons";
import { Button, Card, PageTitle, StatusBadge, formatDate, useToast } from "@/components/admin/ui";
import { adminDeleteOrder, adminOrder, adminSetOrderStatus } from "@/lib/admin";
import { formatPrice } from "@/lib/products";

export const Route = createFileRoute("/admin/pedidos/$id")({
  loader: async ({ params }) => {
    const o = await adminOrder({ data: params.id });
    if (!o) throw notFound();
    return o;
  },
  component: Pedido,
});

/** Arma el link de WhatsApp al teléfono que dejó el cliente (formato argentino). */
function waLink(phone: string, text: string) {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  if (!d.startsWith("54")) d = `549${d}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

function Pedido() {
  const o = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const toast = useToast();
  const setStatus = useServerFn(adminSetOrderStatus);
  const remove = useServerFn(adminDeleteOrder);
  const c = o.customer;
  const stockTaken = o.status === "pagado" || o.status === "enviado" || o.stockApplied === true;

  async function change(status: "pagado" | "enviado" | "cancelado", confirmText: string) {
    if (!window.confirm(confirmText)) return;
    try {
      await setStatus({ data: { id: o.id, status } });
      toast.ok("Estado actualizado");
      router.invalidate();
    } catch (e) {
      toast.error(e);
    }
  }

  async function onDelete() {
    const text = stockTaken
      ? `¿Eliminar el pedido ${o.id}? No se puede deshacer. Se va a reponer el stock.`
      : `¿Eliminar el pedido ${o.id}? No se puede deshacer.`;
    if (!window.confirm(text)) return;
    try {
      await remove({ data: o.id });
      navigate({ to: "/admin/pedidos" });
    } catch (e) {
      toast.error(e);
    }
  }

  return (
    <div>
      {toast.node}
      <Link
        to="/admin/pedidos"
        className="mb-3 inline-flex items-center gap-1 font-semibold text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a pedidos
      </Link>
      <PageTitle
        title={`Pedido ${o.id}`}
        subtitle={formatDate(o.createdAt)}
        actions={<StatusBadge status={o.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <Card>
            <h2 className="text-lg font-bold">Productos</h2>
            <ul className="mt-3 divide-y divide-border">
              {o.items.map((i, k) => (
                <li key={k} className="flex justify-between gap-3 py-2">
                  <span>
                    {i.qty} × {i.name}
                    {i.variant ? ` (${i.variant})` : ""}
                  </span>
                  <span className="font-semibold">{formatPrice(i.unitPrice * i.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-border pt-3 text-lg font-extrabold">
              <span>
                Total ({o.method === "transferencia" ? "transferencia/efectivo" : "Mercado Pago"})
              </span>
              <span>{formatPrice(o.total)}</span>
            </div>
            {o.mp?.paymentId && (
              <p className="mt-2 text-sm text-muted-foreground">
                Pago Mercado Pago #{o.mp.paymentId} · {o.mp.status}
              </p>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-bold">Historial</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {o.history.map((h, k) => (
                <li key={k} className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">{formatDate(h.at)}</span>
                  <StatusBadge status={h.status} />
                  {h.note && <span className="text-muted-foreground">{h.note}</span>}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="space-y-1">
            <h2 className="mb-2 text-lg font-bold">Cliente</h2>
            <p className="font-semibold">
              {c.nombre} {c.apellido}
            </p>
            <p>{c.email}</p>
            <p>{c.telefono}</p>
            {c.dni && <p>DNI/CUIT: {c.dni}</p>}
            <p className="pt-2 font-semibold">
              {c.entrega === "envio" ? "Envío a domicilio" : "Retira en showroom"}
            </p>
            {c.entrega === "envio" && (
              <p>
                {c.direccion}, {c.ciudad}, {c.provincia} ({c.cp})
              </p>
            )}
            {c.notas && <p className="pt-2 text-sm text-muted-foreground">Notas: {c.notas}</p>}
            <a
              href={waLink(
                c.telefono,
                `Hola ${c.nombre}! Te escribimos de Nexos por tu pedido ${o.id}.`,
              )}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1a7f45] px-5 font-semibold text-white"
            >
              <WhatsAppIcon className="h-5 w-5" /> Escribirle por WhatsApp
            </a>
          </Card>

          <Card className="space-y-2">
            <h2 className="mb-1 text-lg font-bold">Acciones</h2>
            {o.status !== "pagado" && o.status !== "enviado" && (
              <Button
                variant="success"
                className="w-full"
                onClick={() =>
                  change(
                    "pagado",
                    "¿Confirmás que el pago está recibido? Se va a descontar el stock.",
                  )
                }
              >
                <CheckCircle2 className="h-5 w-5" /> Marcar como pagado
              </Button>
            )}
            {o.status === "pagado" && (
              <Button
                className="w-full"
                onClick={() => change("enviado", "¿Marcar el pedido como enviado/entregado?")}
              >
                <Truck className="h-5 w-5" /> Marcar como enviado
              </Button>
            )}
            {o.status !== "cancelado" && (
              <Button
                variant="danger"
                className="w-full"
                onClick={() =>
                  change(
                    "cancelado",
                    o.status === "pagado" || o.status === "enviado"
                      ? "¿Cancelar este pedido? Se va a reponer el stock."
                      : "¿Cancelar este pedido?",
                  )
                }
              >
                <Ban className="h-5 w-5" /> Cancelar pedido
              </Button>
            )}
            <Button variant="danger" className="w-full" onClick={onDelete}>
              <Trash2 className="h-5 w-5" /> Eliminar pedido
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
