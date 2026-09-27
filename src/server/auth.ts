/**
 * Acceso al panel: usuario y contraseña del archivo .env
 * (ADMIN_USER y ADMIN_PASSWORD). La sesión se guarda en una cookie firmada.
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

export function adminConfigured() {
  return credentials() !== null;
}

export async function login(user: string, pass: string) {
  const c = credentials();
  if (!c)
    throw new Error(
      "El panel no está configurado: completá ADMIN_USER y ADMIN_PASSWORD en el archivo .env",
    );
  if (!safeEqual(user.trim(), c.user) || !safeEqual(pass, c.pass)) {
    await new Promise((r) => setTimeout(r, 600)); // frena intentos repetidos
    return false;
  }
  const exp = Date.now() + DAYS * 86_400_000;
  const payload = `${c.user}.${exp}`;
  const token = `${payload}.${await hmac(payload, c.pass + c.user)}`;
  setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: getRequestUrl().protocol === "https:",
    path: "/",
    maxAge: DAYS * 86_400,
  });
  return true;
}

export function logout() {
  deleteCookie(COOKIE, { path: "/" });
}

export async function isAdmin() {
  const c = credentials();
  const token = getCookie(COOKIE);
  if (!c || !token) return false;
  const i = token.lastIndexOf(".");
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const [user, exp] = payload.split(".");
  if (user !== c.user || !exp || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(payload, c.pass + c.user));
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("NO_AUTORIZADO");
}
