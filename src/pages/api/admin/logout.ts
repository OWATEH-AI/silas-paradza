import type { APIRoute } from "astro";
import { clearAdminSessionCookie, isSameOriginRequest } from "../../../sanity/lib/admin-auth";

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Request origin not allowed." }, { status: 403 });
  }
  return Response.json(
    { authenticated: false },
    {
      headers: {
        "Set-Cookie": clearAdminSessionCookie(),
        "Cache-Control": "no-store",
      },
    },
  );
};
