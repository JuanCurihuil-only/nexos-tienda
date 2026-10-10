/**
 * Store data lives in Neon Postgres.
 * Photos uploaded from the admin panel live in the media table.
 * A copy is also written under DATA_DIR/media when the disk is writable.
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

export async function saveMedia(fileName: string, bytes: Uint8Array, contentType = "image/webp") {
  if (!SAFE_NAME.test(fileName)) throw new Error("Nombre de imagen inválido");
  await saveMediaBlob(fileName, contentTypeFor(fileName, contentType), bytesToBase64(bytes));
  await mirrorToDisk(fileName, bytes);
  return `/media/${fileName}`;
}

export async function readMedia(
  fileName: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (!SAFE_NAME.test(fileName)) return null;
  const stored = await readMediaBlob(fileName);
  if (stored) {
    return { bytes: base64ToBytes(stored.base64), contentType: contentTypeFor(fileName, stored.contentType) };
  }
  const { fsp, path } = await fsmods();
  try {
    const bytes = new Uint8Array(await fsp.readFile(path.join(await mediaDir(), fileName)));
    return { bytes, contentType: contentTypeFor(fileName) };
  } catch {
    return null;
  }
}
