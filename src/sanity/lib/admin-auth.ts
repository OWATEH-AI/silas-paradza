import { createClient } from "@sanity/client";
import { env } from "cloudflare:workers";

const sessionCookieName = "silas_admin_session";
const sessionLifetimeSeconds = 8 * 60 * 60;
const encoder = new TextEncoder();

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function signingKey(): Promise<CryptoKey | undefined> {
  if (!env.ADMIN_SESSION_SECRET || env.ADMIN_SESSION_SECRET.length < 32) return undefined;
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(env.ADMIN_SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function getCookie(request: Request, name: string): string | undefined {
  const pair = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return pair?.slice(name.length + 1);
}

export async function verifyAdminSession(request: Request): Promise<boolean> {
  const value = getCookie(request, sessionCookieName);
  const key = await signingKey();
  if (!value || !key) return false;

  const [expiresAt, nonce, signature, extra] = value.split(".");
  const expiry = Number(expiresAt);
  if (!expiresAt || !nonce || !signature || extra || !Number.isSafeInteger(expiry)) return false;
  if (expiry <= Math.floor(Date.now() / 1000)) return false;
  if (expiry > Math.floor(Date.now() / 1000) + sessionLifetimeSeconds) return false;

  try {
    return await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(signature),
      encoder.encode(`${expiresAt}.${nonce}`),
    );
  } catch {
    return false;
  }
}

export async function createAdminSessionCookie(): Promise<string | undefined> {
  const key = await signingKey();
  if (!key) return undefined;
  const expiresAt = String(Math.floor(Date.now() / 1000) + sessionLifetimeSeconds);
  const nonce = encodeBase64Url(crypto.getRandomValues(new Uint8Array(24)));
  const payload = `${expiresAt}.${nonce}`;
  const signature = encodeBase64Url(
    new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))),
  );
  const secure = import.meta.env.DEV ? "" : "; Secure";
  return `${sessionCookieName}=${payload}.${signature}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionLifetimeSeconds}${secure}`;
}

export function clearAdminSessionCookie(): string {
  const secure = import.meta.env.DEV ? "" : "; Secure";
  return `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!env.ADMIN_PASSWORD) return false;
  const [provided, configured] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(password)),
    crypto.subtle.digest("SHA-256", encoder.encode(env.ADMIN_PASSWORD)),
  ]);
  const left = new Uint8Array(provided);
  const right = new Uint8Array(configured);
  let difference = left.length ^ right.length;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export function hasAdminConfiguration(): boolean {
  return Boolean(
    env.ADMIN_PASSWORD &&
      env.ADMIN_SESSION_SECRET &&
      env.ADMIN_SESSION_SECRET.length >= 32
  );
}

export function createAdminSanityClient() {
  if (!env.SANITY_API_WRITE_TOKEN) return undefined;
  return createClient({
    projectId: env.PUBLIC_SANITY_PROJECT_ID ?? "z2cpms2c",
    dataset: env.PUBLIC_SANITY_DATASET ?? "production",
    apiVersion: "2025-11-25",
    token: env.SANITY_API_WRITE_TOKEN,
    useCdn: false,
  });
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: "Please sign in to continue." }, { status: 401 });
}
