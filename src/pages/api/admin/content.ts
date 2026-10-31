import type { APIRoute } from "astro";
import {
  createAdminSanityClient,
  isSameOriginRequest,
  unauthorizedResponse,
  verifyAdminSession,
} from "../../../sanity/lib/admin-auth";

const contentTypes = ["homePage", "article", "service", "project", "page", "galleryItem"] as const;
type ContentType = (typeof contentTypes)[number];

const editableFields: Record<ContentType, string[]> = {
  homePage: [
    "heroTitle",
    "heroHighlight",
    "heroSubtitle",
    "heroImage",
    "aboutHeading",
    "aboutMotto",
    "aboutBody",
    "phone",
    "email",
    "whatsAppNumber",
    "seo",
  ],
  article: [
    "title",
    "slug",
    "excerpt",
    "category",
    "author",
    "publishedAt",
    "body",
    "coverImage",
    "videoFile",
    "videoUrl",
    "videoPoster",
    "featured",
    "seo",
  ],
  service: [
    "title",
    "slug",
    "category",
    "summary",
    "body",
    "featured",
    "isActive",
    "order",
    "coverImage",
    "videoFile",
    "videoUrl",
    "videoPoster",
    "seo",
  ],
  project: [
    "title",
    "slug",
    "status",
    "location",
    "summary",
    "body",
    "featured",
    "coverImage",
    "videoFile",
    "videoUrl",
    "videoPoster",
    "highlights",
    "seo",
  ],
  page: [
    "title",
    "slug",
    "summary",
    "body",
    "coverImage",
    "videoFile",
    "videoUrl",
    "videoPoster",
    "showInNavigation",
    "seo",
  ],
  galleryItem: [
    "title",
    "category",
    "image",
    "videoFile",
    "videoUrl",
    "videoPoster",
    "showOnHome",
    "order",
  ],
};
const requiredFields: Record<ContentType, string[]> = {
  homePage: ["heroTitle", "heroSubtitle"],
  article: ["title", "excerpt", "body", "publishedAt"],
  service: ["title", "summary"],
  project: ["title", "summary"],
  page: ["title"],
  galleryItem: ["title"],
};

function errorResponse(error: unknown): Response {
  console.error("Admin content API failed.", error);
  return Response.json({ error: "The content request failed. Please try again." }, { status: 502 });
}

function validContentType(value: unknown): value is ContentType {
  return typeof value === "string" && contentTypes.includes(value as ContentType);
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function portableTextFromInput(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return value
    .split(/\r?\n/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({
      _key: crypto.randomUUID().replaceAll("-", "").slice(0, 12),
      _type: "block",
      style: "normal",
      markDefs: [],
      children: [
        {
          _key: crypto.randomUUID().replaceAll("-", "").slice(0, 12),
          _type: "span",
          text,
          marks: [],
        },
      ],
    }));
}

function plainTextFromPortableText(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .flatMap((block) => (block as { children?: Array<{ text?: string }> }).children ?? [])
    .map((child) => child.text ?? "")
    .join("\n\n");
}

function cleanImage(value: unknown, field: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  const image = value as {
    asset?: { _ref?: unknown };
    alt?: unknown;
    crop?: { top?: unknown; bottom?: unknown; left?: unknown; right?: unknown };
    hotspot?: { x?: unknown; y?: unknown; width?: unknown; height?: unknown };
  };
  if (typeof image.asset?._ref !== "string" || !/^image-[A-Za-z0-9-]+$/.test(image.asset._ref)) {
    return undefined;
  }
  const fraction = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1 ? value : undefined;
  const crop = image.crop;
  const cropValues = crop
    ? {
        top: fraction(crop.top),
        bottom: fraction(crop.bottom),
        left: fraction(crop.left),
        right: fraction(crop.right),
      }
    : undefined;
  const validCrop =
    cropValues &&
    Object.values(cropValues).every((value) => value !== undefined) &&
    cropValues.top! + cropValues.bottom! < 1 &&
    cropValues.left! + cropValues.right! < 1;
  const hotspot = image.hotspot;
  const hotspotValues = hotspot
    ? {
        x: fraction(hotspot.x),
        y: fraction(hotspot.y),
        width: fraction(hotspot.width),
        height: fraction(hotspot.height),
      }
    : undefined;
  const validHotspot =
    hotspotValues &&
    Object.values(hotspotValues).every((value) => value !== undefined) &&
    hotspotValues.x! >= hotspotValues.width! / 2 &&
    hotspotValues.x! <= 1 - hotspotValues.width! / 2 &&
    hotspotValues.y! >= hotspotValues.height! / 2 &&
    hotspotValues.y! <= 1 - hotspotValues.height! / 2;
  return {
    _type: "image",
    asset: { _type: "reference", _ref: image.asset._ref },
    ...(validCrop ? { crop: { _type: "sanity.imageCrop", ...cropValues } } : {}),
    ...(validHotspot ? { hotspot: { _type: "sanity.imageHotspot", ...hotspotValues } } : {}),
    ...(field !== "heroImage" && typeof image.alt === "string"
      ? { alt: image.alt.slice(0, 240) }
      : {}),
  };
}

function cleanValue(field: string, value: unknown): unknown {
  if (field === "publishedAt") {
    if (typeof value !== "string" || !value) return undefined;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
  }
  if (field === "videoUrl") {
    if (typeof value !== "string" || !value) return undefined;
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.toString() : undefined;
    } catch {
      return undefined;
    }
  }
  if (field === "slug") {
    const raw = typeof value === "string" ? value : (value as { current?: unknown })?.current;
    return typeof raw === "string" ? { _type: "slug", current: slugify(raw) } : undefined;
  }
  if (field === "body") return portableTextFromInput(value);
  if (["heroImage", "coverImage", "image", "videoPoster"].includes(field)) {
    return cleanImage(value, field);
  }
  if (field === "videoFile") {
    const asset = (value as { asset?: { _ref?: unknown } } | null)?.asset;
    return typeof asset?._ref === "string" && /^file-[A-Za-z0-9-]+$/.test(asset._ref)
      ? { _type: "file", asset: { _type: "reference", _ref: asset._ref } }
      : undefined;
  }
  if (field === "seo" && value && typeof value === "object") {
    const seo = value as { metaTitle?: unknown; metaDescription?: unknown };
    return {
      ...(typeof seo.metaTitle === "string" ? { metaTitle: seo.metaTitle.slice(0, 60) } : {}),
      ...(typeof seo.metaDescription === "string"
        ? { metaDescription: seo.metaDescription.slice(0, 160) }
        : {}),
    };
  }
  if (field === "highlights" && Array.isArray(value)) {
    return value.slice(0, 20).map((item) => {
      const highlight = item as { value?: unknown; label?: unknown };
      return {
        _key: crypto.randomUUID().replaceAll("-", "").slice(0, 12),
        _type: "object",
        value: typeof highlight.value === "string" ? highlight.value.slice(0, 80) : "",
        label: typeof highlight.label === "string" ? highlight.label.slice(0, 120) : "",
      };
    });
  }
  if (typeof value === "string") return value.slice(0, 5000);
  if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return value;
  return undefined;
}

function prepareDocument(
  type: ContentType,
  input: Record<string, unknown>,
  id: string,
  existing?: Record<string, unknown> | null,
) {
  const {
    _rev: _revision,
    _createdAt: _createdAt,
    _updatedAt: _updatedAt,
    ...existingFields
  } = existing ?? {};
  const document: Record<string, unknown> = { ...existingFields, _id: id, _type: type };
  for (const field of editableFields[type]) {
    if (!Object.hasOwn(input, field)) continue;
    if (
      field === "body" &&
      typeof input.body === "string" &&
      plainTextFromPortableText(existing?.body) === input.body
    ) {
      continue;
    }
    const value = cleanValue(field, input[field]);
    if (value !== undefined) document[field] = value;
    else delete document[field];
  }

  if (type !== "homePage" && typeof document.title === "string") {
    const currentSlug = (document.slug as { current?: string } | undefined)?.current;
    document.slug = { _type: "slug", current: currentSlug || slugify(document.title) };
  }
  if (type === "article" && !document.publishedAt) {
    document.publishedAt = new Date().toISOString();
  }
  if (type === "article" && !document.author) document.author = "Silas Paradza";
  if ((type === "service" || type === "galleryItem") && typeof document.order !== "number") {
    document.order = 10;
  }
  if (type === "galleryItem" && !document.category) document.category = "Operations";
  return document;
}

export const GET: APIRoute = async ({ request }) => {
  if (!(await verifyAdminSession(request))) return unauthorizedResponse();
  const client = createAdminSanityClient();
  if (!client) return Response.json({ error: "Sanity write access is not configured." }, { status: 503 });

  const type = new URL(request.url).searchParams.get("type");
  if (type && type !== "all" && !validContentType(type)) {
    return Response.json({ error: "Choose a valid content type." }, { status: 400 });
  }

  try {
    const types = type && type !== "all" ? [type] : [...contentTypes];
    const [documents, draftIds] = await Promise.all([
      client.fetch<Array<{ _id: string } & Record<string, unknown>>>(
      `*[_type in $types] | order(_updatedAt desc)[0...200] {
        ...,
        "heroImage": heroImage { ..., "asset": asset->{ "_ref": _id, url } },
        "coverImage": coverImage { ..., "asset": asset->{ "_ref": _id, url } },
        "image": image { ..., "asset": asset->{ "_ref": _id, url } },
        "videoFile": videoFile { ..., "asset": asset->{ "_ref": _id, url, mimeType } },
        "videoPoster": videoPoster { ..., "asset": asset->{ "_ref": _id, url } }
      }`,
        { types },
        { perspective: "drafts", useCdn: false },
      ),
      client.fetch<string[]>(
        '*[_id in path("drafts.**") && _type in $types]._id',
        { types },
        { perspective: "raw", useCdn: false },
      ),
    ]);
    const draftIdsWithoutPrefix = new Set(draftIds.map((id) => id.slice("drafts.".length)));
    return Response.json(
      { documents: documents.map((document) => ({ ...document, isDraft: draftIdsWithoutPrefix.has(document._id) })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!(await verifyAdminSession(request))) return unauthorizedResponse();
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Request origin not allowed." }, { status: 403 });
  }
  const client = createAdminSanityClient();
  if (!client) return Response.json({ error: "Sanity write access is not configured." }, { status: 503 });

  let body: {
    action?: unknown;
    type?: unknown;
    id?: unknown;
    fields?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The content form was not valid." }, { status: 400 });
  }

  if (!validContentType(body.type)) {
    return Response.json({ error: "Choose a valid content type." }, { status: 400 });
  }
  const type = body.type;
  const action = body.action;
  const id =
    type === "homePage"
      ? "homePage"
      : typeof body.id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(body.id.replace(/^drafts\./, ""))
        ? body.id.replace(/^drafts\./, "")
        : crypto.randomUUID().replaceAll("-", "");
  const draftId = `drafts.${id}`;

  try {
    if (action === "delete") {
      if (type === "homePage") {
        return Response.json({ error: "The homepage cannot be deleted." }, { status: 400 });
      }
      await client.transaction().delete(draftId).delete(id).commit();
      return Response.json({ deleted: true });
    }

    if (action === "save" || action === "publish") {
      if (!body.fields || typeof body.fields !== "object" || Array.isArray(body.fields)) {
        return Response.json({ error: "Add content before saving." }, { status: 400 });
      }
      const existing =
        (await client.getDocument(draftId)) ??
        (await client.getDocument(id) as Record<string, unknown> | null);
      const document = prepareDocument(
        type,
        body.fields as Record<string, unknown>,
        draftId,
        existing as Record<string, unknown> | null,
      );
      const missingRequiredField = requiredFields[type].some((field) => {
        const value = document[field];
        if (field === "body") return !Array.isArray(value) || value.length === 0;
        return typeof value !== "string" || !value.trim();
      });
      if (missingRequiredField) {
        return Response.json(
          { error: "Fill in the required fields before saving or publishing." },
          { status: 400 },
        );
      }
      if (type !== "homePage" && !(document.slug as { current?: string } | undefined)?.current) {
        return Response.json({ error: "Add a title that can be used for the page address." }, { status: 400 });
      }
      await client.createOrReplace(document as Parameters<typeof client.createOrReplace>[0]);

      if (action === "publish") {
        const { _id: _draftId, _rev: _revision, _createdAt, _updatedAt, ...publishedFields } = document;
        await client
          .transaction()
          .createOrReplace({ ...publishedFields, _id: id, _type: type })
          .delete(draftId)
          .commit();
        return Response.json({ published: true, id });
      }
      return Response.json({ saved: true, id: draftId });
    }

    if (action === "publishDraft" && typeof body.id === "string" && body.id.startsWith("drafts.")) {
      const draft = await client.getDocument(body.id);
      if (!draft || draft._type !== type) {
        return Response.json({ error: "That draft could not be found." }, { status: 404 });
      }
      const publishedId = body.id.slice("drafts.".length);
      const { _id: _draftId, _rev: _revision, _createdAt, _updatedAt, ...publishedFields } = draft;
      await client
        .transaction()
        .createOrReplace({ ...publishedFields, _id: publishedId, _type: type })
        .delete(body.id)
        .commit();
      return Response.json({ published: true, id: publishedId });
    }

    return Response.json({ error: "Choose a valid content action." }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
};
