import { redirect } from "@tanstack/react-router";

/** Categorías de la tienda vieja (Tiendanube) → categorías nuevas. */
const LEGACY: Record<string, string> = {
  herramientas: "herramientas",
  "herramientas-a-bateria": "herramientas-a-bateria",
  "kit-de-herramientas-a-bateria": "kits-herramientas-a-bateria",
  "herramientas-a-bateria-individuales": "herramientas-a-bateria",
  baterias: "baterias",
  "herramientas-manuales": "herramientas-manuales",
  electronica: "electronica",
  auriculares: "auriculares",
  "consolas-de-video-juegos": "consolas-y-gaming",
  smartwatch: "smartwatch",
};

/** Redirige (301) una URL vieja de categoría a la nueva. */
export function legacyCategoryRedirect(root: string, splat: string | undefined): never {
  const last = (splat ?? "").split("/").filter(Boolean).pop() ?? root;
  const slug = LEGACY[last] ?? root;
  throw redirect({ to: "/categoria/$slug", params: { slug }, statusCode: 301 });
}
