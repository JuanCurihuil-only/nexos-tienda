import { env } from "../env";
import type { ShippingProvider, ShippingQuoteRequest, ShippingRate } from "./types";

const PROD = "https://api.correoargentino.com.ar/micorreo/v1";
const TEST = "https://apitest.correoargentino.com.ar/micorreo/v1";

type Token = { value: string; expiresAt: number };
let token: Token | null = null;

function baseUrl() {
  return env("CORREO_SANDBOX") === "true" ? TEST : PROD;
}

function credentials() {
  const user = env("CORREO_USER");
  const password = env("CORREO_PASSWORD");
  const customerId = env("CORREO_CUSTOMER_ID");
  if (!user || !password || !customerId) return null;
  return { user, password, customerId };
}

async function login(user: string, password: string) {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value;
  const res = await fetch(`${baseUrl()}/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${user}:${password}`)}` },
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const body = (await res.json()) as { token?: string; expires?: string };
  if (!body.token) throw new Error("token vacío");
  const expiresAt = body.expires ? Date.parse(body.expires) : Date.now() + 20 * 60_000;
  token = { value: body.token, expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + 20 * 60_000 };
  return body.token;
}

function grams(weightKg: number) {
  return Math.max(1, Math.round(weightKg * 1000));
}

export const correoArgentino: ShippingProvider = {
  id: "correo-argentino",
  label: "Correo Argentino",
  isConfigured: () => credentials() != null,
  async quote(request: ShippingQuoteRequest): Promise<ShippingRate[]> {
    const creds = credentials();
    if (!creds) return [];
    for (const parcel of request.parcels) {
      if (grams(parcel.weightKg) > 25_000) {
        throw new Error("Correo Argentino acepta hasta 25 kg por bulto.");
      }
      if (parcel.heightCm > 150 || parcel.widthCm > 150 || parcel.lengthCm > 150) {
        throw new Error("Correo Argentino acepta hasta 150 cm por lado.");
      }
    }

    const access = await login(creds.user, creds.password);
    const res = await fetch(`${baseUrl()}/rates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerId: creds.customerId,
        postalCodeOrigin: request.originPostalCode,
        postalCodeDestination: request.destinationPostalCode,
        deliveredType: "D",
        dimensions: request.parcels.map((parcel) => ({
          weight: grams(parcel.weightKg),
          height: Math.ceil(parcel.heightCm),
          width: Math.ceil(parcel.widthCm),
          length: Math.ceil(parcel.lengthCm),
          quantity: parcel.quantity,
        })),
      }),
    });
    if (!res.ok) throw new Error(`cotización ${res.status}`);
    const body = (await res.json()) as {
      rates?: { deliveredType?: string; productType?: string; productName?: string; price?: number; deliveryTimeMin?: string; deliveryTimeMax?: string }[];
    };

    return (body.rates ?? [])
      .filter((rate) => rate.deliveredType !== "S" && rate.productType && Number(rate.price) > 0)
      .map((rate) => ({
        id: `correo-argentino:${rate.productType}`,
        provider: "correo-argentino",
        service: rate.productType!,
        label: rate.productName?.trim() || "Correo Argentino",
        price: Math.round(Number(rate.price)),
        ...(rate.deliveryTimeMin && rate.deliveryTimeMax
          ? { detail: `${rate.deliveryTimeMin} a ${rate.deliveryTimeMax} días hábiles` }
          : {}),
      }));
  },
};
