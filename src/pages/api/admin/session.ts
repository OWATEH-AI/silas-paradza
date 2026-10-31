import type { APIRoute } from "astro";
import { hasAdminConfiguration, verifyAdminSession } from "../../../sanity/lib/admin-auth";

export const GET: APIRoute = async ({ request }) => {
  if (!hasAdminConfiguration()) {
    return Response.json(
      {
        authenticated: false,
        configured: false,
        error: "Admin sign-in needs its password and session key configured on this server.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { authenticated: await verifyAdminSession(request), configured: true },
    { headers: { "Cache-Control": "no-store" } },
  );
};
