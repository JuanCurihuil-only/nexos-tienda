import { createServerFn } from "@tanstack/react-start";
import { setCatalog, type CatalogData } from "./products";

/** Catálogo público (productos, categorías y ajustes) leído desde el almacenamiento. */
export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { readCatalog } = await import("@/server/store");
  return (await readCatalog()) as CatalogData;
});

let lastLoad = 0;
let current: CatalogData | null = null;
const CLIENT_TTL_MS = 30_000;

/**
 * Se llama antes de mostrar cualquier página. En el navegador se reutiliza
 * durante 30 segundos para no pedirlo en cada clic.
 */
export async function ensureCatalog(): Promise<CatalogData> {
  const isBrowser = typeof window !== "undefined";
  if (isBrowser && current && Date.now() - lastLoad < CLIENT_TTL_MS) return current;
  const data = await getCatalog();
  current = data;
  lastLoad = Date.now();
  setCatalog(data);
  return data;
}

/** Usado al hidratar la página con los datos que ya mandó el servidor. */
export function hydrateCatalog(data: CatalogData) {
  if (current === data) return;
  current = data;
  lastLoad = Date.now();
  setCatalog(data);
}

/** Después de guardar algo en el panel, forzar que se vuelva a leer. */
export function invalidateCatalog() {
  lastLoad = 0;
}
