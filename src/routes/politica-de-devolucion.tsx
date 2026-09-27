import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { WhatsAppIcon } from "@/components/site/BrandIcons";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/site/Breadcrumbs";
import politica from "@/data/politica-devolucion.json";
import { absoluteUrl, whatsappLink } from "@/lib/products";

/**
 * Texto copiado tal cual de https://nexoscba.com/politica-de-devolucion/
 * (src/data/politica-devolucion.json). Misma URL que en Tiendanube.
 */
const TITLE = "Políticas de cambios y devoluciones | Nexos";
const DESCRIPTION =
  "Condiciones de Nexos para cambios, devoluciones, derecho de arrepentimiento, productos con fallas y costos de envío.";

type Block = { k: "title" | "h2" | "p" | "li"; t: string };

export const Route = createFileRoute("/politica-de-devolucion")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: absoluteUrl("/politica-de-devolucion") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/politica-de-devolucion") }],
    scripts: [breadcrumbJsonLd([{ name: "Política de devolución" }])],
  }),
  component: Politica,
});

function renderBlocks(blocks: Block[]) {
  const out: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={`ul-${out.length}`} className="mt-3 space-y-2">
          {list.map((t, i) => (
            <li key={i} className="flex gap-3">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{t}</span>
            </li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  blocks.forEach((b, i) => {
    if (b.k === "li") {
      list.push(b.t);
      return;
    }
    flush();
    if (b.k === "title") return; // se usa como <h1>
    if (b.k === "h2")
      out.push(
        <h2
          key={i}
          className="mt-10 border-t border-border pt-8 text-xl font-extrabold text-foreground first:mt-0 first:border-0 first:pt-0"
        >
          {b.t}
        </h2>,
      );
    else
      out.push(
        <p key={i} className="mt-3">
          {b.t}
        </p>,
      );
  });
  flush();
  return out;
}

function Politica() {
  const blocks = politica as Block[];
  const title = blocks.find((b) => b.k === "title")?.t ?? "Políticas de Cambios y Devoluciones";
  const [intro, ...rest] = blocks.filter((b) => b.k !== "title");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumbs items={[{ name: "Política de devolución" }]} />
      <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">{title}</h1>
      {intro && <p className="mt-4 text-lg text-muted-foreground">{intro.t}</p>}

      <article className="mt-8 rounded-3xl border border-border bg-card p-6 leading-relaxed text-muted-foreground sm:p-10">
        {renderBlocks(rest)}
      </article>

      <div className="mt-8 flex flex-col items-start gap-3 rounded-2xl bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold">¿Necesitás iniciar un cambio o devolución?</p>
        <a
          href={whatsappLink(
            "Hola Nexos! Quiero iniciar un cambio/devolución. Mi número de pedido es: ",
          )}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1a7f45] px-5 font-semibold text-white hover:bg-[#156b3a]"
        >
          <WhatsAppIcon className="h-5 w-5" />
          Escribinos por WhatsApp
        </a>
      </div>
    </div>
  );
}
