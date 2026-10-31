import type { APIRoute } from "astro";
import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";
import { env } from "cloudflare:workers";
import {
  unauthorizedResponse,
  verifyAdminSession,
} from "../../../sanity/lib/admin-auth";

export const GET: APIRoute = async ({ request }) => {
  if (!(await verifyAdminSession(request))) return unauthorizedResponse();
  const target = new URL(request.url).searchParams.get("path") ?? "/";
  if (!target.startsWith("/") || target.startsWith("//") || !env.SANITY_API_READ_TOKEN) {
    return new Response("Draft preview is not configured or the preview path is invalid.", {
      status: env.SANITY_API_READ_TOKEN ? 400 : 503,
    });
  }
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return new Response(null, {
    status: 303,
    headers: {
      Location: target,
      "Cache-Control": "no-store",
      "Set-Cookie": `${perspectiveCookieName}=drafts; Path=/; SameSite=Strict${secure}`,
    },
  });
};
