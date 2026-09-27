/**
 * Store data lives in Neon Postgres.
 * Photos uploaded from the admin panel stay on disk under DATA_DIR/media.
 */
import type { CatalogData } from "@/lib/products";
import { ensureData, fetchCatalog, fetchDescriptions, saveCatalog, saveDescriptions } from "./db";
import { env } from "./env";

const CACHE_MS = 15_000;

export function dataDir() {
  return env("DATA_DIR") ?? ".data";
}

async function fsmods() {
  const [{ promises }, path] = await Promise.all([import("node:fs"), import("node:path")]);
  return { fsp: promises, path };
}

let cache: { at: number; data: CatalogData } | null = null;
let descCache: { at: number; data: Record<string, string[]> } | null = null;

export async function readCatalog(): Promise<CatalogData> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  await ensureData();
  const data = await fetchCatalog();
  cache = { at: Date.now(), data };
  return data;
}

export async function writeCatalog(data: CatalogData) {
  await ensureData();
  await saveCatalog(data);
  cache = { at: Date.now(), data };
}

export async function loadCatalogIntoModule() {
  const { setCatalog } = await import("@/lib/products");
  const data = await readCatalog();
  setCatalog(data);
  return data;
}

export async function readDescriptions(): Promise<Record<string, string[]>> {
  if (descCache && Date.now() - descCache.at < CACHE_MS) return descCache.data;
  await ensureData();
  const data = await fetchDescriptions();
  descCache = { at: Date.now(), data };
  return data;
}

export async function writeDescriptions(data: Record<string, string[]>) {
  await ensureData();
  await saveDescriptions(data);
  descCache = { at: Date.now(), data };
}

const MEDIA = "media";

export async function saveMedia(fileName: string, bytes: Uint8Array) {
  const { fsp, path } = await fsmods();
  const dir = path.join(dataDir(), MEDIA);
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(path.join(dir, fileName), bytes);
  return `/media/${fileName}`;
}

export async function readMedia(fileName: string): Promise<Uint8Array | null> {
  if (!/^[a-z0-9-]+\.webp$/.test(fileName)) return null;
  const { fsp, path } = await fsmods();
  try {
    return new Uint8Array(await fsp.readFile(path.join(dataDir(), MEDIA, fileName)));
  } catch {
    return null;
  }
}
