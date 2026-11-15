import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/site/Breadcrumbs";
import politica from "@/data/politica-privacidad.json";
import { absoluteUrl } from "@/lib/products";

const TITLE = "Política de Privacidad | Nexos";
const DESCRIPTION =
  "Cómo Nexos y Nexgo recopilan, utilizan y protegen los datos personales de sus clientes.";

type Block = {
  k: "title" | "subtitle" | "meta" | "h2" | "p" | "li" | "em" | "email";
  t: string;
};

export const Route = createFileRoute("/politica-de-privacidad")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: absoluteUrl("/politica-de-privacidad") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/politica-de-privacidad") }],
    scripts: [breadcrumbJsonLd([{ name: "Política de privacidad" }])],
  }),
  component: PoliticaPrivacidad,
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
    if (b.k === "title" || b.k === "subtitle" || b.k === "meta") return;
    if (b.k === "h2") {
      out.push(
        <h2
          key={i}
          className="mt-10 border-t border-border pt-8 text-xl font-extrabold text-foreground first:mt-0 first:border-0 first:pt-0"
        >
          {b.t}
        </h2>,
      );
      return;
    }
    if (b.k === "em") {
      out.push(
        <p key={i} className="mt-3 italic">
          {b.t}
        </p>,
      );
      return;
    }
    if (b.k === "email") {
      out.push(
        <p key={i} className="mt-3 font-semibold text-foreground">
          Correo electrónico:{" "}
          <a href={`mailto:${b.t}`} className="text-primary underline-offset-2 hover:underline">
            {b.t}
          </a>
        </p>,
      );
      return;
    }
    if (b.t.startsWith("Sitio web: ")) {
      const url = b.t.slice("Sitio web: ".length);
      out.push(
        <p key={i} className="mt-3">
          <span className="italic">Sitio web:</span>{" "}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            {url}
          </a>
        </p>,
      );
      return;
    }
    out.push(
      <p key={i} className="mt-3">
        {b.t}
      </p>,
    );
  });
  flush();
  return out;
}

function PoliticaPrivacidad() {
  const blocks = politica as Block[];
  const title = blocks.find((b) => b.k === "title")?.t ?? "Política de Privacidad";
  const subtitle = blocks.find((b) => b.k === "subtitle")?.t;
  const meta = blocks.find((b) => b.k === "meta")?.t;
  const body = blocks.filter((b) => !["title", "subtitle", "meta"].includes(b.k));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumbs items={[{ name: "Política de privacidad" }]} />
      <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">{title}</h1>
      {(subtitle || meta) && (
        <div className="mt-4 space-y-1 text-lg italic text-muted-foreground">
          {subtitle && <p>{subtitle}</p>}
          {meta && <p>{meta}</p>}
        </div>
      )}

      <article className="mt-8 rounded-3xl border border-border bg-card p-6 leading-relaxed text-muted-foreground sm:p-10">
        {renderBlocks(body)}
      </article>

      <div className="mt-8 flex flex-col items-start gap-3 rounded-2xl bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold">¿Consultas sobre privacidad o tus datos personales?</p>
        <a
          href="mailto:nexoscba.arg@gmail.com"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 font-semibold text-primary-foreground hover:opacity-90"
        >
          nexoscba.arg@gmail.com
        </a>
      </div>
    </div>
  );
}
