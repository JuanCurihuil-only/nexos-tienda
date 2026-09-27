import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, Field, PageTitle, Select, TextInput, useToast } from "@/components/admin/ui";
import { adminBulkPrice, adminProducts } from "@/lib/admin";
import { invalidateCatalog } from "@/lib/catalog";
import { formatPrice, transferPrice } from "@/lib/products";

export const Route = createFileRoute("/admin/precios")({
  loader: () => adminProducts(),
  component: Precios,
});

type Row = { slug: string; name: string; before: number; after: number };

function Precios() {
  const { products, categories } = Route.useLoaderData();
  const bulk = useServerFn(adminBulkPrice);
  const toast = useToast();
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [percent, setPercent] = useState("10");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  const brands = useMemo(
    () =>
      Array.from(
        new Set(products.map((p) => p.brand).filter((b): b is string => Boolean(b))),
      ).sort(),
    [products],
  );
  const pct = Number(percent.replace(",", "."));
  const valid = Number.isFinite(pct) && pct !== 0 && pct >= -90 && pct <= 500;
  const params = () => ({
    ...(category ? { category } : {}),
    ...(brand ? { brand } : {}),
    percent: pct,
  });

  async function preview() {
    setBusy(true);
    try {
      const r = await bulk({ data: { ...params(), apply: false } });
      setRows(r.rows);
    } catch (e) {
      toast.error(e);
    }
    setBusy(false);
  }

  async function apply() {
    if (!rows?.length) return;
    if (!window.confirm(`¿Confirmás el cambio de precio en ${rows.length} productos?`)) return;
    setBusy(true);
    try {
      await bulk({ data: { ...params(), apply: true } });
      invalidateCatalog();
      toast.ok(`Listo: se actualizaron ${rows.length} precios`);
      setRows(null);
    } catch (e) {
      toast.error(e);
    }
    setBusy(false);
  }

  return (
    <div>
      {toast.node}
      <PageTitle
        title="Cambiar precios"
        subtitle="Subí o bajá precios de muchos productos a la vez."
      />
      <Card className="grid gap-4 md:grid-cols-4 md:items-end">
        <Field label="Categoría" htmlFor="c">
          <Select
            id="c"
            value={category}
            onChange={(e) => (setCategory(e.target.value), setRows(null))}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.parent ? "— " : ""}
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Marca" htmlFor="b">
          <Select id="b" value={brand} onChange={(e) => (setBrand(e.target.value), setRows(null))}>
            <option value="">Todas</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Porcentaje" htmlFor="p" hint="Ej: 10 sube 10%. -5 baja 5%.">
          <TextInput
            id="p"
            inputMode="decimal"
            value={percent}
            onChange={(e) => (setPercent(e.target.value), setRows(null))}
          />
        </Field>
        <Button variant="secondary" onClick={preview} disabled={!valid || busy}>
          <Eye className="h-5 w-5" /> Ver cómo quedan
        </Button>
      </Card>

      {rows && (
        <Card className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              {rows.length} productos · {pct > 0 ? "+" : ""}
              {pct}%
            </h2>
            <Button variant="success" onClick={apply} disabled={busy || rows.length === 0}>
              <Check className="h-5 w-5" /> Confirmar cambio
            </Button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-2">Producto</th>
                  <th className="py-2 pr-2 text-right">Tarjeta antes</th>
                  <th className="py-2 pr-2 text-right">Tarjeta nuevo</th>
                  <th className="py-2 text-right">Transferencia nuevo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.slug} className="border-b border-border">
                    <td className="py-2 pr-2">{r.name}</td>
                    <td className="py-2 pr-2 text-right text-muted-foreground">
                      {formatPrice(r.before)}
                    </td>
                    <td className="py-2 pr-2 text-right font-bold">{formatPrice(r.after)}</td>
                    <td className="py-2 text-right">{formatPrice(transferPrice(r.after)!)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
