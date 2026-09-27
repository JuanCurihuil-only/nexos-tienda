import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ImageUp, RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import defaultHero from "@/assets/hero-tools-800.webp";
import {
  Button,
  Card,
  Field,
  PageTitle,
  TextArea,
  TextInput,
  useToast,
} from "@/components/admin/ui";
import { adminSaveHero, adminUploadImage } from "@/lib/admin";
import { getCatalog, invalidateCatalog } from "@/lib/catalog";
import { bannerPhotos } from "@/lib/image-resize";
import { DEFAULT_HERO_SUBTITLE, DEFAULT_HERO_TITLE } from "@/lib/products";

export const Route = createFileRoute("/admin/banner")({
  loader: () => getCatalog(),
  component: Banner,
});

function Banner() {
  const { settings } = Route.useLoaderData();
  const router = useRouter();
  const toast = useToast();
  const save = useServerFn(adminSaveHero);
  const upload = useServerFn(adminUploadImage);
  const hero = settings.hero ?? {};
  const [title, setTitle] = useState(hero.title ?? "");
  const [subtitle, setSubtitle] = useState(hero.subtitle ?? "");
  const [image, setImage] = useState<{ lg: string; sm: string } | null>(hero.image ?? null);
  const [busy, setBusy] = useState(false);

  async function onFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const { lg, sm } = await bannerPhotos(file);
      const [a, b] = await Promise.all([
        upload({ data: { base: "banner", ...lg } }),
        upload({ data: { base: "banner-celular", ...sm } }),
      ]);
      setImage({ lg: a.src, sm: b.src });
      toast.ok("Imagen lista. Tocá Guardar para publicarla.");
    } catch (e) {
      toast.error(e);
    }
    setBusy(false);
  }

  async function onSave() {
    setBusy(true);
    try {
      await save({ data: { title: title.trim(), subtitle: subtitle.trim(), image } });
      invalidateCatalog();
      toast.ok("Banner guardado");
      router.invalidate();
    } catch (e) {
      toast.error(e);
    }
    setBusy(false);
  }

  return (
    <div>
      {toast.node}
      <PageTitle title="Banner principal" subtitle="Lo primero que ven al entrar a la tienda." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4">
          <Field label="Título" htmlFor="t" hint="Vacío = texto de fábrica.">
            <TextArea
              id="t"
              rows={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={DEFAULT_HERO_TITLE}
            />
          </Field>
          <Field label="Subtítulo" htmlFor="s">
            <TextInput
              id="s"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder={DEFAULT_HERO_SUBTITLE}
            />
          </Field>
          <div>
            <p className="mb-1 text-sm font-semibold">Imagen</p>
            <p className="mb-3 text-sm text-muted-foreground">
              Ideal horizontal (1600 × 1008). Dejá el lado izquierdo más oscuro o vacío: ahí va el
              texto. Se recorta y achica sola.
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-5 font-semibold hover:border-primary">
                <ImageUp className="h-5 w-5" /> Subir imagen
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => void onFile(e.target.files?.[0])}
                />
              </label>
              {image && (
                <Button variant="secondary" onClick={() => setImage(null)}>
                  <RotateCcw className="h-4 w-4" /> Volver a la original
                </Button>
              )}
            </div>
          </div>
          <Button onClick={onSave} disabled={busy} className="w-full">
            <Save className="h-5 w-5" /> Guardar banner
          </Button>
        </Card>

        <Card>
          <p className="mb-2 text-sm font-semibold">Vista previa</p>
          <div className="surface-ink relative isolate overflow-hidden rounded-xl">
            <img
              src={image?.sm ?? defaultHero}
              alt=""
              className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
            <div className="p-6">
              <p className="eyebrow text-accent">Nexos · Córdoba</p>
              <p className="mt-2 font-display text-2xl font-extrabold leading-tight">
                {title || DEFAULT_HERO_TITLE}
              </p>
              <p className="mt-3 inline-block rounded-lg bg-success px-3 py-1.5 text-sm font-extrabold uppercase text-white">
                6 cuotas sin interés
              </p>
              <p className="mt-3 text-sm opacity-90">{subtitle || DEFAULT_HERO_SUBTITLE}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
