import { deleteCookie, getCookie, getRequestUrl, setCookie } from "@tanstack/react-start/server";
import { allowedGoogleEmails, googleConfigured, startAdminSession } from "./auth";
import { env } from "./env";

const STATE_COOKIE = "nexos_google_state";

function redirect(location: string) {
  return new Response(null, { status: 302, headers: { location } });
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: getRequestUrl().protocol === "https:",
    path: "/",
  };
}

function callbackUrl() {
  return `${getRequestUrl().origin}/api/admin/google/callback`;
}

function randomState() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function beginGoogleLogin() {
  if (!googleConfigured()) return redirect("/admin/login?error=config");
  const state = randomState();
  const redirectUri = callbackUrl();
  setCookie(STATE_COOKIE, `${state}|${encodeURIComponent(redirectUri)}`, {
    ...cookieOptions(),
    maxAge: 600,
  });
  const params = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID")!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email",
    state,
    prompt: "select_account",
  });
  return redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

function readStateCookie() {
  const raw = getCookie(STATE_COOKIE);
  deleteCookie(STATE_COOKIE, { path: "/" });
  if (!raw) return null;
  const splitAt = raw.indexOf("|");
  if (splitAt <= 0) return { state: raw, redirectUri: callbackUrl() };
  return {
    state: raw.slice(0, splitAt),
    redirectUri: decodeURIComponent(raw.slice(splitAt + 1)),
  };
}

export async function finishGoogleLogin(request: Request) {
  const url = new URL(request.url);
  const saved = readStateCookie();

  if (url.searchParams.get("error")) return redirect("/admin/login?error=denied");
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!googleConfigured() || !saved || !state || state !== saved.state || !code) {
    return redirect("/admin/login?error=state");
  }

  const clientId = env("GOOGLE_CLIENT_ID")!;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: env("GOOGLE_CLIENT_SECRET")!,
      redirect_uri: saved.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const token = (await tokenRes.json()) as {
    access_token?: string;
    id_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!tokenRes.ok || !token.id_token) {
    console.error("[google] token", token.error ?? tokenRes.status);
    return redirect("/admin/login?error=token");
  }

  const infoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token.id_token)}`,
  );
  if (!infoRes.ok) return redirect("/admin/login?error=token");
  const profile = (await infoRes.json()) as {
    aud?: string;
    email?: string;
    email_verified?: boolean | string;
  };
  const verified = profile.email_verified === true || profile.email_verified === "true";
  const email = profile.email?.trim().toLowerCase();
  if (profile.aud !== clientId || !verified || !email || !allowedGoogleEmails().has(email)) {
    return redirect("/admin/login?error=forbidden");
  }

  await startAdminSession(email);
  return redirect("/admin");
}
