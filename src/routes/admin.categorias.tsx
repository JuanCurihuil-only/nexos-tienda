import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  Button,
  Card,
  Field,
  PageTitle,
  Select,
  TextArea,
  TextInput,
  useToast,
} from "@/components/admin/ui";
import { adminCategories, adminDeleteCategory, adminSaveCategory } from "@/lib/admin";
import { invalidateCatalog } from "@/lib/catalog";
import type { Category } from "@/lib/products";

export const Route = createFileRoute("/admin/categorias")({
  loader: () => adminCategories(),
  component: Categorias,
});

const EMPTY: Category = { slug: "", name: "", seoTitle: "", seoDescription: "", intro: "" };

function Editor({
  initial,
  parents,
  onDone,
}: {
  initial: Category;
  parents: Category[];
  onDone: (msg?: string) => void;
}) {
  const save = useServerFn(adminSaveCategory);
  const toast = useToast();
  const [c, setC] = useState<Category>(initial);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Category, v: string) => setC((prev) => ({ ...prev, [k]: v }));

  async function onSave() {
    setBusy(true);
    try {
      await save({
        data: {
          ...(initial.slug ? { originalSlug: initial.slug } : {}),
          name: c.name,
          ...(c.parent ? { parent: c.parent } : {}),
          seoTitle: c.seoTitle,
          seoDescription: c.seoDescription,
          intro: c.intro,
        },
      });
      invalidateCatalog();
      onDone("Categoría guardada");
    } catch (e) {
      toast.error(e);
    }
    setBusy(false);
  }

  return (
    <div className="mt-3 space-y-4 rounded-xl bg-surface p-4">
      {toast.node}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="cn">
          <TextInput id="cn" value={c.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Está dentro de" htmlFor="cp">
          <Select id="cp" value={c.parent ?? ""} onChange={(e) => set("parent", e.target.value)}>
            <option value="">Es una categoría principal</option>
            {parents
              .filter((p) => p.slug !== initial.slug)
              .map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
          </Select>
        </Field>
      </div>
      <Field
        label="Título para Google"
        htmlFor="ct"
        hint={`${c.seoTitle.length}/60 caracteres recomendados`}
      >
        <TextInput id="ct" value={c.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
      </Field>
      <Field
        label="Descripción para Google"
        htmlFor="cd"
        hint={`${c.seoDescription.length}/155 caracteres recomendados`}
      >
        <TextArea
          id="cd"
          rows={2}
          value={c.seoDescription}
          onChange={(e) => set("seoDescription", e.target.value)}
        />
      </Field>
      <Field label="Texto de introducción (se ve en la página)" htmlFor="ci">
        <TextArea id="ci" rows={3} value={c.intro} onChange={(e) => set("intro", e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onSave} disabled={busy || c.name.trim().length < 2}>
          <Save className="h-4 w-4" /> Guardar
        </Button>
        <Button variant="secondary" onClick={() => onDone()}>
          <X className="h-4 w-4" /> Cancelar
        </Button>
      </div>
    </div>
  );
}

function Categorias() {
  const { categories, counts } = Route.useLoaderData();
  const router = useRouter();
  const toast = useToast();
  const del = useServerFn(adminDeleteCategory);
  const [editing, setEditing] = useState<string | null>(null);
  const parents = categories.filter((c) => !c.parent);

  const done = (msg?: string) => {
    setEditing(null);
    if (msg) {
      toast.ok(msg);
      router.invalidate();
    }
  };

  async function onDelete(c: Category) {
    if (!window.confirm(`¿Borrar la categoría "${c.name}"?`)) return;
    try {
      await del({ data: c.slug });
      invalidateCatalog();
      toast.ok("Categoría borrada");
      router.invalidate();
    } catch (e) {
      toast.error(e);
    }
  }

  const row = (c: Category, sub = false) => {
    const count = sub
      ? (counts[c.slug] ?? 0)
      : categories
          .filter((x) => x.parent === c.slug)
          .reduce((a, x) => a + (counts[x.slug] ?? 0), counts[c.slug] ?? 0);
    return (
      <li key={c.slug} className={sub ? "ml-4 border-l-2 border-border pl-4" : ""}>
        <div className="flex flex-wrap items-center gap-3 py-3">
          <span className="min-w-0 flex-1">
            <span className={sub ? "font-semibold" : "text-lg font-bold"}>{c.name}</span>
            <span className="ml-2 text-sm text-muted-foreground">{count} productos</span>
          </span>
          <Button variant="secondary" onClick={() => setEditing(c.slug)} className="min-h-11 px-4">
            <Pencil className="h-4 w-4" /> Editar
          </Button>
          {count === 0 && (
            <Button variant="danger" onClick={() => onDelete(c)} className="min-h-11 px-4">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        {editing === c.slug && <Editor initial={c} parents={parents} onDone={done} />}
      </li>
    );
  };

  return (
    <div>
      {toast.node}
      <PageTitle
        title="Categorías"
        subtitle="Las categorías sin productos no se muestran como vacías: primero cargales productos."
        actions={
          <Button onClick={() => setEditing("__nueva")}>
            <Plus className="h-5 w-5" /> Nueva categoría
          </Button>
        }
      />
      {editing === "__nueva" && (
        <Card className="mb-5">
          <h2 className="text-lg font-bold">Nueva categoría</h2>
          <Editor initial={EMPTY} parents={parents} onDone={done} />
        </Card>
      )}
      <Card>
        <ul className="divide-y divide-border">
          {parents.map((p) => (
            <div key={p.slug}>
              {row(p)}
              <ul>{categories.filter((c) => c.parent === p.slug).map((c) => row(c, true))}</ul>
            </div>
          ))}
        </ul>
      </Card>
    </div>
  );
}
