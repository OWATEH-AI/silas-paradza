import type { APIRoute } from "astro";
import { createAdminSanityClient, isSameOriginRequest } from "../../../sanity/lib/admin-auth";
import { PUBLIC_FORM_QUERY } from "../../../sanity/lib/queries";

export const prerender = false;

const maximumRequestSize = 25 * 1024 * 1024;
const maximumFileSize = 10 * 1024 * 1024;
const allowedTypes = new Map([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
]);

type FormField = {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
};

function isValidUpload(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const allowedExtension = allowedTypes.get(file.type);
  if (!allowedExtension || extension !== allowedExtension || file.size > maximumFileSize) return false;
  return true;
}

function safeFilename(value: string): string {
  return value.replace(/[^\w.-]+/g, "_").slice(0, 120) || "attachment";
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const POST: APIRoute = async ({ request, params }) => {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Request origin not allowed." }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maximumRequestSize) {
    return Response.json({ error: "The form and attachments are too large." }, { status: 413 });
  }

  const writeClient = createAdminSanityClient();
  if (!writeClient) {
    return Response.json({ error: "Form submissions are not configured on this website." }, { status: 503 });
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "The submitted form could not be read." }, { status: 400 });
  }
  if (String(formData.get("companyWebsite") ?? "").trim()) {
    return Response.json({ submitted: true }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const form = await writeClient.fetch<{
      _id: string;
      title: string;
      slug: string;
      description?: string;
      delivery?: string;
      destination?: string;
      fields?: FormField[];
    } | null>(PUBLIC_FORM_QUERY, { slug: params.slug }, { perspective: "published", useCdn: false });

    if (!form || !Array.isArray(form.fields) || form.fields.length > 25) {
      return Response.json({ error: "This form is not available." }, { status: 404 });
    }

    const responses: Array<Record<string, unknown>> = [];
    const messageLines = [`Form: ${form.title}`];
    const pendingUploads: Array<{ field: FormField; file: File; responseIndex: number; messageIndex: number }> = [];
    let uploadCount = 0;
    for (const field of form.fields) {
      if (!/^[a-z][a-z0-9_]{0,39}$/.test(field.name) || typeof field.label !== "string" ||
          !["text", "email", "tel", "url", "textarea", "select", "checkbox", "file"].includes(field.type)) {
        return Response.json({ error: "This form is not configured correctly." }, { status: 400 });
      }
      const submitted = formData.get(`field_${field.name}`);
      if (field.type === "file") {
        if (!(submitted instanceof File) || submitted.size === 0) {
          if (field.required) {
            return Response.json({ error: `Please attach ${field.label.toLowerCase()}.` }, { status: 400 });
          }
          continue;
        }
        uploadCount += 1;
        if (uploadCount > 3 || !isValidUpload(submitted)) {
          return Response.json({ error: "Attach up to three PDF, DOCX, JPG, or PNG files under 10 MB each." }, { status: 415 });
        }
        const bytes = new Uint8Array(await submitted.arrayBuffer());
        const fileType = submitted.type;
        const signatureMatches =
          (fileType === "application/pdf" && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") ||
          (fileType === "image/png" && bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10") ||
          (fileType === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ||
          (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && bytes[0] === 80 && bytes[1] === 75 && bytes[2] === 3 && bytes[3] === 4);
        if (!signatureMatches) {
          return Response.json({ error: `${field.label} must be a valid PDF, DOCX, JPG, or PNG file.` }, { status: 415 });
        }
        const responseIndex = responses.length;
        responses.push({
          _key: crypto.randomUUID().replaceAll("-", "").slice(0, 12),
          _type: "object",
          name: field.name,
          label: field.label,
          fileName: safeFilename(submitted.name),
          value: "",
        });
        const messageIndex = messageLines.push(`${field.label}: [attachment]`) - 1;
        pendingUploads.push({ field, file: submitted, responseIndex, messageIndex });
        continue;
      }

      const value = typeof submitted === "string" ? submitted.trim().slice(0, 4000) : "";
      if (field.required && !value) {
        return Response.json({ error: `Please complete ${field.label.toLowerCase()}.` }, { status: 400 });
      }
      if (field.type === "select" && value && !field.options?.includes(value)) {
        return Response.json({ error: `Choose a valid option for ${field.label.toLowerCase()}.` }, { status: 400 });
      }
      if (field.type === "email" && value && !validEmail(value)) {
        return Response.json({ error: "Enter a valid email address." }, { status: 400 });
      }
      if (field.type === "url" && value) {
        try {
          if (!["http:", "https:"].includes(new URL(value).protocol)) throw new Error("Invalid URL");
        } catch {
          return Response.json({ error: `Enter a valid website address for ${field.label.toLowerCase()}.` }, { status: 400 });
        }
      }
      if (field.type === "checkbox" && value && value !== "yes") {
        return Response.json({ error: `Choose a valid response for ${field.label.toLowerCase()}.` }, { status: 400 });
      }
      if (value) {
        responses.push({
          _key: crypto.randomUUID().replaceAll("-", "").slice(0, 12),
          _type: "object",
          name: field.name,
          label: field.label,
          value: field.type === "checkbox" ? "Yes" : value,
        });
        messageLines.push(`${field.label}: ${field.type === "checkbox" ? "Yes" : value}`);
      }
    }

    for (const pending of pendingUploads) {
      const asset = await writeClient.assets.upload("file", pending.file, {
        filename: safeFilename(pending.file.name),
        contentType: pending.file.type,
      });
      responses[pending.responseIndex].file = {
        _type: "file",
        asset: { _type: "reference", _ref: asset._id },
      };
      responses[pending.responseIndex].value = asset.url;
      messageLines[pending.messageIndex] = `${pending.field.label}: ${asset.url}`;
    }

    const sourcePath = new URL(request.url).origin + (String(formData.get("sourcePath") ?? "/").startsWith("/") ? String(formData.get("sourcePath")).slice(0, 300) : "/");
    const submissionId = `drafts.formSubmission-${crypto.randomUUID().replaceAll("-", "")}`;
    await writeClient.create({
      _id: submissionId,
      _type: "formSubmission",
      formId: form._id,
      formTitle: form.title,
      submittedAt: new Date().toISOString(),
      status: "new",
      sourcePath,
      responses,
    });

    const handoffText = messageLines.join("\n").slice(0, 6000);
    let redirect: string | undefined;
    if (form.delivery === "whatsapp" && /^\d{8,15}$/.test(form.destination ?? "")) {
      redirect = `https://wa.me/${form.destination}?text=${encodeURIComponent(handoffText)}`;
    } else if (form.delivery === "email" && form.destination && validEmail(form.destination)) {
      redirect = `mailto:${form.destination}?subject=${encodeURIComponent(`Website enquiry: ${form.title}`)}&body=${encodeURIComponent(handoffText)}`;
    }
    return Response.json(
      { submitted: true, ...(redirect ? { redirect } : {}) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Public form submission failed.", error);
    return Response.json({ error: "Your submission could not be saved. Please try again." }, { status: 502 });
  }
};
