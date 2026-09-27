import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Camera, ExternalLink, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  Button,
  Card,
  Field,
  PageTitle,
  Select,
  TextArea,
  TextInput,
  Toggle,
  useToast,
} from "@/components/admin/ui";
import { adminDeleteProduct, adminProduct, adminSaveProduct, adminUploadImage } from "@/lib/admin";
import { invalidateCatalog } from "@/lib/catalog";
import { productPhoto } from "@/lib/image-resize";
import {
  discountPercent,
  formatPrice,
  INSTALLMENTS,
  installmentValue,
  productDiscountPercent,
  transferPrice,
  type ProductImage,
  type Variant,
} from "@/lib/products";

function parseMoney(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const amount = Math.round(Number(trimmed.replace(/\./g, "").replace(",", ".")));
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  return amount;
}

export const Route = createFileRoute("/admin/productos/$slug")({
  loader: ({ params }) => adminProduct({ data: params.slug }),
  component: ProductEditor,
});

function ProductEditor() {
  const { slug } = Route.useParams();
  const { product, description, categories } = Route.useLoaderData();
  const isNew = !product;
  const navigate = useNavigate();
  const router = useRouter();
  const toast = useToast();
  const save = useServerFn(adminSaveProduct);
  const remove = useServerFn(adminDeleteProduct);
  const upload = useServerFn(adminUploadImage);

  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const suggestedCash = product?.priceCard != null ? transferPrice(product.priceCard) : null;
  const storedCash = product?.priceTransfer ?? null;
  const [price, setPrice] = useState(product?.priceCard != null ? String(product.priceCard) : "");
  const [cash, setCash] = useState(
    (storedCash ?? suggestedCash) != null ? String(storedCash ?? suggestedCash) : "",
  );
  const [cashCustom, setCashCustom] = useState(storedCash != null && storedCash !== suggestedCash);
  const [stock, setStock] = useState(String(product?.stock ?? 1));
  const [available, setAvailable] = useState(product?.available ?? true);
  const [images, setImages] = useState<ProductImage[]>(product?.images ?? []);
  const [variants, setVariants] = useState<Variant[]>(product?.variants ?? []);
  const [desc, setDesc] = useState(description);
  const [short, setShort] = useState(product?.short ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);

  const cardPrice = parseMoney(price);
  const cashPriceValue = parseMoney(cash);
  const parents = categories.filter((c) => !c.parent);

  function onCardPrice(value: string) {
    setPrice(value);
    if (cashCustom) return;
    const next = parseMoney(value);
    setCash(next != null ? String(transferPrice(next)) : "");
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUploading(files.length);
    try {
      for (const file of Array.from(files)) {
        const photo = await productPhoto(file);
        const saved = await upload({ data: { base: name || "producto", ...photo } });
        setImages((prev) => [...prev, saved]);
        setUploading((n) => n - 1);
      }
      toast.ok("Fotos agregadas. No te olvides de guardar.");
    } catch (e) {
      toast.error(e);
    }
    setUploading(0);
  }

  function move(i: number, dir: -1 | 1) {
    setImages((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }

  async function onSave() {
    if (!name.trim()) return toast.error("Poné el nombre del producto");
    if (!category) return toast.error("Elegí una categoría");
    if (cardPrice === undefined || cashPriceValue === undefined) {
      return toast.error("Los precios tienen que ser números, sin $");
    }
    if ((cardPrice == null) !== (cashPriceValue == null)) {
      return toast.error("Completá el precio en efectivo y el de cuotas, o dejá los dos vacíos.");
    }
    if (cardPrice != null && cashPriceValue != null && cashPriceValue > cardPrice) {
      return toast.error("El precio en efectivo no puede ser mayor que el de cuotas.");
    }
    setBusy(true);
    try {
      const r = await save({
        data: {
          ...(product ? { originalSlug: product.slug } : {}),
          name: name.trim(),
          brand: brand.trim() || undefined,
          category,
          priceCard: cardPrice,
          priceTransfer: cashPriceValue,
          stock: Math.max(0, parseInt(stock || "0", 10) || 0),
          available,
          short: short.trim() || undefined,
          images,
          variants,
          description: desc,
        },
      });
      invalidateCatalog();
      toast.ok("Producto guardado");
      if (isNew)
        navigate({ to: "/admin/productos/$slug", params: { slug: r.slug }, replace: true });
      else router.invalidate();
    } catch (e) {
      toast.error(e);
    }
    setBusy(false);
  }

  async function onDelete() {
    if (!product || !window.confirm(`¿Borrar "${product.name}"? No se puede deshacer.`)) return;
    try {
      await remove({ data: product.slug });
      invalidateCatalog();
      navigate({ to: "/admin/productos" });
    } catch (e) {
      toast.error(e);
    }
  }

  return (
    <div className="pb-28">
      {toast.node}
      <Link
        to="/admin/productos"
        className="mb-3 inline-flex items-center gap-1 font-semibold text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a productos
      </Link>
      <PageTitle
        title={isNew ? "Nuevo producto" : "Editar producto"}
        actions={
          !isNew && (
            <a
              href={`/productos/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-4 font-semibold"
            >
              <ExternalLink className="h-4 w-4" /> Ver en la tienda
            </a>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <Card className="space-y-4">
            <Field label="Nombre" htmlFor="name">
              <TextInput
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Kit 3 en 1 Total 20V"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Categoría" htmlFor="cat">
                <Select id="cat" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Elegí una…</option>
                  {parents.map((p) => (
                    <optgroup key={p.slug} label={p.name}>
                      <option value={p.slug}>{p.name} (general)</option>
                      {categories
                        .filter((c) => c.parent === p.slug)
                        .map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </Select>
              </Field>
              <Field label="Marca (opcional)" htmlFor="brand">
                <TextInput
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Ej: Total"
                />
              </Field>
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-lg font-bold">Fotos</h2>
            <p className="text-sm text-muted-foreground">
              Subí fotos desde la PC o sacalas con el celular. Se achican solas. La primera es la
              principal.
            </p>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((im, i) => (
                <li key={im.src} className="relative rounded-xl border border-border bg-white p-1">
                  <img src={im.src} alt="" className="aspect-square w-full object-contain" />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      PRINCIPAL
                    </span>
                  )}
                  <div className="mt-1 flex justify-between">
                    <button
                      type="button"
                      aria-label="Mover a la izquierda"
                      onClick={() => move(i, -1)}
                      className="rounded-lg p-2 hover:bg-surface"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Quitar foto"
                      onClick={() => setImages((prev) => prev.filter((_, k) => k !== i))}
                      className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Mover a la derecha"
                      onClick={() => move(i, 1)}
                      className="rounded-lg p-2 hover:bg-surface"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
              <li>
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-center text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary">
                  <Camera className="h-7 w-7" />
                  {uploading ? `Subiendo ${uploading}…` : "Agregar fotos"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    disabled={uploading > 0}
                    onChange={(e) => {
                      void addPhotos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </li>
            </ul>
          </Card>

          <Card className="space-y-4">
            <Field
              label="Descripción"
              htmlFor="desc"
              hint='Una idea por renglón. Empezá un renglón con "-" para que se vea como viñeta.'
            >
              <TextArea
                id="desc"
                rows={10}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </Field>
            <Field
              label="Frase corta para Google (opcional)"
              htmlFor="short"
              hint="Si la dejás vacía, se toma de la descripción."
            >
              <TextInput
                id="short"
                value={short}
                onChange={(e) => setShort(e.target.value)}
                maxLength={160}
              />
            </Field>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="space-y-4">
            <h2 className="text-lg font-bold">Precio y stock</h2>
            <Field
              label="Precio en cuotas (tarjeta)"
              htmlFor="price"
              hint="Precio de lista. Las 6 cuotas se calculan sobre este valor. Vacío = precio a consultar."
            >
              <TextInput
                id="price"
                inputMode="numeric"
                value={price}
                onChange={(e) => onCardPrice(e.target.value)}
                placeholder="Ej: 644874"
              />
            </Field>
            <Field
              label="Precio en efectivo / transferencia"
              htmlFor="cash"
              hint={
                cashCustom
                  ? "Precio propio de este producto. No cambia solo si editás las cuotas."
                  : `Se sugiere el ${discountPercent()}% OFF. Cambialo si este producto tiene otro precio.`
              }
            >
              <TextInput
                id="cash"
                inputMode="numeric"
                value={cash}
                onChange={(e) => {
                  setCashCustom(true);
                  setCash(e.target.value);
                }}
                placeholder="Ej: 464309"
              />
            </Field>
            {cardPrice != null && cashPriceValue != null && (
              <div className="rounded-xl bg-surface p-4 text-sm">
                <p>
                  {productDiscountPercent(cardPrice, cashPriceValue) > 0
                    ? `${productDiscountPercent(cardPrice, cashPriceValue)}% OFF en efectivo`
                    : "Mismo precio en efectivo y en cuotas"}
                </p>
                <p className="mt-1 font-semibold text-success">
                  {INSTALLMENTS} cuotas sin interés de {formatPrice(installmentValue(cardPrice))}
                </p>
              </div>
            )}
            {variants.length === 0 && (
              <Field label="Stock (unidades)" htmlFor="stock">
                <TextInput
                  id="stock"
                  inputMode="numeric"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </Field>
            )}
            <Toggle
              checked={available}
              onChange={setAvailable}
              label={available ? "A la venta" : "Sin stock (no se puede comprar)"}
            />
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-bold">Modelos o colores (opcional)</h2>
            <p className="text-sm text-muted-foreground">
              Solo si el cliente tiene que elegir, por ejemplo un color.
            </p>
            {variants.map((v, i) => (
              <div
                key={v.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2"
              >
                <TextInput
                  aria-label="Nombre del modelo"
                  value={v.name}
                  onChange={(e) =>
                    setVariants((prev) =>
                      prev.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)),
                    )
                  }
                  className="min-w-0 flex-1"
                  placeholder="Ej: Negro"
                />
                <TextInput
                  aria-label="Stock del modelo"
                  inputMode="numeric"
                  value={String(v.stock)}
                  onChange={(e) =>
                    setVariants((prev) =>
                      prev.map((x, k) =>
                        k === i ? { ...x, stock: parseInt(e.target.value || "0", 10) || 0 } : x,
                      ),
                    )
                  }
                  className="w-24"
                />
                <Toggle
                  checked={v.available}
                  onChange={(val) =>
                    setVariants((prev) =>
                      prev.map((x, k) => (k === i ? { ...x, available: val } : x)),
                    )
                  }
                  label=""
                />
                <button
                  type="button"
                  aria-label="Quitar modelo"
                  onClick={() => setVariants((prev) => prev.filter((_, k) => k !== i))}
                  className="rounded-lg p-3 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() =>
                setVariants((prev) => [
                  ...prev,
                  { id: Date.now(), name: "", stock: 1, available: true },
                ])
              }
            >
              <Plus className="h-4 w-4" /> Agregar modelo
            </Button>
          </Card>

          {!isNew && (
            <Button variant="danger" onClick={onDelete} className="w-full">
              <Trash2 className="h-4 w-4" /> Borrar producto
            </Button>
          )}
        </div>
      </div>

      {/* Barra fija para guardar, siempre a mano (también en el celular) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl justify-end gap-2">
          <Button onClick={onSave} disabled={busy || uploading > 0} className="w-full sm:w-auto">
            <Save className="h-5 w-5" /> {busy ? "Guardando…" : "Guardar producto"}
          </Button>
        </div>
      </div>
    </div>
  );
}
