/**
 * Lectura de variables de entorno del lado del servidor.
 * En desarrollo se cargan del archivo .env (ver .env.example).
 * En producción se configuran en el panel del hosting.
 */
let loaded = false;

export function env(name: string): string | undefined {
  if (!loaded) {
    loaded = true;
    try {
      const p = process as unknown as { loadEnvFile?: (path?: string) => void };
      p.loadEnvFile?.(".env");
    } catch {
      /* sin archivo .env: se usan las variables del sistema */
    }
  }
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
