import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useEffect, useState } from "react";

export function PageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>{children}</div>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const control =
  "w-full rounded-xl border border-border bg-background px-3 text-base focus:border-primary focus:outline-none";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${control} h-12 ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${control} py-3 ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${control} h-12 ${props.className ?? ""}`} />;
}

type Variant = "primary" | "secondary" | "danger" | "success";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border border-border bg-card hover:border-primary",
  danger: "border border-destructive/40 bg-card text-destructive hover:bg-destructive/10",
  success: "bg-[#1a7f45] text-white hover:bg-[#156b3a]",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-12 items-center gap-3"
    >
      <span
        className={`relative h-7 w-12 rounded-full transition-colors ${checked ? "bg-[#1a7f45]" : "bg-border"}`}
      >
        <span
          className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </span>
      <span className="font-semibold">{label}</span>
    </button>
  );
}

/** Aviso breve arriba de la pantalla ("Guardado", errores). */
export function useToast() {
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? (
    <div
      role="status"
      className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl px-5 py-3 font-semibold text-white shadow-xl ${
        msg.ok ? "bg-[#1a7f45]" : "bg-destructive"
      }`}
    >
      {msg.text}
    </div>
  ) : null;
  return {
    node,
    ok: (text: string) => setMsg({ text, ok: true }),
    error: (e: unknown) => setMsg({ text: errorText(e), ok: false }),
  };
}

export function errorText(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  if (m.includes("NO_AUTORIZADO")) return "Tu sesión venció: volvé a entrar.";
  if (m.startsWith("[")) return "Revisá los datos: hay campos incompletos o inválidos.";
  return m;
}

export const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pendiente_transferencia: { label: "Esperando transferencia", cls: "bg-amber-100 text-amber-900" },
  pendiente_pago: { label: "Esperando pago", cls: "bg-amber-100 text-amber-900" },
  pagado: { label: "Pagado · a enviar", cls: "bg-emerald-100 text-emerald-900" },
  enviado: { label: "Enviado / entregado", cls: "bg-sky-100 text-sky-900" },
  rechazado: { label: "Pago rechazado", cls: "bg-red-100 text-red-900" },
  cancelado: { label: "Cancelado", cls: "bg-gray-200 text-gray-800" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABEL[status] ?? { label: status, cls: "bg-gray-200" };
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

/** Fecha y hora de Argentina, igual en el servidor y en el navegador. */
export function formatDate(iso: string) {
  const d = new Date(new Date(iso).getTime() - 3 * 3600_000); // UTC-3 (Argentina)
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
