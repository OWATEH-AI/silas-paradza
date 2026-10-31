import type { APIRoute } from "astro";
import {
  createAdminSessionCookie,
  hasAdminConfiguration,
  isSameOriginRequest,
  verifyAdminPassword,
} from "../../../sanity/lib/admin-auth";

const failedAttempts = new Map<string, number[]>();
const attemptWindowMs = 10 * 60 * 1000;
const maximumAttempts = 8;

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Request origin not allowed." }, { status: 403 });
  }
  if (!hasAdminConfiguration()) {
    return Response.json(
      { error: "Admin sign-in is not configured on this server yet." },
      { status: 503 },
    );
  }

  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const recentAttempts = (failedAttempts.get(ip) ?? []).filter(
    (timestamp) => Date.now() - timestamp < attemptWindowMs,
  );
  if (recentAttempts.length >= maximumAttempts) {
    return Response.json(
      { error: "Too many sign-in attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Enter your password and try again." }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password || !(await verifyAdminPassword(password))) {
    recentAttempts.push(Date.now());
    failedAttempts.set(ip, recentAttempts);
    return Response.json({ error: "That password was not recognised." }, { status: 401 });
  }

  failedAttempts.delete(ip);
  const cookie = await createAdminSessionCookie();
  if (!cookie) {
    return Response.json({ error: "Admin session signing is not configured." }, { status: 503 });
  }
  return Response.json(
    { authenticated: true },
    { headers: { "Set-Cookie": cookie, "Cache-Control": "no-store" } },
  );
};
