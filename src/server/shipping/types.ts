/** One physical box. Quantity is how many identical boxes go in the shipment. */
export type ShippingParcel = {
  weightKg: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
  /** Merchandise value of a single box, in ARS. */
  declaredValue: number;
  quantity: number;
};

export type ShippingQuoteRequest = {
  originPostalCode: string;
  destinationPostalCode: string;
  parcels: ShippingParcel[];
};

/** A priced service the customer can pick. `id` is stable (`provider:service`). */
export type ShippingRate = {
  id: string;
  provider: string;
  service: string;
  label: string;
  price: number;
  detail?: string;
};

export type ShippingProvider = {
  id: string;
  label: string;
  isConfigured(): boolean;
  quote(request: ShippingQuoteRequest): Promise<ShippingRate[]>;
};
