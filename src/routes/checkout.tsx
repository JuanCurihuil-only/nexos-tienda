import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Banknote, CreditCard, Lock } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Installments } from "@/components/site/Price";
import { useCart } from "@/lib/cart";
import { createOrder } from "@/lib/checkout";
import { discountPercent, formatPrice, INSTALLMENTS } from "@/lib/products";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [{ title: "Finalizar compra | Nexos" }, { name: "robots", content: "noindex" }],
  }),
  component: Checkout,
});

type Method = "transferencia" | "mercadopago";

function Field({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const input =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary";

function Checkout() {
  const { items, totalTransfer, totalCard, clear } = useCart();
  const navigate = useNavigate();
  const submit = useServerFn(createOrder);
  const [method, setMethod] = useState<Method>("transferencia");
  const [entrega, setEntrega] = useState<"envio" | "retiro">("envio");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center" aria-live="polite">
        <p className="text-lg font-semibold">Procesando tu pedido…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-3xl font-extrabold">Tu carrito está vacío</h1>
        <Link
          to="/catalogo"
          className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-primary px-6 font-semibold text-primary-foreground"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  const total = method === "transferencia" ? totalTransfer : totalCard;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const get = (k: string) => {
      const v = String(f.get(k) ?? "").trim();
      return v || undefined;
    };
    setSending(true);
    try {
      const res = await submit({
        data: {
          method,
          items: items.map((i) => ({
            slug: i.product.slug,
            ...(i.variant ? { variantId: i.variant.id } : {}),
            qty: i.qty,
          })),
          customer: {
            nombre: get("nombre") ?? "",
            apellido: get("apellido") ?? "",
            email: get("email") ?? "",
            telefono: get("telefono") ?? "",
            dni: get("dni"),
            entrega,
            direccion: get("direccion"),
            ciudad: get("ciudad"),
            provincia: get("provincia"),
            cp: get("cp"),
            notas: get("notas"),
          },
        },
      });
      setDone(true);
      clear();
      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
      } else {
        await navigate({ to: "/pedido/$id", params: { id: res.id } });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes("MP_ACCESS_TOKEN")
          ? "El pago con Mercado Pago todavía no está configurado. Elegí transferencia o escribinos por WhatsApp."
          : msg.startsWith("[") || msg.includes("invalid")
            ? "Revisá los datos del formulario."
            : msg,
      );
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Breadcrumbs items={[{ name: "Finalizar compra" }]} />
      <h1 className="mt-4 text-3xl font-extrabold">Finalizar compra</h1>

      <form onSubmit={onSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          {/* Medio de pago */}
          <fieldset className="rounded-2xl border border-border bg-card p-5">
            <legend className="px-1 text-lg font-bold">1. ¿Cómo querés pagar?</legend>
            <div className="mt-3 grid gap-3">
              {(
                [
                  {
                    id: "transferencia",
                    icon: Banknote,
                    title: "Transferencia bancaria o efectivo",
                    text: `${discountPercent()}% OFF · Total ${formatPrice(totalTransfer)}`,
                  },
                  {
                    id: "mercadopago",
                    icon: CreditCard,
                    title: "Tarjeta, débito o dinero en cuenta (Mercado Pago)",
                    text: `Total ${formatPrice(totalCard)} · hasta ${INSTALLMENTS} cuotas sin interés de ${formatPrice(Math.round(totalCard / INSTALLMENTS))}`,
                  },
                ] as const
              ).map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 ${
                    method === m.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="metodo"
                    value={m.id}
                    checked={method === m.id}
                    onChange={() => setMethod(m.id)}
                    className="mt-1 h-5 w-5 accent-[var(--primary)]"
                  />
                  <m.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <span>
                    <span className="block font-semibold">{m.title}</span>
                    <span className="block text-sm text-muted-foreground">{m.text}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Datos */}
          <fieldset className="rounded-2xl border border-border bg-card p-5">
            <legend className="px-1 text-lg font-bold">2. Tus datos</legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field id="nombre" label="Nombre">
                <input
                  id="nombre"
                  name="nombre"
                  required
                  minLength={2}
                  autoComplete="given-name"
                  className={input}
                />
              </Field>
              <Field id="apellido" label="Apellido">
                <input
                  id="apellido"
                  name="apellido"
                  required
                  minLength={2}
                  autoComplete="family-name"
                  className={input}
                />
              </Field>
              <Field id="email" label="Email">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className={input}
                />
              </Field>
              <Field id="telefono" label="Teléfono / WhatsApp">
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  required
                  minLength={6}
                  autoComplete="tel"
                  className={input}
                />
              </Field>
              <Field id="dni" label="DNI o CUIT (opcional)" hint="Para la factura.">
                <input id="dni" name="dni" inputMode="numeric" className={input} />
              </Field>
            </div>
          </fieldset>

          {/* Entrega */}
          <fieldset className="rounded-2xl border border-border bg-card p-5">
            <legend className="px-1 text-lg font-bold">3. Entrega</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    id: "envio",
                    title: "Envío a domicilio",
                    text: "El costo se coordina por WhatsApp.",
                  },
                  {
                    id: "retiro",
                    title: "Retiro en showroom",
                    text: "Córdoba Capital, con visita coordinada.",
                  },
                ] as const
              ).map((o) => (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 ${
                    entrega === o.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="entrega"
                    value={o.id}
                    checked={entrega === o.id}
                    onChange={() => setEntrega(o.id)}
                    className="mt-1 h-5 w-5 accent-[var(--primary)]"
                  />
                  <span>
                    <span className="block font-semibold">{o.title}</span>
                    <span className="block text-sm text-muted-foreground">{o.text}</span>
                  </span>
                </label>
              ))}
            </div>

            {entrega === "envio" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field id="direccion" label="Calle, número, piso y depto.">
                    <input
                      id="direccion"
                      name="direccion"
                      required
                      autoComplete="street-address"
                      className={input}
                    />
                  </Field>
                </div>
                <Field id="ciudad" label="Localidad">
                  <input
                    id="ciudad"
                    name="ciudad"
                    required
                    autoComplete="address-level2"
                    className={input}
                  />
                </Field>
                <Field id="provincia" label="Provincia">
                  <input
                    id="provincia"
                    name="provincia"
                    required
                    autoComplete="address-level1"
                    className={input}
                  />
                </Field>
                <Field id="cp" label="Código postal">
                  <input
                    id="cp"
                    name="cp"
                    required
                    inputMode="numeric"
                    autoComplete="postal-code"
                    className={input}
                  />
                </Field>
              </div>
            )}
            <div className="mt-4">
              <Field id="notas" label="Notas (opcional)">
                <textarea id="notas" name="notas" rows={3} className={`${input} h-auto py-2`} />
              </Field>
            </div>
          </fieldset>
        </div>

        {/* Resumen */}
        <aside className="lg:sticky lg:top-40 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold">Resumen</h2>
            <ul className="mt-4 space-y-3">
              {items.map((i) => (
                <li key={i.key} className="flex gap-3 text-sm">
                  {i.product.images[0] && (
                    <img
                      src={i.product.images[0].src}
                      alt=""
                      width={56}
                      height={56}
                      className="h-14 w-14 shrink-0 rounded-lg border border-border bg-white object-contain p-1"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium">{i.product.name}</p>
                    {i.variant && <p className="text-xs text-muted-foreground">{i.variant.name}</p>}
                    <p className="text-muted-foreground">x{i.qty}</p>
                  </div>
                  <p className="shrink-0 font-semibold">
                    {formatPrice(
                      (method === "transferencia"
                        ? i.product.priceTransfer!
                        : i.product.priceCard!) * i.qty,
                    )}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-baseline justify-between border-t border-border pt-4">
              <span className="font-semibold">Total</span>
              <span className="font-display text-3xl font-extrabold">{formatPrice(total)}</span>
            </div>
            <div className="mt-3">
              <Installments priceCard={totalCard} />
              {method === "transferencia" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Pagando con tarjeta de crédito, total {formatPrice(totalCard)}.
                </p>
              )}
            </div>
            <p className="mt-1 text-right text-xs text-muted-foreground">Envío no incluido</p>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Lock className="h-4 w-4" aria-hidden />
              {sending
                ? "Procesando…"
                : method === "mercadopago"
                  ? "Pagar con Mercado Pago"
                  : "Confirmar pedido"}
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {method === "mercadopago"
                ? "Vas a completar el pago en el sitio seguro de Mercado Pago."
                : "Te mostramos los datos para transferir al confirmar."}
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
