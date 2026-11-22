/**
 * Firestore + Storage access for the store.
 * Catalog, descriptions and orders live in Firestore.
 * Admin-uploaded photos live in Storage under media/.
 * The first successful read seeds from .data/ (or src/data/) once.
 */
import type { DocumentData, WriteBatch } from "firebase-admin/firestore";
import seedCategories from "../data/categories.json";
import seedDescriptions from "../data/descriptions.json";
import seedProducts from "../data/products.json";
import {
  normalizeDiscountPercent,
  packageMeasure,
  type CatalogData,
  type Category,
  type RawProduct,
  type StoreSettings,
} from "../lib/products";
import { db, mediaBucket } from "./firebase";
import type { Order } from "./orders";

const BATCH_LIMIT = 400;

let dataReady: Promise<void> | null = null;

async function fs() {
  const [{ promises }, path] = await Promise.all([import("node:fs"), import("node:path")]);
  return { fsp: promises, path };
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  const { fsp } = await fs();
  try {
    return JSON.parse(await fsp.readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

/** No-op kept for call sites that used to wait on SQL DDL. */
export async function ensureSchema() {
  db();
}

export function ensureData() {
  if (!dataReady) {
    dataReady = seedIfNeeded().catch((error: unknown) => {
      dataReady = null;
      throw error;
    });
  }
  return dataReady;
}

async function seedIfNeeded() {
  await ensureSchema();
  const meta = await db().collection("meta").doc("catalog").get();
  if (meta.exists && meta.data()?.seeded === true) return;

  const catalog = await loadCatalogFiles();
  const descriptions = await loadDescriptionFiles();
  await saveCatalog(catalog);
  await saveDescriptions(descriptions);
  await importOrderFiles();
  await db().collection("meta").doc("catalog").set({ seeded: true, at: new Date().toISOString() });
}

async function loadCatalogFiles(): Promise<CatalogData> {
  const { path } = await fs();
  const fromDisk = await readJsonFile<CatalogData>(path.join(process.cwd(), ".data", "catalogo.json"));
  if (fromDisk?.products && fromDisk.categories) {
    return { products: fromDisk.products, categories: fromDisk.categories, settings: fromDisk.settings ?? {} };
  }
  // Bundled seed — works on Vercel where src/data may not exist on disk.
  return {
    products: seedProducts as RawProduct[],
    categories: seedCategories as Category[],
    settings: {},
  };
}

async function loadDescriptionFiles(): Promise<Record<string, string[]>> {
  const { path } = await fs();
  const fromDisk = await readJsonFile<Record<string, string[]>>(
    path.join(process.cwd(), ".data", "descripciones.json"),
  );
  if (fromDisk) return fromDisk;
  return seedDescriptions as Record<string, string[]>;
}

async function importOrderFiles() {
  const { fsp, path } = await fs();
  const dir = path.join(process.cwd(), ".data", "pedidos");
  let files: string[] = [];
  try {
    files = (await fsp.readdir(dir)).filter((file) => /^NX-.*\.json$/.test(file));
  } catch {
    return;
  }
  for (const file of files) {
    const order = await readJsonFile<Order>(path.join(dir, file));
    if (order?.id) await persistOrder(order);
  }
}

async function commitBatches(ops: Array<(batch: WriteBatch) => void>) {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = db().batch();
    for (const op of ops.slice(i, i + BATCH_LIMIT)) op(batch);
    await batch.commit();
  }
}

function productDoc(product: RawProduct, position: number) {
  return {
    slug: product.slug,
    name: product.name,
    brand: product.brand ?? null,
    category: product.category,
    priceCard: product.priceCard ?? null,
    priceTransfer: product.priceTransfer ?? null,
    stock: product.stock,
    available: product.available,
    short: product.short ?? "",
    images: product.images ?? [],
    variants: product.variants ?? [],
    weightKg: packageMeasure(product.weightKg),
    heightCm: packageMeasure(product.heightCm),
    widthCm: packageMeasure(product.widthCm),
    lengthCm: packageMeasure(product.lengthCm),
    position,
  };
}

function categoryDoc(category: Category, position: number) {
  return {
    slug: category.slug,
    name: category.name,
    parent: category.parent ?? null,
    seoTitle: category.seoTitle ?? "",
    seoDescription: category.seoDescription ?? "",
    intro: category.intro ?? "",
    position,
  };
}

export async function saveCatalog(data: CatalogData) {
  await ensureSchema();
  const firestore = db();
  const productSlugs = new Set(data.products.map((p) => p.slug));
  const categorySlugs = new Set(data.categories.map((c) => c.slug));

  const [existingProducts, existingCategories] = await Promise.all([
    firestore.collection("products").select().get(),
    firestore.collection("categories").select().get(),
  ]);

  const ops: Array<(batch: WriteBatch) => void> = [];

  for (const doc of existingProducts.docs) {
    if (!productSlugs.has(doc.id)) {
      ops.push((batch) => batch.delete(doc.ref));
    }
  }
  for (const doc of existingCategories.docs) {
    if (!categorySlugs.has(doc.id)) {
      ops.push((batch) => batch.delete(doc.ref));
    }
  }

  data.products.forEach((product, position) => {
    const ref = firestore.collection("products").doc(product.slug);
    const payload = productDoc(product, position);
    ops.push((batch) => batch.set(ref, payload));
  });

  data.categories.forEach((category, position) => {
    const ref = firestore.collection("categories").doc(category.slug);
    const payload = categoryDoc(category, position);
    ops.push((batch) => batch.set(ref, payload));
  });

  const settingsRef = firestore.collection("settings").doc("store");
  ops.push((batch) =>
    batch.set(settingsRef, {
      hero: data.settings.hero ?? {},
      transferDiscount: data.settings.transferDiscount ?? null,
    }),
  );

  await commitBatches(ops);
}

export async function fetchCatalog(): Promise<CatalogData> {
  await ensureSchema();
  const firestore = db();
  const [productSnap, categorySnap, settingsSnap] = await Promise.all([
    firestore.collection("products").orderBy("position").get(),
    firestore.collection("categories").orderBy("position").get(),
    firestore.collection("settings").doc("store").get(),
  ]);

  const stored = settingsSnap.data() as
    | { hero?: StoreSettings["hero"]; transferDiscount?: number | null }
    | undefined;
  const hero = stored?.hero;
  const rawDiscount = stored?.transferDiscount;
  const storedDiscount =
    rawDiscount == null || rawDiscount === "" ? Number.NaN : Number(rawDiscount);
  const settings: StoreSettings = {
    ...(hero && Object.keys(hero).length > 0 ? { hero } : {}),
    ...(Number.isFinite(storedDiscount)
      ? { transferDiscount: normalizeDiscountPercent(storedDiscount) }
      : {}),
  };

  const products: RawProduct[] = productSnap.docs.map((doc) => {
    const product = doc.data();
    return {
      slug: product.slug ?? doc.id,
      name: product.name,
      brand: product.brand ?? null,
      category: product.category,
      priceCard: product.priceCard ?? null,
      priceTransfer: product.priceTransfer ?? null,
      stock: product.stock,
      available: product.available,
      short: product.short ?? "",
      images: product.images ?? [],
      variants: product.variants ?? [],
      weightKg: packageMeasure(product.weightKg),
      heightCm: packageMeasure(product.heightCm),
      widthCm: packageMeasure(product.widthCm),
      lengthCm: packageMeasure(product.lengthCm),
    };
  });

  const categories: Category[] = categorySnap.docs.map((doc) => {
    const category = doc.data();
    return {
      slug: category.slug ?? doc.id,
      name: category.name,
      ...(category.parent ? { parent: category.parent } : {}),
      seoTitle: category.seoTitle ?? "",
      seoDescription: category.seoDescription ?? "",
      intro: category.intro ?? "",
    };
  });

  return { products, categories, settings };
}

export async function saveDescriptions(descriptions: Record<string, string[]>) {
  await ensureSchema();
  const firestore = db();
  const existing = await firestore.collection("descriptions").select().get();
  const keep = new Set(Object.keys(descriptions));
  const ops: Array<(batch: WriteBatch) => void> = [];

  for (const doc of existing.docs) {
    if (!keep.has(doc.id)) ops.push((batch) => batch.delete(doc.ref));
  }
  for (const [slug, lines] of Object.entries(descriptions)) {
    const ref = firestore.collection("descriptions").doc(slug);
    ops.push((batch) => batch.set(ref, { lines: lines ?? [] }));
  }
  await commitBatches(ops);
}

export async function fetchDescriptions(): Promise<Record<string, string[]>> {
  await ensureSchema();
  const snap = await db().collection("descriptions").get();
  const descriptions: Record<string, string[]> = {};
  for (const doc of snap.docs) {
    descriptions[doc.id] = (doc.data().lines as string[]) ?? [];
  }
  return descriptions;
}

function mapOrder(id: string, data: DocumentData): Order {
  return {
    id,
    createdAt: String(data.createdAt),
    updatedAt: String(data.updatedAt),
    status: data.status,
    method: data.method,
    items: data.items ?? [],
    total: data.total,
    customer: data.customer,
    ...(data.mp ? { mp: data.mp } : {}),
    history: data.history ?? [],
    stockApplied: data.stockApplied === true,
    ...(data.shipping ? { shipping: data.shipping } : {}),
  };
}

export async function persistOrder(order: Order) {
  await ensureSchema();
  const payload = {
    id: order.id,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    status: order.status,
    method: order.method,
    items: order.items,
    total: order.total,
    customer: order.customer,
    shipping: order.shipping ?? null,
    mp: order.mp ?? null,
    history: order.history ?? [],
    stockApplied: order.stockApplied === true,
  };
  await db().collection("orders").doc(order.id).set(payload, { merge: true });
}

/** Marks the order so stock is taken only once, even if the confirmation runs twice. */
export async function claimOrderStock(id: string): Promise<boolean> {
  await ensureSchema();
  const ref = db().collection("orders").doc(id);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    if (snap.data()?.stockApplied === true) return false;
    tx.set(ref, { stockApplied: true, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  });
}

/** Clears the stock mark so a cancelled sale can be restored only once. */
export async function releaseOrderStock(id: string): Promise<boolean> {
  await ensureSchema();
  const ref = db().collection("orders").doc(id);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    if (snap.data()?.stockApplied !== true) return false;
    tx.set(ref, { stockApplied: false, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  });
}

/** Fotos del panel. Van en Storage porque el hosting no deja crear carpetas en disco. */
export async function saveMediaBlob(name: string, contentType: string, base64: string) {
  await ensureSchema();
  const buffer = Buffer.from(base64.replace(/\s/g, ""), "base64");
  const file = mediaBucket().file(`media/${name}`);
  await file.save(buffer, {
    contentType,
    resumable: false,
    metadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
  });
}

export async function readMediaBlob(
  name: string,
): Promise<{ contentType: string; base64: string } | null> {
  await ensureSchema();
  const file = mediaBucket().file(`media/${name}`);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [buffer] = await file.download();
  const [metadata] = await file.getMetadata();
  const contentType =
    (typeof metadata.contentType === "string" && metadata.contentType) || "application/octet-stream";
  return { contentType, base64: buffer.toString("base64") };
}

/** Todas las fotos del panel (para respaldo / migración). */
export async function fetchAllMedia(): Promise<
  { name: string; contentType: string; base64: string }[]
> {
  await ensureSchema();
  const [files] = await mediaBucket().getFiles({ prefix: "media/" });
  const out: { name: string; contentType: string; base64: string }[] = [];
  for (const file of files) {
    if (file.name.endsWith("/")) continue;
    const name = file.name.replace(/^media\//, "");
    if (!name || name.includes("/")) continue;
    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    const contentType =
      (typeof metadata.contentType === "string" && metadata.contentType) || "application/octet-stream";
    out.push({ name, contentType, base64: buffer.toString("base64") });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export async function deleteOrder(id: string) {
  await ensureSchema();
  await db().collection("orders").doc(id).delete();
}

export async function fetchOrder(id: string): Promise<Order | null> {
  await ensureSchema();
  const snap = await db().collection("orders").doc(id).get();
  if (!snap.exists) return null;
  return mapOrder(snap.id, snap.data()!);
}

export async function fetchOrders(): Promise<Order[]> {
  await ensureSchema();
  const snap = await db().collection("orders").orderBy("createdAt", "desc").get();
  return snap.docs.map((doc) => mapOrder(doc.id, doc.data()));
}
