import { env } from "../env";
import type { ShippingProvider, ShippingQuoteRequest, ShippingRate } from "./types";

const PROD = "https://apis.andreani.com";
const TEST = "https://apisqa.andreani.com";

let token: { value: string; expiresAt: number } | null = null;

function baseUrl() {
  return env("ANDREANI_SANDBOX") === "true" ? TEST : PROD;
}

function credentials() {
  const user = env("ANDREANI_USER");
  const password = env("ANDREANI_PASSWORD");
  const client = env("ANDREANI_CLIENT");
  const contract = env("ANDREANI_CONTRACT_HOME");
  if (!user || !password || !client || !contract) return null;
  return { user, password, client, contract };
}

async function login(user: string, password: string) {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value;
  const res = await fetch(`${baseUrl()}/login`, {
    headers: { Authorization: `Basic ${btoa(`${user}:${password}`)}` },
  });
  const access = res.headers.get("x-authorization-token");
  if (!res.ok || !access) throw new Error(`token ${res.status}`);
  token = { value: access, expiresAt: Date.now() + 12 * 60 * 60_000 };
  return access;
}

function money(value: unknown) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export const andreani: ShippingProvider = {
  id: "andreani",
  label: "Andreani",
  isConfigured: () => credentials() != null,
  async quote(request: ShippingQuoteRequest): Promise<ShippingRate[]> {
    const creds = credentials();
    if (!creds) return [];

    const params = new URLSearchParams({
      cpDestino: request.destinationPostalCode,
      cliente: creds.client,
      contrato: creds.contract,
    });
    let index = 0;
    for (const parcel of request.parcels) {
      const volume = Math.ceil(parcel.heightCm * parcel.widthCm * parcel.lengthCm);
      for (let copy = 0; copy < parcel.quantity; copy++) {
        if (index >= 30) throw new Error("Andreani acepta hasta 30 bultos por envío.");
        params.set(`bultos[${index}][volumen]`, String(volume));
        params.set(`bultos[${index}][kilos]`, parcel.weightKg.toFixed(2));
        params.set(`bultos[${index}][valorDeclarado]`, String(Math.max(1, Math.round(parcel.declaredValue))));
        index++;
      }
    }

    const access = await login(creds.user, creds.password);
    const res = await fetch(`${baseUrl()}/v1/tarifas?${params.toString()}`, {
      headers: { "x-authorization-token": access },
    });
    if (!res.ok) throw new Error(`cotización ${res.status}`);
    const body = (await res.json()) as
      | { tarifaConIva?: { total?: string | number } }
      | { tarifaConIva?: { total?: string | number } }[];
    const rows = Array.isArray(body) ? body : [body];
    const total = rows.reduce((sum, row) => sum + money(row.tarifaConIva?.total), 0);
    if (total <= 0) return [];

    const rate: ShippingRate = {
      id: "andreani:domicilio",
      provider: "andreani",
      service: "domicilio",
      label: "Andreani — envío a domicilio",
      price: Math.round(total),
    };
    return [rate];
  },
};
