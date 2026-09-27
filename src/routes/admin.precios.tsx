import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, Field, PageTitle, Select, TextInput, useToast } from "@/components/admin/ui";
import { adminBulkPrice, adminProducts, adminSetTransferDiscount } from "@/lib/admin";
import { invalidateCatalog } from "@/lib/catalog";
import { formatPrice, normalizeDiscountPercent, transferPriceAt } from "@/lib/products";

export const Route = createFileRoute("/admin/precios")({
  loader: () => adminProducts(),
  component: Precios,
});

type Row = {
  slug: string;
  name: string;
  before: number;
  after: number;
  transferBefore: number;
  transferAfter: number;
};

type DiscountRow = {
  slug: string;
  name: string;
  card: number;
  before: number;
  after: number;
  custom: boolean;
};

function Precios() {
  const { products, categories, transferDiscount } = Route.useLoaderData();
  const bulk = useServerFn(adminBulkPrice);
  const saveDiscount = useServerFn(adminSetTransferDiscount);
  const router = useRouter();
  const toast = useToast();
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [percent, setPercent] = useState("10");
  const [discount, setDiscount] = useState(String(transferDiscount));
  const [discountRows, setDiscountRows] = useState<DiscountRow[] | null>(null);
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

  const discountNum = normalizeDiscountPercent(Number(discount.replace(",", ".")));
  const sameDiscount = Math.round(discountNum * 100) === Math.round(transferDiscount * 100);
  const discountOk =
    discount.trim() !== "" &&
    Number.isFinite(Number(discount.replace(",", "."))) &&
    discountNum >= 0 &&
    discountNum <= 90 &&
    !sameDiscount;

  function previewDiscount() {
    if (!discountOk) return;
    setDiscountRows(
      products.flatMap((product) => {
        if (product.priceCard == null) return [];
        const custom = product.priceTransfer != null;
        const before = custom
          ? product.priceTransfer!
          : transferPriceAt(product.priceCard, transferDiscount)!;
        const after = custom ? before : transferPriceAt(product.priceCard, discountNum)!;
        return [
          {
            slug: product.slug,
            name: product.name,
            card: product.priceCard,
            before,
            after,
            custom,
          },
        ];
      }),
    );
  }

  async function applyDiscount() {
    if (!discountOk || !discountRows) return;
    const changing = discountRows.filter((row) => !row.custom).length;
    const ok = window.confirm(
      `¿Pasar el descuento general a ${discountNum}%? Cambia el efectivo de ${changing} productos. Los que tienen precio propio no se tocan.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      await saveDiscount({ data: { percent: discountNum } });
      invalidateCatalog();
      toast.ok(`Descuento general: ${discountNum}%`);
      setDiscountRows(null);
      router.invalidate();
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
        subtitle="El descuento general de efectivo y los cambios de precio de muchos productos."
      />
      <Card className="mb-5">
        <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <Field label="Descuento general en efectivo / transferencia" htmlFor="discount">
            <TextInput
              id="discount"
              inputMode="decimal"
              value={discount}
              onChange={(e) => {
                setDiscount(e.target.value);
                setDiscountRows(null);
              }}
            />
          </Field>
          <Button
            variant="secondary"
            className="h-12 w-full md:w-auto"
            onClick={previewDiscount}
            disabled={!discountOk || busy}
          >
            <Eye className="h-5 w-5" /> Ver cómo quedan
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Hoy es {transferDiscount.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%. Acepta
          decimales, por ejemplo 28,67. Solo afecta a los productos sin un precio de efectivo
          propio. Del 0 al 90.
        </p>
      </Card>
      {discountRows && (
        <Card className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              Descuento general {transferDiscount}% → {discountNum}%
            </h2>
            <Button variant="success" onClick={applyDiscount} disabled={busy}>
              <Check className="h-5 w-5" /> Aplicar descuento
            </Button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            El precio en cuotas no cambia. El de efectivo solo cambia en los productos que siguen el
            descuento general.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-2">Producto</th>
                  <th className="py-2 pr-2 text-right">Cuotas</th>
                  <th className="py-2 pr-2 text-right">Efectivo ahora</th>
                  <th className="py-2 text-right">Efectivo con {discountNum}%</th>
                </tr>
              </thead>
              <tbody>
                {discountRows.map((row) => (
                  <tr key={row.slug} className="border-b border-border">
                    <td className="py-2 pr-2">
                      {row.name}
                      {row.custom && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Precio de efectivo propio: no cambia
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right">{formatPrice(row.card)}</td>
                    <td className="py-2 pr-2 text-right text-muted-foreground">
                      {formatPrice(row.before)}
                    </td>
                    <td className="py-2 text-right font-bold">{formatPrice(row.after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Card>
        <div className="grid items-end gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
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
            <Select
              id="b"
              value={brand}
              onChange={(e) => (setBrand(e.target.value), setRows(null))}
            >
              <option value="">Todas</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Porcentaje" htmlFor="p">
            <TextInput
              id="p"
              inputMode="decimal"
              value={percent}
              onChange={(e) => (setPercent(e.target.value), setRows(null))}
            />
          </Field>
          <Button
            variant="secondary"
            className="h-12 w-full md:w-auto"
            onClick={preview}
            disabled={!valid || busy}
          >
            <Eye className="h-5 w-5" /> Ver cómo quedan
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Ej: 10 sube 10%. -5 baja 5%.</p>
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
                  <th className="py-2 pr-2 text-right">Cuotas antes</th>
                  <th className="py-2 pr-2 text-right">Cuotas nuevo</th>
                  <th className="py-2 pr-2 text-right">Efectivo antes</th>
                  <th className="py-2 text-right">Efectivo nuevo</th>
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
                    <td className="py-2 pr-2 text-right text-muted-foreground">
                      {formatPrice(r.transferBefore)}
                    </td>
                    <td className="py-2 text-right">{formatPrice(r.transferAfter)}</td>
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
