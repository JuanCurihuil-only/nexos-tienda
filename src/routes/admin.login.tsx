import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import logo from "@/assets/logo-nexos.png";
import { Button, Field, TextInput, errorText } from "@/components/admin/ui";
import { adminLogin } from "@/lib/admin";

export const Route = createFileRoute("/admin/login")({
  validateSearch: (search: Record<string, unknown>): { error?: string } => {
    const error = search["error"];
    return typeof error === "string" && error ? { error } : {};
  },
  component: Login,
});

const googleErrors: Record<string, string> = {
  config: "Falta configurar el ingreso con Google en el servidor.",
  denied: "Cancelaste el ingreso con Google.",
  forbidden: "Esa cuenta de Google no está autorizada para el panel.",
  invalid: "El ingreso con Google no se pudo confirmar. Probá de nuevo.",
};

function Login() {
  const { session } = Route.useRouteContext();
  const { error: googleError } = Route.useSearch();
  const login = useServerFn(adminLogin);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(
    googleError ? (googleErrors[googleError] ?? null) : null,
  );
  const [sending, setSending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSending(true);
    setError(null);
    try {
      const r = await login({ data: { user: String(f.get("user")), pass: String(f.get("pass")) } });
      if (r.ok) navigate({ to: "/admin" });
      else setError("Usuario o contraseña incorrectos.");
    } catch (err) {
      setError(errorText(err));
    }
    setSending(false);
  }

  return (
    <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-xl">
      <img src={logo} alt="Nexos" width={575} height={230} className="mx-auto h-14 w-auto" />
      <h1 className="mt-4 text-center text-2xl font-extrabold">Panel de la tienda</h1>
      {!session.configured ? (
        <p className="mt-6 rounded-xl bg-amber-100 p-4 text-sm text-amber-900">
          Falta configurar el acceso: usuario y contraseña, o las cuentas de Google permitidas.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {session.google && (
            <a
              href="/api/admin/google"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-base font-semibold hover:border-primary"
            >
              <GoogleMark /> Entrar con Google
            </a>
          )}
          {session.google && session.password && (
            <p className="text-center text-sm text-muted-foreground">o con usuario</p>
          )}
          {session.password && (
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Usuario" htmlFor="user">
                <TextInput id="user" name="user" autoComplete="username" required />
              </Field>
              <Field label="Contraseña" htmlFor="pass">
                <TextInput
                  id="pass"
                  name="pass"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>
              <Button type="submit" disabled={sending} className="w-full">
                <Lock className="h-4 w-4" /> {sending ? "Entrando…" : "Entrar"}
              </Button>
            </form>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.7c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-5 6.7-5Z"
      />
    </svg>
  );
}
