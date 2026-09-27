/**
 * Neon Postgres access for the store.
 * Catalog, descriptions and orders live in the database.
 * The first successful read copies JSON from .data/ (or src/data/) once.
 */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import {
  normalizeDiscountPercent,
  type CatalogData,
  type Category,
  type RawProduct,
  type StoreSettings,
} from "../lib/products";
import type { Order } from "./orders";
import { env } from "./env";

type Sql = NeonQueryFunction<false, false>;

let client: Sql | null = null;
let schemaReady: Promise<void> | null = null;
let dataReady: Promise<void> | null = null;

function connectionString() {
  const raw = env("DATABASE_URL")?.replace(/^["']|["']$/g, "");
  if (!raw) {
    throw new Error("Missing DATABASE_URL environment variable (see .env.example)");
  }
  const url = new URL(raw);
  url.searchParams.delete("channel_binding");
  return url.toString();
}

function sql() {
  client ??= neon(connectionString());
  return client;
}

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

export function ensureSchema() {
  schemaReady ??= createTables().catch((error: unknown) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

async function createTables() {
  const query = sql();
  await query`
    CREATE TABLE IF NOT EXISTS categories (
      slug text PRIMARY KEY,
      name text NOT NULL,
      parent text,
      seo_title text NOT NULL DEFAULT '',
      seo_description text NOT NULL DEFAULT '',
      intro text NOT NULL DEFAULT '',
      position integer NOT NULL
    )
  `;
  await query`
    CREATE TABLE IF NOT EXISTS products (
      slug text PRIMARY KEY,
      name text NOT NULL,
      brand text,
      category text NOT NULL,
      price_card integer,
      price_transfer integer,
      stock integer NOT NULL,
      available boolean NOT NULL,
      short text NOT NULL DEFAULT '',
      images jsonb NOT NULL DEFAULT '[]'::jsonb,
      variants jsonb NOT NULL DEFAULT '[]'::jsonb,
      position integer NOT NULL
    )
  `;
  await query`
    CREATE TABLE IF NOT EXISTS store_settings (
      id text PRIMARY KEY,
      hero jsonb NOT NULL DEFAULT '{}'::jsonb,
      transfer_discount numeric(5, 2)
    )
  `;
  await query`
    CREATE TABLE IF NOT EXISTS product_descriptions (
      slug text PRIMARY KEY,
      lines jsonb NOT NULL
    )
  `;
  await query`
    CREATE TABLE IF NOT EXISTS orders (
      id text PRIMARY KEY,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL,
      status text NOT NULL,
      method text NOT NULL,
      items jsonb NOT NULL,
      total integer NOT NULL,
      customer jsonb NOT NULL,
      mp jsonb,
      history jsonb NOT NULL
    )
  `;
  await query`
    CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC)
  `;
  await query`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS price_transfer integer
  `;
  await query`
    ALTER TABLE store_settings
    ADD COLUMN IF NOT EXISTS transfer_discount numeric(5, 2)
  `;
  await query`
    ALTER TABLE store_settings
    ALTER COLUMN transfer_discount TYPE numeric(5, 2)
    USING transfer_discount::numeric(5, 2)
  `;
  await query`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS stock_applied boolean NOT NULL DEFAULT false
  `;
  await query`
    CREATE TABLE IF NOT EXISTS app_meta (
      key text PRIMARY KEY,
      value jsonb NOT NULL
    )
  `;
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
  const query = sql();
  const seeded = await query`SELECT key FROM app_meta WHERE key = 'catalog_seeded'`;
  if (seeded.length > 0) return;

  const catalog = await loadCatalogFiles();
  const descriptions = await loadDescriptionFiles();
  await saveCatalog(catalog);
  await saveDescriptions(descriptions);
  await importOrderFiles();
  await query`INSERT INTO app_meta (key, value) VALUES ('catalog_seeded', 'true'::jsonb)`;
}

async function loadCatalogFiles(): Promise<CatalogData> {
  const { path } = await fs();
  const fromDisk = await readJsonFile<CatalogData>(path.join(process.cwd(), ".data", "catalogo.json"));
  if (fromDisk?.products && fromDisk.categories) {
    return { products: fromDisk.products, categories: fromDisk.categories, settings: fromDisk.settings ?? {} };
  }
  const root = path.join(process.cwd(), "src", "data");
  const [products, categories] = await Promise.all([
    readJsonFile<RawProduct[]>(path.join(root, "products.json")),
    readJsonFile<Category[]>(path.join(root, "categories.json")),
  ]);
  return { products: products ?? [], categories: categories ?? [], settings: {} };
}

async function loadDescriptionFiles(): Promise<Record<string, string[]>> {
  const { path } = await fs();
  const fromDisk = await readJsonFile<Record<string, string[]>>(
    path.join(process.cwd(), ".data", "descripciones.json"),
  );
  if (fromDisk) return fromDisk;
  return (
    (await readJsonFile<Record<string, string[]>>(
      path.join(process.cwd(), "src", "data", "descriptions.json"),
    )) ?? {}
  );
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

export async function saveCatalog(data: CatalogData) {
  await ensureSchema();
  const query = sql();
  const productRows = data.products.map((product, position) => ({
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    price_card: product.priceCard,
    price_transfer: product.priceTransfer ?? null,
    stock: product.stock,
    available: product.available,
    short: product.short ?? "",
    images: product.images ?? [],
    variants: product.variants ?? [],
    position,
  }));
  const categoryRows = data.categories.map((category, position) => ({
    slug: category.slug,
    name: category.name,
    parent: category.parent ?? null,
    seo_title: category.seoTitle ?? "",
    seo_description: category.seoDescription ?? "",
    intro: category.intro ?? "",
    position,
  }));
  const hero = JSON.stringify(data.settings.hero ?? {});
  const transferDiscount = data.settings.transferDiscount ?? null;

  await query.transaction((txn) => {
    const statements = [
      txn`DELETE FROM products`,
      txn`DELETE FROM categories`,
      txn`
        INSERT INTO store_settings (id, hero, transfer_discount)
        VALUES ('store', ${hero}::jsonb, ${transferDiscount})
        ON CONFLICT (id) DO UPDATE SET
          hero = EXCLUDED.hero,
          transfer_discount = EXCLUDED.transfer_discount
      `,
    ];
    if (categoryRows.length > 0) {
      statements.push(txn`
        INSERT INTO categories (slug, name, parent, seo_title, seo_description, intro, position)
        SELECT slug, name, parent, seo_title, seo_description, intro, position
        FROM jsonb_to_recordset(${JSON.stringify(categoryRows)}::jsonb) AS row(
          slug text,
          name text,
          parent text,
          seo_title text,
          seo_description text,
          intro text,
          position int
        )
      `);
    }
    if (productRows.length > 0) {
      statements.push(txn`
        INSERT INTO products (
          slug, name, brand, category, price_card, price_transfer, stock, available, short, images, variants, position
        )
        SELECT slug, name, brand, category, price_card, price_transfer, stock, available, short, images, variants, position
        FROM jsonb_to_recordset(${JSON.stringify(productRows)}::jsonb) AS row(
          slug text,
          name text,
          brand text,
          category text,
          price_card int,
          price_transfer int,
          stock int,
          available boolean,
          short text,
          images jsonb,
          variants jsonb,
          position int
        )
      `);
    }
    return statements;
  });
}

type ProductRow = {
  slug: string;
  name: string;
  brand: string | null;
  category: string;
  price_card: number | null;
  price_transfer: number | null;
  stock: number;
  available: boolean;
  short: string;
  images: RawProduct["images"];
  variants: RawProduct["variants"];
};

type CategoryRow = {
  slug: string;
  name: string;
  parent: string | null;
  seo_title: string;
  seo_description: string;
  intro: string;
};

export async function fetchCatalog(): Promise<CatalogData> {
  await ensureSchema();
  const query = sql();
  const [productRows, categoryRows, settingsRows] = await Promise.all([
    query`
      SELECT slug, name, brand, category, price_card, price_transfer, stock, available, short, images, variants
      FROM products
      ORDER BY position
    `,
    query`
      SELECT slug, name, parent, seo_title, seo_description, intro
      FROM categories
      ORDER BY position
    `,
    query`SELECT hero, transfer_discount FROM store_settings WHERE id = 'store'`,
  ]);
  const products = productRows as unknown as ProductRow[];
  const categories = categoryRows as unknown as CategoryRow[];
  const storedSettings = settingsRows as unknown as {
    hero: StoreSettings["hero"];
    transfer_discount: number | string | null;
  }[];

  const stored = storedSettings[0];
  const hero = stored?.hero;
  const rawDiscount = stored?.transfer_discount;
  const storedDiscount =
    rawDiscount == null || rawDiscount === "" ? Number.NaN : Number(rawDiscount);
  const settings: StoreSettings = {
    ...(hero && Object.keys(hero).length > 0 ? { hero } : {}),
    ...(Number.isFinite(storedDiscount)
      ? { transferDiscount: normalizeDiscountPercent(storedDiscount) }
      : {}),
  };

  return {
    products: products.map((product) => ({
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      category: product.category,
      priceCard: product.price_card,
      priceTransfer: product.price_transfer,
      stock: product.stock,
      available: product.available,
      short: product.short,
      images: product.images ?? [],
      variants: product.variants ?? [],
    })),
    categories: categories.map((category) => ({
      slug: category.slug,
      name: category.name,
      ...(category.parent ? { parent: category.parent } : {}),
      seoTitle: category.seo_title,
      seoDescription: category.seo_description,
      intro: category.intro,
    })),
    settings,
  };
}

export async function saveDescriptions(descriptions: Record<string, string[]>) {
  await ensureSchema();
  const query = sql();
  const rows = Object.entries(descriptions).map(([slug, lines]) => ({ slug, lines }));
  await query.transaction((txn) => {
    const statements = [txn`DELETE FROM product_descriptions`];
    if (rows.length > 0) {
      statements.push(txn`
        INSERT INTO product_descriptions (slug, lines)
        SELECT slug, lines
        FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS row(slug text, lines jsonb)
      `);
    }
    return statements;
  });
}

export async function fetchDescriptions(): Promise<Record<string, string[]>> {
  await ensureSchema();
  const rows = await sql()`SELECT slug, lines FROM product_descriptions`;
  const descriptions: Record<string, string[]> = {};
  for (const row of rows as { slug: string; lines: string[] }[]) {
    descriptions[row.slug] = row.lines ?? [];
  }
  return descriptions;
}

type OrderRow = {
  id: string;
  created_at: string | Date;
  updated_at: string | Date;
  status: Order["status"];
  method: Order["method"];
  items: Order["items"];
  total: number;
  customer: Order["customer"];
  mp: Order["mp"] | null;
  history: Order["history"];
  stock_applied: boolean;
};

function toIso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    status: row.status,
    method: row.method,
    items: row.items,
    total: row.total,
    customer: row.customer,
    ...(row.mp ? { mp: row.mp } : {}),
    history: row.history ?? [],
    stockApplied: row.stock_applied === true,
  };
}

export async function persistOrder(order: Order) {
  await ensureSchema();
  await sql()`
    INSERT INTO orders (id, created_at, updated_at, status, method, items, total, customer, mp, history)
    VALUES (
      ${order.id},
      ${order.createdAt},
      ${order.updatedAt},
      ${order.status},
      ${order.method},
      ${JSON.stringify(order.items)}::jsonb,
      ${order.total},
      ${JSON.stringify(order.customer)}::jsonb,
      ${order.mp ? JSON.stringify(order.mp) : null}::jsonb,
      ${JSON.stringify(order.history)}::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      updated_at = EXCLUDED.updated_at,
      status = EXCLUDED.status,
      method = EXCLUDED.method,
      items = EXCLUDED.items,
      total = EXCLUDED.total,
      customer = EXCLUDED.customer,
      mp = EXCLUDED.mp,
      history = EXCLUDED.history
  `;
}

/** Marks the order so stock is taken only once, even if the confirmation runs twice. */
export async function claimOrderStock(id: string): Promise<boolean> {
  await ensureSchema();
  const rows = await sql()`
    UPDATE orders
    SET stock_applied = true
    WHERE id = ${id} AND stock_applied = false
    RETURNING id
  `;
  return rows.length > 0;
}

/** Clears the stock mark so a cancelled sale can be restored only once. */
export async function releaseOrderStock(id: string): Promise<boolean> {
  await ensureSchema();
  const rows = await sql()`
    UPDATE orders
    SET stock_applied = false
    WHERE id = ${id} AND stock_applied = true
    RETURNING id
  `;
  return rows.length > 0;
}

export async function deleteOrder(id: string) {
  await ensureSchema();
  await sql()`DELETE FROM orders WHERE id = ${id}`;
}

export async function fetchOrder(id: string): Promise<Order | null> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT id, created_at, updated_at, status, method, items, total, customer, mp, history, stock_applied
    FROM orders
    WHERE id = ${id}
  `) as OrderRow[];
  const row = rows[0];
  return row ? mapOrder(row) : null;
}

export async function fetchOrders(): Promise<Order[]> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT id, created_at, updated_at, status, method, items, total, customer, mp, history, stock_applied
    FROM orders
    ORDER BY created_at DESC
  `) as OrderRow[];
  return rows.map(mapOrder);
}
