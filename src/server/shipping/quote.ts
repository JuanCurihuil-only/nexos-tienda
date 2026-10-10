import { env } from "../env";
import { andreani } from "./andreani";
import { correoArgentino } from "./correo-argentino";
import { buildShipment, normalizePostalCode, type QuoteLine } from "./parcels";
import type { ShippingProvider, ShippingRate } from "./types";

const providers: ShippingProvider[] = [correoArgentino, andreani];

function publicError(provider: ShippingProvider, error: unknown) {
  const detail = error instanceof Error ? error.message : "";
  console.error(`[shipping] ${provider.id}`, error);
  if (/token 401|token 403|cotización 401|cotización 403/.test(detail)) {
    return `${provider.label} rechazó las credenciales.`;
  }
  if (detail && !detail.startsWith("token") && !detail.startsWith("cotización")) return detail;
  return `${provider.label} no pudo cotizar este envío.`;
}

export async function quoteShipment(input: {
  items: QuoteLine[];
  method: "transferencia" | "mercadopago";
  postalCode: string;
}): Promise<{ rates: ShippingRate[]; notices: string[] }> {
  const destination = normalizePostalCode(input.postalCode);
  if (!destination) throw new Error("El código postal tiene que tener 4 números.");

  const origin = normalizePostalCode(env("SHIPPING_ORIGIN_POSTAL_CODE") ?? "");
  if (!origin) throw new Error("Falta el código postal de origen del envío.");

  const { parcels } = buildShipment(input.items, input.method);
  const active = providers.filter((provider) => provider.isConfigured());
  if (active.length === 0) {
    throw new Error("El envío todavía no está configurado. Escribinos por WhatsApp.");
  }

  const settled = await Promise.all(
    active.map(async (provider) => {
      try {
        const rates = await provider.quote({
          originPostalCode: origin,
          destinationPostalCode: destination,
          parcels,
        });
        return { rates, notice: undefined as string | undefined };
      } catch (error) {
        return { rates: [] as ShippingRate[], notice: publicError(provider, error) };
      }
    }),
  );

  const rates = settled
    .flatMap((result) => result.rates)
    .sort((a, b) => a.price - b.price || a.label.localeCompare(b.label, "es"));
  const notices = settled.flatMap((result) => (result.notice ? [result.notice] : []));
  if (rates.length === 0) {
    throw new Error(notices[0] ?? "No hay una tarifa de envío para ese código postal.");
  }
  return { rates, notices };
}

export async function pricedRate(
  input: {
    items: QuoteLine[];
    method: "transferencia" | "mercadopago";
    postalCode: string;
  },
  rateId: string,
) {
  const { rates } = await quoteShipment(input);
  const rate = rates.find((entry) => entry.id === rateId);
  if (!rate) throw new Error("La cotización cambió. Volvé a elegir el envío.");
  return rate;
}
