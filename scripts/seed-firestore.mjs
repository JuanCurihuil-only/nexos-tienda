/**
 * Siembra Firestore con el catálogo de src/data (o .data/ si existe).
 *
 * Uso:
 *   node --env-file=.env scripts/seed-firestore.mjs
 *   npm run seed:firestore
 *
 * Requiere FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 * (o FIREBASE_SERVICE_ACCOUNT_JSON).
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const BATCH_LIMIT = 400;

function parseServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    const parsed = JSON.parse(json);
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: String(parsed.private_key).replace(/\\n/g, "\n"),
    };
  }
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim()?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      "Faltan credenciales Firebase. Configurá FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY (ver .env.example).",
    );
    process.exit(1);
  }
  return { projectId, clientEmail, privateKey };
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function loadCatalog() {
  const fromDisk = await readJson(path.join(process.cwd(), ".data", "catalogo.json"));
  if (fromDisk?.products && fromDisk.categories) {
    return {
      products: fromDisk.products,
      categories: fromDisk.categories,
      settings: fromDisk.settings ?? {},
    };
  }
  const root = path.join(process.cwd(), "src", "data");
  const [products, categories] = await Promise.all([
    readJson(path.join(root, "products.json")),
    readJson(path.join(root, "categories.json")),
  ]);
  return { products: products ?? [], categories: categories ?? [], settings: {} };
}

async function loadDescriptions() {
  const fromDisk = await readJson(path.join(process.cwd(), ".data", "descripciones.json"));
  if (fromDisk) return fromDisk;
  return (await readJson(path.join(process.cwd(), "src", "data", "descriptions.json"))) ?? {};
}

async function commitBatches(db, ops) {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + BATCH_LIMIT)) op(batch);
    await batch.commit();
  }
}

async function main() {
  const force = process.argv.includes("--force");
  const { projectId, clientEmail, privateKey } = parseServiceAccount();
  if (!getApps().length) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET?.trim() || `${projectId}.firebasestorage.app`,
    });
  }
  const db = getFirestore();

  const meta = await db.collection("meta").doc("catalog").get();
  if (meta.exists && meta.data()?.seeded === true && !force) {
    console.log("Catálogo ya sembrado. Usá --force para sobrescribir.");
    return;
  }

  const catalog = await loadCatalog();
  const descriptions = await loadDescriptions();
  const ops = [];

  const [existingProducts, existingCategories, existingDescriptions] = await Promise.all([
    db.collection("products").select().get(),
    db.collection("categories").select().get(),
    db.collection("descriptions").select().get(),
  ]);

  const productSlugs = new Set(catalog.products.map((p) => p.slug));
  const categorySlugs = new Set(catalog.categories.map((c) => c.slug));
  const descSlugs = new Set(Object.keys(descriptions));

  for (const doc of existingProducts.docs) {
    if (!productSlugs.has(doc.id)) ops.push((batch) => batch.delete(doc.ref));
  }
  for (const doc of existingCategories.docs) {
    if (!categorySlugs.has(doc.id)) ops.push((batch) => batch.delete(doc.ref));
  }
  for (const doc of existingDescriptions.docs) {
    if (!descSlugs.has(doc.id)) ops.push((batch) => batch.delete(doc.ref));
  }

  catalog.products.forEach((product, position) => {
    const ref = db.collection("products").doc(product.slug);
    ops.push((batch) =>
      batch.set(ref, {
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
        weightKg: product.weightKg ?? null,
        heightCm: product.heightCm ?? null,
        widthCm: product.widthCm ?? null,
        lengthCm: product.lengthCm ?? null,
        position,
      }),
    );
  });

  catalog.categories.forEach((category, position) => {
    const ref = db.collection("categories").doc(category.slug);
    ops.push((batch) =>
      batch.set(ref, {
        slug: category.slug,
        name: category.name,
        parent: category.parent ?? null,
        seoTitle: category.seoTitle ?? "",
        seoDescription: category.seoDescription ?? "",
        intro: category.intro ?? "",
        position,
      }),
    );
  });

  ops.push((batch) =>
    batch.set(db.collection("settings").doc("store"), {
      hero: catalog.settings?.hero ?? {},
      transferDiscount: catalog.settings?.transferDiscount ?? null,
    }),
  );

  for (const [slug, lines] of Object.entries(descriptions)) {
    ops.push((batch) => batch.set(db.collection("descriptions").doc(slug), { lines: lines ?? [] }));
  }

  ops.push((batch) =>
    batch.set(db.collection("meta").doc("catalog"), {
      seeded: true,
      at: new Date().toISOString(),
    }),
  );

  await commitBatches(db, ops);

  // Pedidos locales opcionales
  const pedidosDir = path.join(process.cwd(), ".data", "pedidos");
  let orderCount = 0;
  try {
    const files = (await readdir(pedidosDir)).filter((f) => /^NX-.*\.json$/.test(f));
    for (const file of files) {
      const order = await readJson(path.join(pedidosDir, file));
      if (!order?.id) continue;
      await db
        .collection("orders")
        .doc(order.id)
        .set(
          {
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
          },
          { merge: true },
        );
      orderCount += 1;
    }
  } catch {
    /* sin .data/pedidos */
  }

  console.log(
    `Firestore listo: productos=${catalog.products.length} categorías=${catalog.categories.length} descripciones=${Object.keys(descriptions).length} pedidos=${orderCount}`,
  );
}

main().catch((error) => {
  console.error(error?.message ? String(error.message) : String(error));
  process.exit(1);
});
