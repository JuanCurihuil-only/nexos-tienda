import { deleteOrder, ensureData, fetchOrder, fetchOrders, persistOrder } from "./db";

export type OrderStatus =
  | "pendiente_transferencia"
  | "pendiente_pago"
  | "pagado"
  | "enviado"
  | "rechazado"
  | "cancelado";

export type PaymentMethod = "transferencia" | "mercadopago";

export type OrderItem = {
  slug: string;
  name: string;
  variant?: string | undefined;
  qty: number;
  unitPrice: number;
};

export type Customer = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  dni?: string | undefined;
  entrega: "envio" | "retiro";
  direccion?: string | undefined;
  ciudad?: string | undefined;
  provincia?: string | undefined;
  cp?: string | undefined;
  notas?: string | undefined;
};

export type Order = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  method: PaymentMethod;
  items: OrderItem[];
  total: number;
  customer: Customer;
  mp?: { preferenceId?: string; paymentId?: string; status?: string; statusDetail?: string };
  history: { at: string; status: OrderStatus; note?: string }[];
  /** Units were already taken from product stock. */
  stockApplied?: boolean;
};

export function newOrderId() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = crypto
    .getRandomValues(new Uint32Array(1))[0]!
    .toString(36)
    .toUpperCase()
    .padStart(6, "0")
    .slice(-6);
  return `NX-${ymd}-${rnd}`;
}

const validId = (id: string) => /^NX-\d{8}-[A-Z0-9]{6}$/.test(id);

export async function saveOrder(order: Order) {
  order.updatedAt = new Date().toISOString();
  await ensureData();
  await persistOrder(order);
}

export async function getOrder(id: string): Promise<Order | null> {
  if (!validId(id)) return null;
  await ensureData();
  return fetchOrder(id);
}

export async function setStatus(order: Order, status: OrderStatus, note?: string) {
  if (order.status === status) return order;
  if (order.status === "pagado" && !["cancelado", "enviado"].includes(status)) return order;
  const { syncOrderStock } = await import("./stock");
  const stock = await syncOrderStock(order, status);
  const stockNote =
    stock === "deducted" ? "Stock descontado" : stock === "restored" ? "Stock repuesto" : "";
  const fullNote = [note, stockNote].filter(Boolean).join(". ");
  order.status = status;
  order.history.push({
    at: new Date().toISOString(),
    status,
    ...(fullNote ? { note: fullNote } : {}),
  });
  await saveOrder(order);
  console.log(`[pedidos] ${order.id} → ${status}${fullNote ? ` (${fullNote})` : ""}`);
  return order;
}

export async function removeOrder(id: string) {
  const order = await getOrder(id);
  if (!order) throw new Error("Pedido no encontrado");
  if (order.stockApplied) {
    const { syncOrderStock } = await import("./stock");
    await syncOrderStock(order, "cancelado");
  }
  await deleteOrder(order.id);
}

export async function listOrders(): Promise<Order[]> {
  await ensureData();
  return fetchOrders();
}
