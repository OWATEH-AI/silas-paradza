import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
  createAdminSanityClient,
  unauthorizedResponse,
  verifyAdminSession,
} from "../../../../sanity/lib/admin-auth";

const referencedContentTypes = [
  "article",
  "formSubmission",
  "galleryItem",
  "homePage",
  "page",
  "project",
  "service",
];

export const GET: APIRoute = async ({ params, request }) => {
  if (!(await verifyAdminSession(request))) return unauthorizedResponse();

  const assetId = params.assetId;
  if (typeof assetId !== "string" || !/^file-[A-Za-z0-9-]+$/.test(assetId)) {
    return new Response("File not found.", { status: 404 });
  }

  const client = createAdminSanityClient();
  if (!client) {
    return Response.json({ error: "Media downloads are not configured on this website." }, { status: 503 });
  }

  try {
    const [asset, isReferenced] = await Promise.all([
      client.fetch<{
        url?: string;
        mimeType?: string;
        originalFilename?: string;
      } | null>(
        '*[_id == $assetId && _type == "sanity.fileAsset"][0]{url, mimeType, originalFilename}',
        { assetId },
        { perspective: "drafts", useCdn: false },
      ),
      client.fetch<boolean>(
        'count(*[_type in $types && references($assetId)]) > 0',
        { types: referencedContentTypes, assetId },
        { perspective: "drafts", useCdn: false },
      ),
    ]);

    if (!asset?.url || !isReferenced) {
      return new Response("File not found.", { status: 404 });
    }

    const assetUrl = new URL(asset.url);
    const projectId = env.PUBLIC_SANITY_PROJECT_ID ?? "z2cpms2c";
    const dataset = env.PUBLIC_SANITY_DATASET ?? "production";
    if (
      assetUrl.protocol !== "https:" ||
      assetUrl.hostname !== "cdn.sanity.io" ||
      !assetUrl.pathname.startsWith(`/files/${projectId}/${dataset}/`)
    ) {
      console.error("Admin asset URL did not match the configured Sanity project.");
      return Response.json({ error: "The file could not be loaded." }, { status: 502 });
    }

    const range = request.headers.get("range");
    if (range && !/^bytes=\d*-\d*(?:,\d*-\d*)*$/.test(range)) {
      return new Response("Invalid range request.", { status: 416 });
    }

    const upstreamHeaders = new Headers();
    if (range) upstreamHeaders.set("Range", range);
    const upstream = await fetch(assetUrl, { headers: upstreamHeaders });
    if (!upstream.ok && upstream.status !== 206) {
      console.error("Sanity asset download failed.", { status: upstream.status });
      return Response.json({ error: "The file could not be loaded." }, { status: 502 });
    }

    const filename = encodeURIComponent(asset.originalFilename || "attachment").replace(
      /['()*]/g,
      (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    const inline = asset.mimeType?.startsWith("video/") || asset.mimeType?.startsWith("image/");
    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${filename}`,
      "Content-Type": asset.mimeType || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });

    for (const name of ["accept-ranges", "content-length", "content-range"] as const) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error("Admin asset request failed.", error);
    return Response.json({ error: "The file could not be loaded." }, { status: 502 });
  }
};
