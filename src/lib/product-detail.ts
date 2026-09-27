import { createServerFn } from "@tanstack/react-start";

/**
 * Las descripciones completas se leen solo en el servidor,
 * así no se suman al JavaScript que descarga cada visitante.
 */
export const getProductDescription = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const { readDescriptions } = await import("@/server/store");
    const all = await readDescriptions();
    return all[slug] ?? [];
  });
