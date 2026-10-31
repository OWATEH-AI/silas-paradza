import type { APIRoute } from "astro";
import {
  createAdminSanityClient,
  isSameOriginRequest,
  unauthorizedResponse,
  verifyAdminSession,
} from "../../../sanity/lib/admin-auth";

const fieldTypes = ["text", "email", "tel", "url", "textarea", "select", "checkbox", "file"] as const;
const contentTypes = ["article", "service", "project", "page"] as const;

function errorResponse(error: unknown): Response {
  console.error("Admin forms API failed.", error);
  return Response.json({ error: "The forms request failed. Please try again." }, { status: 502 });
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value.replace(/^drafts\./, ""));
}

function validSubmissionDraftId(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^(?:drafts\.)?formSubmission-[a-f0-9]{32}$/.test(value)) {
    return undefined;
  }
  return value.startsWith("drafts.") ? value : `drafts.${value}`;
}

function cleanFields(value: unknown): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(value) || value.length < 1 || value.length > 25) return undefined;
  const names = new Set<string>();
  const fields: Array<Record<string, unknown>> = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
    const field = raw as Record<string, unknown>;
    const name = typeof field.name === "string" ? field.name : "";
    const label = typeof field.label === "string" ? field.label.trim().slice(0, 80) : "";
    const type = field.type;
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(name) || names.has(name) || !label || !fieldTypes.includes(type as (typeof fieldTypes)[number])) {
      return undefined;
    }
    names.add(name);
    const options = Array.isArray(field.options)
      ? [...new Set(field.options.filter((option): option is string => typeof option === "string").map((option) => option.trim().slice(0, 80)).filter(Boolean))].slice(0, 30)
      : [];
    if (type === "select" && !options.length) return undefined;
    fields.push({
      _key: crypto.randomUUID().replaceAll("-", "").slice(0, 12),
      _type: "object",
      name,
      label,
      type,
      ...(typeof field.placeholder === "string" && field.placeholder.trim()
        ? { placeholder: field.placeholder.trim().slice(0, 120) }
        : {}),
      required: field.required === true,
      ...(type === "select" ? { options } : {}),
    });
  }
  return fields;
}

function prepareForm(fields: Record<string, unknown>, id: string, existing?: Record<string, unknown> | null) {
  const name = typeof fields.title === "string" ? fields.title.trim().slice(0, 100) : "";
  const slugInput = typeof fields.slug === "string" ? fields.slug : name;
  const slug = slugify(slugInput);
  const cleanFormFields = cleanFields(fields.fields);
  if (!name || !slug || !cleanFormFields) return { error: "Add a form name and at least one valid field." } as const;

  const delivery = ["inbox", "whatsapp", "email", "googleForm"].includes(String(fields.delivery))
    ? String(fields.delivery)
    : "inbox";
  const destination = typeof fields.destination === "string" ? fields.destination.trim().slice(0, 200) : "";
  if (delivery === "whatsapp" && !/^\+?[\d ()-]{8,24}$/.test(destination)) {
    return { error: "Enter a valid WhatsApp number, including its country code." } as const;
  }
  if (delivery === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination)) {
    return { error: "Enter a valid recipient email address." } as const;
  }

  const googleFormUrl = typeof fields.googleFormUrl === "string" ? fields.googleFormUrl.trim() : "";
  if (delivery === "googleForm") {
    try {
      const url = new URL(googleFormUrl);
      if (url.protocol !== "https:" || url.hostname !== "docs.google.com" || !url.pathname.startsWith("/forms/")) {
        return { error: "Use a Google Forms embed URL from docs.google.com." } as const;
      }
    } catch {
      return { error: "Add the Google Forms embed URL." } as const;
    }
  }

  const displayOn = typeof fields.displayOn === "string" ? fields.displayOn : "";
  const [displayOnType, displayOnSlug] = displayOn ? displayOn.split("|", 2) : ["", ""];
  if (displayOn && (!contentTypes.includes(displayOnType as (typeof contentTypes)[number]) || !/^[a-z0-9-]{1,90}$/.test(displayOnSlug))) {
    return { error: "Choose a valid website page to show this form on." } as const;
  }

  const {
    _rev: _revision,
    _createdAt: _createdAt,
    _updatedAt: _updatedAt,
    ...existingFields
  } = existing ?? {};
  return {
    document: {
      ...existingFields,
      _id: id,
      _type: "formDefinition",
      title: name,
      slug: { _type: "slug", current: slug },
      description: typeof fields.description === "string" ? fields.description.trim().slice(0, 300) : "",
      submitLabel: typeof fields.submitLabel === "string" ? fields.submitLabel.trim().slice(0, 40) : "Send message",
      displayOnType,
      displayOnSlug,
      active: fields.active !== false,
      fields: cleanFormFields,
      delivery,
      destination: delivery === "whatsapp" ? destination.replace(/\D/g, "") : destination,
      googleFormUrl: delivery === "googleForm" ? googleFormUrl : "",
    },
  } as const;
}

export const GET: APIRoute = async ({ request }) => {
  if (!(await verifyAdminSession(request))) return unauthorizedResponse();
  const client = createAdminSanityClient();
  if (!client) return Response.json({ error: "Sanity write access is not configured." }, { status: 503 });
  try {
    const [forms, submissions] = await Promise.all([
      client.fetch(
        `*[_type == "formDefinition"] | order(_updatedAt desc)[0...200] {
          ..., "slug": slug.current
        }`,
        {},
        { perspective: "drafts", useCdn: false },
      ),
      client.fetch(
        `*[_type == "formSubmission"] | order(submittedAt desc)[0...500] {
          ..., responses[]{..., "file": file{..., "asset": asset->{_ref, mimeType}}}
        }`,
        {},
        { perspective: "drafts", useCdn: false },
      ),
    ]);
    return Response.json({ forms, submissions }, { headers: { "Cache-Control": "no-store" } });
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

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "The forms request was not valid." }, { status: 400 });
  }

  try {
    if (body.action === "setSubmissionStatus") {
      const submissionId = validSubmissionDraftId(body.id);
      if (!submissionId || !["new", "read", "archived"].includes(String(body.status))) {
        return Response.json({ error: "Choose a valid submission and inbox status." }, { status: 400 });
      }
      const submission = await client.getDocument(submissionId) as Record<string, unknown> | null;
      if (!submission || submission._type !== "formSubmission") {
        return Response.json({ error: "That inbox submission could not be found." }, { status: 404 });
      }
      await client.patch(submissionId).set({ status: body.status }).commit();
      return Response.json({ updated: true });
    }

    if (body.action === "deleteSubmission") {
      const submissionId = validSubmissionDraftId(body.id);
      if (!submissionId) return Response.json({ error: "Choose a valid inbox submission to delete." }, { status: 400 });
      const submission = await client.getDocument(submissionId) as Record<string, unknown> | null;
      if (!submission || submission._type !== "formSubmission") {
        return Response.json({ error: "That inbox submission could not be found." }, { status: 404 });
      }
      await client.delete(submissionId);
      return Response.json({ deleted: true });
    }

    if (body.action === "delete") {
      if (!validId(body.id)) return Response.json({ error: "Choose a valid form to delete." }, { status: 400 });
      const id = body.id.replace(/^drafts\./, "");
      await client.transaction().delete(`drafts.${id}`).delete(id).commit();
      return Response.json({ deleted: true });
    }

    if (body.action !== "save" && body.action !== "publish" && body.action !== "publishDraft") {
      return Response.json({ error: "Choose a valid form action." }, { status: 400 });
    }
    if (body.action === "publishDraft") {
      if (typeof body.id !== "string" || !body.id.startsWith("drafts.") || !validId(body.id)) {
        return Response.json({ error: "Choose a valid form draft." }, { status: 400 });
      }
      const draft = await client.getDocument(body.id) as Record<string, unknown> | null;
      if (!draft || draft._type !== "formDefinition") {
        return Response.json({ error: "That form draft could not be found." }, { status: 404 });
      }
      const publishedId = body.id.slice("drafts.".length);
      const { _id: _draftId, _rev: _revision, _createdAt, _updatedAt, ...publishedFields } = draft;
      await client.transaction()
        .createOrReplace({ ...publishedFields, _id: publishedId, _type: "formDefinition" })
        .delete(body.id)
        .commit();
      return Response.json({ published: true, id: publishedId });
    }

    if (!body.fields || typeof body.fields !== "object" || Array.isArray(body.fields)) {
      return Response.json({ error: "Add form details before saving." }, { status: 400 });
    }
    const id = body.id === "" || body.id === undefined
      ? `form-${crypto.randomUUID().replaceAll("-", "")}`
      : validId(body.id) ? body.id.replace(/^drafts\./, "") : "";
    if (!id) return Response.json({ error: "Choose a valid form." }, { status: 400 });
    const draftId = `drafts.${id}`;
    const existing = (await client.getDocument(draftId) ?? await client.getDocument(id)) as Record<string, unknown> | null;
    const prepared = prepareForm(body.fields as Record<string, unknown>, draftId, existing);
    if ("error" in prepared) return Response.json({ error: prepared.error }, { status: 400 });
    const slug = (prepared.document.slug as { current: string }).current;
    const conflictingForm = await client.fetch<string | undefined>(
      `*[_type == "formDefinition" && slug.current == $slug && _id != $id && _id != $draftId][0]._id`,
      { slug, id, draftId },
      { perspective: "drafts", useCdn: false },
    );
    if (conflictingForm) {
      return Response.json({ error: "Another form already uses that page address. Choose a different one." }, { status: 409 });
    }
    await client.createOrReplace(prepared.document as Parameters<typeof client.createOrReplace>[0]);

    if (body.action === "publish") {
      const draftDocument = prepared.document as Record<string, unknown>;
      const { _id: _draftId, _rev: _revision, _createdAt, _updatedAt, ...publishedFields } = draftDocument;
      await client.transaction()
        .createOrReplace({ ...publishedFields, _id: id, _type: "formDefinition" })
        .delete(draftId)
        .commit();
      return Response.json({ published: true, id });
    }
    return Response.json({ saved: true, id: draftId });
  } catch (error) {
    return errorResponse(error);
  }
};
