/**
 * Admin access: password (ADMIN_USER / ADMIN_PASSWORD) or an allowlisted Google account.
 * The session is an httpOnly signed cookie.
 */
import { deleteCookie, getCookie, getRequestUrl, setCookie } from "@tanstack/react-start/server";
import { env } from "./env";

const COOKIE = "nexos_admin";
const DAYS = 7;

function credentials() {
  const user = env("ADMIN_USER");
  const pass = env("ADMIN_PASSWORD");
  return user && pass ? { user, pass } : null;
}

export function allowedGoogleEmails() {
  return new Set(
    (env("ADMIN_GOOGLE_EMAILS") ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function googleConfigured() {
  return Boolean(env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET") && allowedGoogleEmails().size);
}

function sessionSecret() {
  return env("ADMIN_PASSWORD") ?? env("GOOGLE_CLIENT_SECRET");
}

async function hmac(text: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparación en tiempo constante para no dar pistas sobre la contraseña. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function passwordConfigured() {
  return credentials() !== null;
}

export function adminConfigured() {
  return passwordConfigured() || googleConfigured();
}

function encodePayload(identity: string, exp: number) {
  const bytes = new TextEncoder().encode(JSON.stringify({ sub: identity, exp }));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodePayload(payload: string): { sub: string; exp: number } | null {
  try {
    const pad = (4 - (payload.length % 4)) % 4;
    const padded = payload.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat(pad);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes)) as { sub?: unknown; exp?: unknown };
    if (typeof data.sub !== "string" || typeof data.exp !== "number") return null;
    return { sub: data.sub, exp: data.exp };
  } catch {
    return null;
  }
}

function identityAllowed(identity: string) {
  const adminUser = env("ADMIN_USER");
  if (adminUser && identity === adminUser) return true;
  return allowedGoogleEmails().has(identity.toLowerCase());
}

export async function startAdminSession(identity: string) {
  const secret = sessionSecret();
  if (!secret) throw new Error("El panel no tiene una clave para firmar la sesión.");
  const exp = Date.now() + DAYS * 86_400_000;
  const payload = encodePayload(identity, exp);
  const token = `${payload}.${await hmac(payload, secret)}`;
  setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: getRequestUrl().protocol === "https:",
    path: "/",
    maxAge: DAYS * 86_400,
  });
}

export async function login(user: string, pass: string) {
  const c = credentials();
  if (!c)
    throw new Error(
      "El panel no está configurado: completá ADMIN_USER y ADMIN_PASSWORD en el archivo .env",
    );
  if (!safeEqual(user.trim(), c.user) || !safeEqual(pass, c.pass)) {
    await new Promise((r) => setTimeout(r, 600));
    return false;
  }
  await startAdminSession(c.user);
  return true;
}

export function logout() {
  deleteCookie(COOKIE, { path: "/" });
}

export async function isAdmin() {
  const secret = sessionSecret();
  const token = getCookie(COOKIE);
  if (!secret || !token) return false;
  const i = token.lastIndexOf(".");
  if (i <= 0) return false;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const data = decodePayload(payload);
  if (!data || data.exp < Date.now() || !identityAllowed(data.sub)) return false;
  return safeEqual(sig, await hmac(payload, secret));
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("NO_AUTORIZADO");
}
