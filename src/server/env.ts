/**
 * Lectura de variables de entorno del lado del servidor.
 * En desarrollo se cargan del archivo .env (ver .env.example).
 * En producción se configuran en el panel del hosting.
 */
import { readFileSync } from "node:fs";

let loaded = false;

function loadLocalEnv() {
  if (loaded) return;
  loaded = true;
  try {
    const text = readFileSync(".env", "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]?.trim()) process.env[key] = value;
    }
  } catch {
    /* sin archivo .env: se usan las variables del sistema */
  }
}

export function env(name: string): string | undefined {
  loadLocalEnv();
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export function requireEnv(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`Falta configurar la variable de entorno ${name} (ver .env.example)`);
  return v;
}

/** URL pública del sitio (para las vueltas de Mercado Pago y el webhook). */
export function publicUrl(fallbackOrigin?: string) {
  return (env("PUBLIC_SITE_URL") ?? fallbackOrigin ?? "http://localhost:8080").replace(/\/$/, "");
}
