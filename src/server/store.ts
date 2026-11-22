/**
 * Store data lives in Neon Postgres.
 * Photos uploaded from the admin panel live in the media table.
 * A copy is also written under DATA_DIR/media when the disk is writable.
 *
 * Long in-memory caches cut Neon CU-hrs: public pages rarely hit the DB,
 * so compute can scale to zero between visits.
 */
import type { CatalogData } from "@/lib/products";
import {
  ensureData,
  fetchCatalog,
  fetchDescriptions,
  readMediaBlob,
  saveCatalog,
  saveDescriptions,
  saveMediaBlob,
} from "./db";
import { env } from "./env";

/** Default 5 minutes. Override with CATALOG_CACHE_MS (milliseconds). */
function catalogCacheMs() {
  const raw = env("CATALOG_CACHE_MS");
  const n = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(n) && n >= 5_000 ? n : 300_000;
}

const MEDIA_MEMORY_MS = 10 * 60_000;

export function dataDir() {
  return env("DATA_DIR") ?? ".data";
}

async function fsmods() {
  const [{ promises }, path] = await Promise.all([import("node:fs"), import("node:path")]);
  return { fsp: promises, path };
}

let cache: { at: number; data: CatalogData } | null = null;
let descCache: { at: number; data: Record<string, string[]> } | null = null;
const mediaMem = new Map<string, { at: number; bytes: Uint8Array; contentType: string }>();

export async function readCatalog(): Promise<CatalogData> {
  const ttl = catalogCacheMs();
  if (cache && Date.now() - cache.at < ttl) return cache.data;
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
  const ttl = catalogCacheMs();
  if (descCache && Date.now() - descCache.at < ttl) return descCache.data;
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
const SAFE_NAME = /^[a-z0-9-]+\.[a-z0-9]+$/;

const EXT_TYPE: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  avif: "image/avif",
  bmp: "image/bmp",
  heic: "image/heic",
  heif: "image/heif",
  tif: "image/tiff",
  tiff: "image/tiff",
  ico: "image/x-icon",
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(data: string) {
  const binary = atob(data.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function contentTypeFor(fileName: string, stored?: string) {
  const clean = stored?.toLowerCase().split(";")[0]?.trim() ?? "";
  if (clean.startsWith("image/") && !clean.includes("svg") && !clean.includes("xml")) return clean;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TYPE[ext] ?? "application/octet-stream";
}

/** Carpeta absoluta. Un mkdir relativo a `.data` falla en el hosting y a veces en Windows. */
async function mediaDir() {
  const { path } = await fsmods();
  const projectRoot =
    typeof import.meta.dirname === "string" ? path.resolve(import.meta.dirname, "../..") : process.cwd();
  const configured = dataDir();
  const base = path.isAbsolute(configured) ? configured : path.resolve(projectRoot, configured);
  return path.join(base, MEDIA);
}

async function mirrorToDisk(fileName: string, bytes: Uint8Array) {
  try {
    const { fsp, path } = await fsmods();
    const dir = await mediaDir();
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(dir, fileName), bytes);
  } catch {
    /* Sin disco escribible la foto queda igual en la base. */
  }
}

function rememberMedia(fileName: string, bytes: Uint8Array, contentType: string) {
  mediaMem.set(fileName, { at: Date.now(), bytes, contentType });
  if (mediaMem.size > 80) {
    const oldest = [...mediaMem.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) mediaMem.delete(oldest[0]);
  }
}

export async function saveMedia(fileName: string, bytes: Uint8Array, contentType = "image/webp") {
  if (!SAFE_NAME.test(fileName)) throw new Error("Nombre de imagen inválido");
  const type = contentTypeFor(fileName, contentType);
  await saveMediaBlob(fileName, type, bytesToBase64(bytes));
  await mirrorToDisk(fileName, bytes);
  rememberMedia(fileName, bytes, type);
  return `/media/${fileName}`;
}

export async function readMedia(
  fileName: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (!SAFE_NAME.test(fileName)) return null;

  const mem = mediaMem.get(fileName);
  if (mem && Date.now() - mem.at < MEDIA_MEMORY_MS) {
    return { bytes: mem.bytes, contentType: mem.contentType };
  }

  // Disco primero: evita despertar Neon en cada foto del panel.
  const { fsp, path } = await fsmods();
  try {
    const bytes = new Uint8Array(await fsp.readFile(path.join(await mediaDir(), fileName)));
    const contentType = contentTypeFor(fileName);
    rememberMedia(fileName, bytes, contentType);
    return { bytes, contentType };
  } catch {
    /* sin archivo local */
  }

  const stored = await readMediaBlob(fileName);
  if (!stored) return null;
  const bytes = base64ToBytes(stored.base64);
  const contentType = contentTypeFor(fileName, stored.contentType);
  rememberMedia(fileName, bytes, contentType);
  await mirrorToDisk(fileName, bytes);
  return { bytes, contentType };
}
