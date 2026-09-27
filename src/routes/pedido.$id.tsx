import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { WhatsAppIcon } from "@/components/site/BrandIcons";
import { fetchOrder, type PublicOrder } from "@/lib/checkout";
import { formatPrice, whatsappLink } from "@/lib/products";

export const Route = createFileRoute("/pedido/$id")({
  validateSearch: (s: Record<string, unknown>): { payment_id?: number | undefined } => {
    const n = Number(s["payment_id"]);
    return { payment_id: Number.isFinite(n) && n > 0 ? n : undefined };
  },
  loaderDeps: ({ search }) => ({
    paymentId: search.payment_id ? String(search.payment_id) : undefined,
  }),
  loader: async ({ params, deps }) => {
    const order = await fetchOrder({ data: { id: params.id, paymentId: deps.paymentId } });
    if (!order) throw notFound();
    return order;
  },
  head: () => ({
    meta: [{ title: "Tu pedido | Nexos" }, { name: "robots", content: "noindex" }],
  }),
  component: PedidoPage,
});

const STATUS: Record<
  PublicOrder["status"],
  { title: string; text: string; tone: "ok" | "wait" | "bad" }
> = {
  pagado: {
    title: "¡Pago aprobado!",
    text: "Recibimos tu pago. Te vamos a escribir para coordinar la entrega.",
    tone: "ok",
  },
  pendiente_transferencia: {
    title: "Pedido recibido: falta la transferencia",
    text: "Transferí el total a la cuenta de abajo y mandanos el comprobante por WhatsApp.",
    tone: "wait",
  },
  pendiente_pago: {
    title: "Estamos esperando la confirmación del pago",
    text: "Si ya pagaste, Mercado Pago puede tardar unos minutos en confirmarlo. Actualizá esta página.",
    tone: "wait",
  },
  enviado: {
    title: "¡Tu pedido está en camino!",
    text: "Ya despachamos o entregamos tu pedido. Cualquier consulta, escribinos.",
    tone: "ok",
  },
  rechazado: {
    title: "El pago no se aprobó",
    text: "Podés volver a intentarlo con otro medio de pago o escribirnos por WhatsApp.",
    tone: "bad",
  },
  cancelado: { title: "Pedido cancelado", text: "Este pedido fue cancelado.", tone: "bad" },
};

function PedidoPage() {
  const order = Route.useLoaderData();
  const router = useRouter();
  const s = STATUS[order.status];
  const Icon = s.tone === "ok" ? CheckCircle2 : s.tone === "bad" ? XCircle : Clock;
  const toneCls =
    s.tone === "ok"
      ? "bg-success/10 text-success"
      : s.tone === "bad"
        ? "bg-destructive/10 text-destructive"
        : "bg-primary/10 text-primary";

  const wa = whatsappLink(
    `Hola Nexos! Te escribo por el pedido ${order.id} (${formatPrice(order.total)}).${
      order.status === "pendiente_transferencia" ? " Te mando el comprobante de transferencia." : ""
    }`,
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className={`flex items-start gap-4 rounded-2xl p-6 ${toneCls}`}>
        <Icon className="h-8 w-8 shrink-0" aria-hidden />
        <div>
          <h1 className="text-2xl font-extrabold">{s.title}</h1>
          <p className="mt-1 text-foreground">{s.text}</p>
          <p className="mt-2 text-sm text-foreground">
            Número de pedido: <strong>{order.id}</strong>
          </p>
        </div>
      </div>

      {order.transfer && order.status === "pendiente_transferencia" && (
        <section
          className="mt-6 rounded-2xl border border-border bg-card p-6"
          aria-labelledby="t-tr"
        >
          <h2 id="t-tr" className="text-lg font-bold">
            Datos para transferir {formatPrice(order.total)}
          </h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[140px_1fr]">
            <dt className="text-muted-foreground">Alias</dt>
            <dd className="font-semibold">{order.transfer.alias}</dd>
            <dt className="text-muted-foreground">CBU / CVU</dt>
            <dd className="font-semibold break-all">{order.transfer.cbu}</dd>
            <dt className="text-muted-foreground">Titular</dt>
            <dd className="font-semibold">{order.transfer.titular}</dd>
            <dt className="text-muted-foreground">Banco</dt>
            <dd className="font-semibold">{order.transfer.banco}</dd>
          </dl>
          <p className="mt-3 text-sm text-muted-foreground">
            También podés pagar en efectivo en el showroom con el mismo descuento.
          </p>
        </section>
      )}

      <section
        className="mt-6 rounded-2xl border border-border bg-card p-6"
        aria-labelledby="t-det"
      >
        <h2 id="t-det" className="text-lg font-bold">
          Detalle
        </h2>
        <ul className="mt-3 divide-y divide-border text-sm">
          {order.items.map((i, k) => (
            <li key={k} className="flex justify-between gap-4 py-2">
              <span>
                {i.qty} × {i.name}
                {i.variant ? ` (${i.variant})` : ""}
              </span>
              <span className="shrink-0 font-semibold">{formatPrice(i.unitPrice * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-bold">
          <span>
            Total ({order.method === "transferencia" ? "transferencia/efectivo" : "Mercado Pago"})
          </span>
          <span>{formatPrice(order.total)}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Entrega:{" "}
          {order.entrega === "envio"
            ? "envío a domicilio (costo a coordinar)"
            : "retiro en showroom"}
        </p>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#1a7f45] px-6 font-semibold text-white hover:bg-[#156b3a]"
        >
          <WhatsAppIcon className="h-5 w-5" />
          {order.status === "pendiente_transferencia"
            ? "Enviar comprobante por WhatsApp"
            : "Escribirnos por WhatsApp"}
        </a>
        {order.status === "pendiente_pago" && (
          <button
            type="button"
            onClick={() => router.invalidate()}
            className="inline-flex min-h-12 items-center rounded-lg border border-border px-6 font-semibold"
          >
            Actualizar estado
          </button>
        )}
        <Link
          to="/"
          className="inline-flex min-h-12 items-center rounded-lg border border-border px-6 font-semibold"
        >
          Volver a la tienda
        </Link>
      </div>
    </div>
  );
}
