import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ClipboardList,
  Download,
  ExternalLink,
  Image,
  LayoutGrid,
  LogOut,
  Package,
  Percent,
  Tags,
} from "lucide-react";
import logo from "@/assets/logo-nexos.png";
import { adminLogout, adminSession } from "@/lib/admin";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const session = await adminSession();
    if (!session.loggedIn && location.pathname !== "/admin/login") {
      throw redirect({ to: "/admin/login" });
    }
    return { session };
  },
  head: () => ({
    meta: [{ title: "Panel | Nexos" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Inicio", icon: LayoutGrid, exact: true },
  { to: "/admin/productos", label: "Productos", icon: Package },
  { to: "/admin/precios", label: "Precios", icon: Percent },
  { to: "/admin/categorias", label: "Categorías", icon: Tags },
  { to: "/admin/banner", label: "Banner", icon: Image },
  { to: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
] as const;

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const logout = useServerFn(adminLogout);

  if (pathname === "/admin/login") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <img src={logo} alt="Nexos" width={575} height={230} className="h-9 w-auto" />
          <span className="rounded-lg bg-ink px-2 py-1 text-xs font-bold uppercase tracking-wide text-ink-foreground">
            Panel
          </span>
          <div className="ml-auto flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden min-h-11 items-center gap-2 rounded-xl border border-border px-4 font-semibold sm:inline-flex"
            >
              <ExternalLink className="h-4 w-4" /> Ver tienda
            </a>
            <a
              href="/api/admin/respaldo"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 font-semibold"
              title="Descargar respaldo"
            >
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">Respaldo</span>
            </a>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate({ to: "/admin/login" });
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 font-semibold"
            >
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
        <nav aria-label="Secciones del panel" className="mx-auto max-w-6xl overflow-x-auto px-2">
          <ul className="flex gap-1 pb-2">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link
                  to={n.to}
                  activeOptions={{ exact: "exact" in n }}
                  activeProps={{ className: "bg-primary text-primary-foreground" }}
                  inactiveProps={{ className: "hover:bg-surface" }}
                  className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl px-4 font-semibold"
                >
                  <n.icon className="h-5 w-5" aria-hidden /> {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
