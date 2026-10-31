import type { APIRoute } from "astro";
import { validatePreviewUrl } from "@sanity/preview-url-secret";
import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";
import { sanityClient } from "sanity:client";
import { env } from "cloudflare:workers";

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const token = env.SANITY_API_READ_TOKEN;

  if (!token) {
    return new Response("Preview is not configured: missing SANITY_API_READ_TOKEN.", { status: 503 });
  }

  const client = sanityClient.withConfig({ token, useCdn: false });
  const { isValid, redirectTo = "/", studioPreviewPerspective } =
    await validatePreviewUrl(client, request.url);

  if (!isValid) {
    return new Response("Invalid or expired preview authorization.", { status: 401 });
  }

  const partitioned =
    request.headers.get("sec-fetch-dest") === "iframe" &&
    request.headers.get("sec-fetch-site") === "cross-site";

  cookies.set(perspectiveCookieName, studioPreviewPerspective ?? "drafts", {
    httpOnly: false,
    sameSite: "none",
    secure: true,
    path: "/",
    partitioned,
  });

  return redirect(redirectTo, 307);
};
