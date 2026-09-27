import { deleteCookie, getCookie, getRequestUrl, setCookie } from "@tanstack/react-start/server";
import { allowedGoogleEmails, googleConfigured, startAdminSession } from "./auth";
import { env } from "./env";

const STATE_COOKIE = "nexos_google_state";

function redirect(location: string) {
  return new Response(null, { status: 302, headers: { location } });
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
  setCookie(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: getRequestUrl().protocol === "https:",
    path: "/",
    maxAge: 600,
  });
  const params = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID")!,
    redirect_uri: callbackUrl(),
    response_type: "code",
    scope: "openid email",
    state,
    prompt: "select_account",
  });
  return redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

export async function finishGoogleLogin(request: Request) {
  const url = new URL(request.url);
  const expected = getCookie(STATE_COOKIE);
  deleteCookie(STATE_COOKIE, { path: "/" });

  if (url.searchParams.get("error")) return redirect("/admin/login?error=denied");
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!googleConfigured() || !expected || !state || state !== expected || !code) {
    return redirect("/admin/login?error=invalid");
  }

  const clientId = env("GOOGLE_CLIENT_ID")!;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: env("GOOGLE_CLIENT_SECRET")!,
      redirect_uri: callbackUrl(),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return redirect("/admin/login?error=invalid");
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) return redirect("/admin/login?error=invalid");

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  if (!profileRes.ok) return redirect("/admin/login?error=invalid");
  const profile = (await profileRes.json()) as { email?: string; email_verified?: boolean };
  const email = profile.email?.trim().toLowerCase();
  if (!profile.email_verified || !email || !allowedGoogleEmails().has(email)) {
    return redirect("/admin/login?error=forbidden");
  }

  await startAdminSession(email);
  return redirect("/admin");
}
