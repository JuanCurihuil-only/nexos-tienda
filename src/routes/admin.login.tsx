import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import logo from "@/assets/logo-nexos.png";
import { Button, Field, TextInput, errorText } from "@/components/admin/ui";
import { adminLogin } from "@/lib/admin";

export const Route = createFileRoute("/admin/login")({
  component: Login,
});

function Login() {
  const { session } = Route.useRouteContext();
  const login = useServerFn(adminLogin);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
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
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-xl"
    >
      <img src={logo} alt="Nexos" width={575} height={230} className="mx-auto h-14 w-auto" />
      <h1 className="mt-4 text-center text-2xl font-extrabold">Panel de la tienda</h1>
      {!session.configured ? (
        <p className="mt-6 rounded-xl bg-amber-100 p-4 text-sm text-amber-900">
          Falta configurar el acceso: completá <strong>ADMIN_USER</strong> y{" "}
          <strong>ADMIN_PASSWORD</strong> en el archivo <strong>.env</strong> y reiniciá la tienda.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
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
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive"
            >
              {error}
            </p>
          )}
          <Button type="submit" disabled={sending} className="w-full">
            <Lock className="h-4 w-4" /> {sending ? "Entrando…" : "Entrar"}
          </Button>
        </div>
      )}
    </form>
  );
}
