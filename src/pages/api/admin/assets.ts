import type { APIRoute } from "astro";
import {
  createAdminSanityClient,
  isSameOriginRequest,
  unauthorizedResponse,
  verifyAdminSession,
} from "../../../sanity/lib/admin-auth";

const maximumUploadSize = 90 * 1024 * 1024;

export const POST: APIRoute = async ({ request }) => {
  if (!(await verifyAdminSession(request))) return unauthorizedResponse();
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Request origin not allowed." }, { status: 403 });
  }
  const client = createAdminSanityClient();
  if (!client) return Response.json({ error: "Media uploads are not configured on this website." }, { status: 503 });
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maximumUploadSize + 1024 * 1024) {
    return Response.json({ error: "Files must be smaller than 90 MB." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Choose a file to upload." }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Choose a non-empty file to upload." }, { status: 400 });
  }
  if (file.size > maximumUploadSize) {
    return Response.json({ error: "Files must be smaller than 90 MB." }, { status: 413 });
  }
  const kind = file.type.startsWith("video/") ? "file" : file.type.startsWith("image/") ? "image" : undefined;
  if (!kind) {
    return Response.json({ error: "Upload an image or video file." }, { status: 415 });
  }

  try {
    const asset = await client.assets.upload(kind, file, {
      filename: file.name.slice(0, 180),
      contentType: file.type,
    });
    return Response.json({
      asset: { _id: asset._id, _type: asset._type, url: asset.url, mimeType: asset.mimeType },
    });
  } catch (error) {
    console.error("Admin asset upload failed.", error);
    return Response.json({ error: "The media upload failed. Please try again." }, { status: 502 });
  }
};
