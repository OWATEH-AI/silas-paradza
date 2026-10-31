type ContentType = "homePage" | "article" | "service" | "project" | "page" | "galleryItem";
type AdminSection = "overview" | ContentType | "forms";
type FormFieldType = "text" | "email" | "tel" | "url" | "textarea" | "select" | "checkbox" | "file";

type AdminFormField = {
  name: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  required: boolean;
  options?: string[];
};

type AdminForm = {
  _id: string;
  _type: "formDefinition";
  isDraft?: boolean;
  title: string;
  slug?: string;
  description?: string;
  submitLabel?: string;
  displayMode?: "popup" | "inline";
  ctaLabel?: string;
  ctaVariant?: "primary" | "outline" | "text";
  displayOnType?: string;
  displayOnSlug?: string;
  active?: boolean;
  delivery?: string;
  destination?: string;
  googleFormUrl?: string;
  fields: AdminFormField[];
};

type FormSubmissionRecord = {
  _id: string;
  formTitle?: string;
  submittedAt?: string;
  status?: "new" | "read" | "archived";
  sourcePath?: string;
  responses?: Array<{
    label?: string;
    value?: string;
    fileName?: string;
    file?: { asset?: { _ref?: string } };
  }>;
};

type DocumentRecord = {
  _id: string;
  _type: ContentType;
  isDraft?: boolean;
  title?: string;
  heroTitle?: string;
  slug?: { current?: string };
  summary?: string;
  excerpt?: string;
  body?: Array<{ children?: Array<{ text?: string }> }>;
  [key: string]: unknown;
};

type UploadedAsset = { _ref: string; url: string; type: "image" | "file" };

import { imageUrl } from "../sanity/lib/image-url";

const root = document.querySelector<HTMLElement>("#admin-root");
root?.addEventListener("click", (event) => {
  if ((event.target as HTMLElement).closest('[data-action="theme"]')) toggleTheme();
});
const labels: Record<ContentType, string> = {
  homePage: "Homepage",
  article: "News & insights",
  service: "Services",
  project: "Projects",
  page: "Website pages",
  galleryItem: "Gallery",
};
const singularLabels: Record<ContentType, string> = {
  homePage: "homepage",
  article: "news story",
  service: "service",
  project: "project",
  page: "page",
  galleryItem: "gallery item",
};
const state = {
  active: "overview" as AdminSection,
  documents: [] as DocumentRecord[],
  forms: [] as AdminForm[],
  submissions: [] as FormSubmissionRecord[],
  editing: null as DocumentRecord | null,
  editingForm: null as AdminForm | null,
  formsTab: "forms" as "forms" | "inbox",
  builderFields: [] as AdminFormField[],
  uploads: {} as Record<string, UploadedAsset>,
  filter: "",
  returnFocusId: "",
};

function themeButton(): string {
  const isDark = document.documentElement.dataset.theme === "dark";
  return `<button type="button" class="admin-theme-toggle" data-action="theme" aria-label="Switch to ${isDark ? "light" : "dark"} mode" title="Switch to ${isDark ? "light" : "dark"} mode"><svg class="admin-theme-icon admin-theme-icon--sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path></svg><svg class="admin-theme-icon admin-theme-icon--moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z"></path></svg><span>${isDark ? "Light mode" : "Dark mode"}</span></button>`;
}

function toggleTheme(): void {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  try {
    localStorage.setItem("silas-admin-theme", nextTheme);
  } catch {
    // Keep the theme switch usable when browser storage is disabled.
  }
  root?.querySelectorAll<HTMLButtonElement>('[data-action="theme"]').forEach((button) => {
    button.setAttribute("aria-label", `Switch to ${nextTheme === "dark" ? "light" : "dark"} mode`);
    button.title = `Switch to ${nextTheme === "dark" ? "light" : "dark"} mode`;
    button.innerHTML =
      nextTheme === "dark"
        ? '<svg class="admin-theme-icon admin-theme-icon--moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z"></path></svg><span>Light mode</span>'
        : '<svg class="admin-theme-icon admin-theme-icon--sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path></svg><span>Dark mode</span>';
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .flatMap((block) => (block as { children?: Array<{ text?: string }> }).children ?? [])
      .map((child) => child.text ?? "")
      .join("\n\n");
  }
  return "";
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", ...init });
  const result = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "Something went wrong. Please try again.");
  return result;
}

function field(
  label: string,
  name: string,
  value = "",
  options: { type?: string; placeholder?: string; required?: boolean; multiline?: boolean; hint?: string } = {},
): string {
  const id = `field-${name}`;
  const required = options.required ? "required" : "";
  const placeholder = options.placeholder ? `placeholder="${escapeHtml(options.placeholder)}"` : "";
  const hint = options.hint ? `<small>${escapeHtml(options.hint)}</small>` : "";
  const input =
    options.multiline
      ? `<textarea id="${id}" name="${name}" rows="5" ${required} ${placeholder}>${escapeHtml(value)}</textarea>`
      : `<input id="${id}" name="${name}" type="${options.type ?? "text"}" value="${escapeHtml(value)}" ${required} ${placeholder} />`;
  return `<label class="admin-field" for="${id}"><span>${escapeHtml(label)}${options.required ? " *" : ""}</span>${input}${hint}</label>`;
}

function selectField(label: string, name: string, value: string, choices: string[]): string {
  return `<label class="admin-field" for="field-${name}"><span>${escapeHtml(label)}</span><select id="field-${name}" name="${name}">${choices
    .map((choice) => `<option value="${escapeHtml(choice)}" ${value === choice ? "selected" : ""}>${escapeHtml(choice)}</option>`)
    .join("")}</select></label>`;
}

function checkbox(label: string, name: string, checked: boolean): string {
  return `<label class="admin-check"><input type="checkbox" name="${name}" ${checked ? "checked" : ""} /><span>${escapeHtml(label)}</span></label>`;
}

function imageHotspotField(key: string, image: { hotspot?: { x?: number; y?: number } } | undefined): string {
  const x = Math.min(75, Math.max(25, Math.round((image?.hotspot?.x ?? 0.5) * 100)));
  const y = Math.min(75, Math.max(25, Math.round((image?.hotspot?.y ?? 0.5) * 100)));
  return `<fieldset class="admin-hotspot"><legend>Choose the focal point</legend><label for="field-${key}HotspotX">Left to right <output data-hotspot-output="${key}HotspotX">${x}%</output></label><input id="field-${key}HotspotX" name="${key}HotspotX" type="range" min="25" max="75" value="${x}" data-hotspot="${key}" /><label for="field-${key}HotspotY">Top to bottom <output data-hotspot-output="${key}HotspotY">${y}%</output></label><input id="field-${key}HotspotY" name="${key}HotspotY" type="range" min="25" max="75" value="${y}" data-hotspot="${key}" /><small>Keep the important subject in view when the image is cropped on different screens.</small></fieldset>`;
}

function mediaField(label: string, key: string, doc: DocumentRecord | null): string {
  const asset = doc?.[key] as { asset?: { _ref?: string; url?: string }; alt?: string; hotspot?: { x?: number; y?: number } } | undefined;
  const existingRef = asset?.asset?._ref;
  const uploaded = state.uploads[key];
  const imageUrl = uploaded?.url ?? asset?.asset?.url;
  const value = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="" />`
    : existingRef
      ? `<span class="admin-media-current">A media file is attached</span>`
      : `<span class="admin-media-empty">No media selected</span>`;
  return `<div class="admin-upload"><span>${escapeHtml(label)}</span><span class="admin-media-preview" data-media-preview="${escapeHtml(key)}">${value}</span><input type="file" data-upload="${escapeHtml(key)}" accept="image/*" /><small>Choose an image from this device.</small>${imageHotspotField(key, asset)}${key === "heroImage" ? "" : `<label class="admin-field admin-alt-field" for="field-${key}Alt"><span>Image description</span><input id="field-${key}Alt" name="${key}Alt" value="${escapeHtml(asset?.alt ?? "")}" placeholder="Describe the photo for visitors who use screen readers" /></label>`}</div>`;
}

function videoUploadField(doc: DocumentRecord | null): string {
  const file = doc?.videoFile as { asset?: { _ref?: string; url?: string } } | undefined;
  const uploaded = state.uploads.videoFile;
  const url = uploaded?.url ?? (file?.asset?._ref
    ? `/api/admin/assets/${encodeURIComponent(file.asset._ref)}`
    : file?.asset?.url);
  const status = url
    ? `<video class="admin-video-preview" controls width="640" height="360" playsinline preload="none" src="${escapeHtml(url)}" aria-label="Uploaded video preview"></video>`
    : `<span class="admin-media-empty">No video uploaded</span>`;
  const poster = doc?.videoPoster as { asset?: { _ref?: string; url?: string }; alt?: string; hotspot?: { x?: number; y?: number } } | undefined;
  const posterUrl = state.uploads.videoPoster?.url ?? poster?.asset?.url;
  const posterValue = posterUrl
    ? `<img src="${escapeHtml(posterUrl)}" alt="" />`
    : `<span class="admin-media-empty">Add an image to make the video cover</span>`;
  return `<div class="admin-video-fields"><label class="admin-upload"><span>Upload a video</span><span class="admin-media-preview" data-media-preview="videoFile">${status}</span><input type="file" data-upload="videoFile" accept="video/*" /><small>Direct uploads are limited to 90 MB. For larger videos, paste a hosted video URL below.</small></label><div class="admin-upload"><span>Video thumbnail</span><span class="admin-media-preview" data-media-preview="videoPoster">${posterValue}</span><input type="file" data-upload="videoPoster" accept="image/*" /><small>This image appears before a visitor plays the video.</small>${imageHotspotField("videoPoster", poster)}<label class="admin-field admin-alt-field" for="field-videoPosterAlt"><span>Thumbnail description</span><input id="field-videoPosterAlt" name="videoPosterAlt" value="${escapeHtml(poster?.alt ?? "")}" placeholder="Describe the video thumbnail" /></label></div></div>`;
}

function editorFields(type: ContentType, doc: DocumentRecord | null): string {
  const value = (name: string) => (doc?.[name] as string | undefined) ?? "";
  const checked = (name: string, fallback = false) =>
    typeof doc?.[name] === "boolean" ? Boolean(doc[name]) : fallback;
  const content = (name: string) => text(doc?.[name]);
  const video = value("videoUrl");
  const videoFields = `<div class="admin-video-fields">${field("Video URL", "videoUrl", video, {
    type: "url",
    placeholder: "https://…",
    hint: "Paste a YouTube, Vimeo, or hosted MP4 link, or upload a video file.",
  })}${videoUploadField(doc)}</div>`;

  if (type === "homePage") {
    return `<div class="admin-form-section"><h3>Welcome area</h3>${field("Main headline", "heroTitle", value("heroTitle"), { required: true })}${field("Highlighted words", "heroHighlight", value("heroHighlight"))}${field("Short introduction", "heroSubtitle", value("heroSubtitle"), { multiline: true, required: true })}${mediaField("Welcome background image", "heroImage", doc)}</div><div class="admin-form-section"><h3>About Silas</h3>${field("About heading", "aboutHeading", value("aboutHeading"))}${field("Short motto", "aboutMotto", value("aboutMotto"))}${field("About text", "aboutBody", value("aboutBody"), { multiline: true })}</div><div class="admin-form-section"><h3>Contact details</h3>${field("Phone", "phone", value("phone"), { type: "tel" })}${field("Email", "email", value("email"), { type: "email" })}${field("WhatsApp number", "whatsAppNumber", value("whatsAppNumber"), { type: "tel", hint: "International format, without spaces." })}</div>`;
  }

  if (type === "article") {
    const publishedAt = value("publishedAt");
    const dateInput = publishedAt ? publishedAt.slice(0, 16) : new Date().toISOString().slice(0, 16);
    return `<div class="admin-form-section"><h3>Write your story</h3>${field("Story headline", "title", value("title"), { required: true })}${field("Short summary", "excerpt", value("excerpt"), { multiline: true, required: true })}${selectField("Topic", "category", value("category") || "Company news", ["Company news", "Mining", "Transport & logistics", "Community", "Business development", "Other"])}${field("Article text", "body", content("body"), { multiline: true, required: true, hint: "Write paragraphs on separate lines." })}${field("Publication date", "publishedAt", dateInput, { type: "datetime-local", required: true })}${checkbox("Feature this story on the homepage", "featured", checked("featured"))}</div><div class="admin-form-section"><h3>Photos and video</h3>${mediaField("Story cover image", "coverImage", doc)}${videoFields}</div>`;
  }

  if (type === "service") {
    return `<div class="admin-form-section"><h3>Service details</h3>${field("Service name", "title", value("title"), { required: true })}${selectField("Category", "category", value("category") || "Other", ["Mining", "Transport", "Driving school", "Consulting", "Other"])}${field("Short introduction", "summary", value("summary"), { multiline: true, required: true })}${field("Full description", "body", content("body"), { multiline: true })}${checkbox("Show on homepage", "featured", checked("featured", true))}${checkbox("Currently available", "isActive", checked("isActive", true))}</div><div class="admin-form-section"><h3>Photos and video</h3>${mediaField("Service cover image", "coverImage", doc)}${videoFields}</div>`;
  }

  if (type === "project") {
    return `<div class="admin-form-section"><h3>Project details</h3>${field("Project name", "title", value("title"), { required: true })}${selectField("Status", "status", value("status") || "Operational", ["Active operation", "Operational", "Completed", "Planned"])}${field("Location", "location", value("location"))}${field("Short introduction", "summary", value("summary"), { multiline: true, required: true })}${field("Full description", "body", content("body"), { multiline: true })}${checkbox("Feature this project on the homepage", "featured", checked("featured", true))}</div><div class="admin-form-section"><h3>Photos and video</h3>${mediaField("Project cover image", "coverImage", doc)}${videoFields}</div>`;
  }

  if (type === "page") {
    return `<div class="admin-form-section"><h3>Page content</h3>${field("Page title", "title", value("title"), { required: true })}${field("Short introduction", "summary", value("summary"), { multiline: true })}${field("Page text", "body", content("body"), { multiline: true, hint: "Write paragraphs on separate lines." })}${checkbox("Show this page in website navigation", "showInNavigation", checked("showInNavigation", true))}</div><div class="admin-form-section"><h3>Photos and video</h3>${mediaField("Page cover image", "coverImage", doc)}${videoFields}</div>`;
  }

  return `<div class="admin-form-section"><h3>Gallery details</h3>${field("Caption", "title", value("title"), { required: true })}${selectField("Category", "category", value("category") || "Operations", ["Mining", "Transport", "Corporate", "Operations", "Driving school"])}${checkbox("Show in homepage gallery", "showOnHome", checked("showOnHome", true))}</div><div class="admin-form-section"><h3>Photos and video</h3>${mediaField("Gallery photo", "image", doc)}${videoFields}</div>`;
}

function editorMarkup(type: ContentType, doc: DocumentRecord | null): string {
  const isHome = type === "homePage";
  const isNew = !doc?._id;
  const title = isHome
    ? "Edit homepage"
    : isNew
      ? `Create ${singularLabels[type]}`
      : `Edit ${doc?.title ?? "content"}`;
  return `<dialog class="admin-editor-drawer" aria-labelledby="editor-title"><div class="admin-drawer-panel"><header class="admin-drawer-header"><div><p class="admin-eyebrow">${isHome ? "WEBSITE CONTENT" : escapeHtml(labels[type]).toUpperCase()}</p><h1 id="editor-title">${escapeHtml(title)}</h1><p>Work through each tab, then save a draft or publish your changes.</p></div><button class="admin-drawer-close" type="button" data-action="cancel" aria-label="Close editor">×</button></header><form id="admin-content-form" class="admin-form"><nav class="admin-editor-tabs" role="tablist" aria-label="Content sections"></nav><div class="admin-editor-workspace"><div class="admin-form-sections">${editorFields(type, doc)}</div><aside class="admin-live-preview" aria-label="Live website preview"><div class="admin-preview-toolbar"><div><strong>Live preview</strong><small>Updates as you edit</small></div><div class="admin-preview-devices" role="group" aria-label="Preview size"><button type="button" class="is-active" data-preview-device="desktop" aria-pressed="true">Desktop</button><button type="button" data-preview-device="mobile" aria-pressed="false">Mobile</button></div></div><div class="admin-preview-frame-wrap"><iframe class="admin-preview-frame" title="Website draft preview" sandbox="allow-same-origin"></iframe></div></aside></div><div class="admin-form-actions"><button class="admin-button admin-button--quiet" type="button" data-action="cancel">Cancel</button>${doc?._id && !isHome ? '<button class="admin-button admin-button--danger" type="button" data-action="delete">Delete</button>' : ""}<button class="admin-button admin-button--secondary" type="submit" data-submit="save">Save draft</button><button class="admin-button admin-button--primary" type="submit" data-submit="publish">Publish to website</button></div><p class="admin-form-message" role="status"></p></form></div></dialog>`;
}

function listRow(doc: DocumentRecord): string {
  const title = documentTitle(doc);
  const location = doc.slug?.current
    ? `/${doc._type === "article" ? "news" : doc._type === "service" ? "services" : doc._type === "project" ? "projects" : doc._type === "page" ? "pages" : ""}/${doc.slug.current}`
    : labels[doc._type];
  return `<div class="admin-list-row"><button type="button" class="admin-list-open" data-edit-id="${escapeHtml(doc._id)}"><span class="admin-list-icon">${escapeHtml((title[0] || "S").toUpperCase())}</span><span class="admin-list-text"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(location)}</small></span><span class="admin-status ${statusOf(doc) === "Draft" ? "admin-status--draft" : ""}">${statusOf(doc)}</span><span class="admin-list-arrow" aria-hidden="true">→</span></button><div class="admin-list-actions"><button type="button" class="admin-list-action" data-edit-id="${escapeHtml(doc._id)}" aria-label="Edit ${escapeHtml(title)}">Edit</button>${doc._type === "homePage" ? "" : `<button type="button" class="admin-list-action admin-list-action--delete" data-delete-id="${escapeHtml(doc._id)}" aria-label="Delete ${escapeHtml(title)}">Delete</button>`}</div></div>`;
}

function sidebar(): string {
  const items: Array<[AdminSection, string]> = [
    ["overview", "Overview"],
    ["homePage", "Homepage"],
    ["article", "News & insights"],
    ["service", "Services"],
    ["project", "Projects"],
    ["page", "Website pages"],
    ["galleryItem", "Gallery"],
    ["forms", "Forms & inbox"],
  ];
  return `<aside class="admin-sidebar"><a class="admin-brand" href="/"><span class="admin-brand-mark">S</span><span><strong>SILAS</strong><small>WEBSITE DESK</small></span></a><p class="admin-nav-label">CONTENT</p><nav aria-label="Content management">${items
    .map(
      ([key, label]) =>
        `<button class="admin-nav-item ${state.active === key ? "is-active" : ""}" type="button" data-nav="${key}"><span class="admin-nav-dot"></span>${label}</button>`,
    )
    .join("")}</nav><div class="admin-sidebar-bottom"><span class="admin-avatar">SP</span><span><strong>Website editor</strong><small>Silas Paradza</small></span><button type="button" class="admin-logout" data-action="logout" aria-label="Sign out">↗</button></div></aside>`;
}

function documentTitle(doc: DocumentRecord): string {
  return doc.title || doc.heroTitle || "Untitled";
}

function statusOf(doc: DocumentRecord): string {
  return doc.isDraft ? "Draft" : "Published";
}

function listing(type: ContentType): string {
  const items = state.documents.filter((doc) => doc._type === type);
  const filtered = items.filter((doc) =>
    documentTitle(doc).toLowerCase().includes(state.filter.toLowerCase()),
  );
  return `<section class="admin-content"><div class="admin-page-heading"><div><p class="admin-eyebrow">YOUR CONTENT</p><h1>${escapeHtml(labels[type])}</h1><p class="admin-subtitle">Create, update, and publish website ${escapeHtml(labels[type].toLowerCase())}.</p></div>${type === "homePage" ? "" : `<button class="admin-button admin-button--primary" data-action="new">＋ Create ${escapeHtml(labels[type].replace(/s$/, "").toLowerCase())}</button>`}</div><div class="admin-toolbar"><label class="admin-search"><span aria-hidden="true">⌕</span><input type="search" id="content-search" placeholder="Search ${escapeHtml(labels[type].toLowerCase())}" value="${escapeHtml(state.filter)}" /></label><span>${filtered.length} ${filtered.length === 1 ? "item" : "items"}</span></div>${filtered.length ? `<div class="admin-list">${filtered.map(listRow).join("")}</div>` : `<div class="admin-empty"><span class="admin-empty-mark">＋</span><h2>${state.filter ? "No matching content" : `No ${escapeHtml(labels[type].toLowerCase())} yet`}</h2><p>${state.filter ? "Try a different search." : "Create your first item and it will be ready for preview before publishing."}</p>${state.filter ? "" : `<button class="admin-button admin-button--primary" data-action="new">Create your first item</button>`}</div>`}</section>`;
}

function formTargetLabel(form: AdminForm): string {
  if (!form.displayOnType || !form.displayOnSlug) return `Standalone page /forms/${form.slug || "…"}`;
  const target = state.documents.find(
    (doc) => doc._type === form.displayOnType && doc.slug?.current === form.displayOnSlug,
  );
  const placement = form.displayMode === "inline" ? "Inline on" : "Popup on";
  return target ? `${placement} ${documentTitle(target)}` : `${placement} ${form.displayOnSlug}`;
}

function formFieldRows(fields: AdminFormField[]): string {
  const types: FormFieldType[] = ["text", "email", "tel", "url", "textarea", "select", "checkbox", "file"];
  return fields.map((item, index) => `<fieldset class="admin-form-field-row" data-builder-field="${escapeHtml(item.name)}"><legend>Field ${index + 1}</legend><input type="hidden" data-builder-name value="${escapeHtml(item.name)}" /><label class="admin-field"><span>Visitor-facing label</span><input type="text" data-builder-label value="${escapeHtml(item.label)}" maxlength="80" required /></label><label class="admin-field"><span>Field type</span><select data-builder-type>${types.map((type) => `<option value="${type}" ${item.type === type ? "selected" : ""}>${type === "textarea" ? "Long answer" : type === "tel" ? "Phone number" : type === "file" ? "Document upload" : type.charAt(0).toUpperCase() + type.slice(1)}</option>`).join("")}</select></label><label class="admin-field"><span>Placeholder or hint</span><input type="text" data-builder-placeholder value="${escapeHtml(item.placeholder || "")}" maxlength="120" /></label><label class="admin-field"><span>Choices (select only, comma separated)</span><input type="text" data-builder-options value="${escapeHtml((item.options || []).join(", "))}" placeholder="Option one, Option two" /></label><label class="admin-check"><input type="checkbox" data-builder-required ${item.required ? "checked" : ""} /><span>Required field</span></label><button class="admin-list-action admin-list-action--delete" type="button" data-builder-remove="${escapeHtml(item.name)}" aria-label="Remove ${escapeHtml(item.label)}">Remove field</button></fieldset>`).join("");
}

function formEditorMarkup(form: AdminForm): string {
  const currentTarget = form.displayOnType && form.displayOnSlug
    ? `${form.displayOnType}|${form.displayOnSlug}`
    : "";
  const seenTargets = new Set<string>();
  const targetOptions = state.documents
    .filter((doc) => ["article", "service", "project", "page"].includes(doc._type) && Boolean(doc.slug?.current))
    .filter((doc) => {
      const key = `${doc._type}|${doc.slug?.current}`;
      if (seenTargets.has(key)) return false;
      seenTargets.add(key);
      return true;
    })
    .map((doc) => {
      const value = `${doc._type}|${doc.slug?.current}`;
      return `<option value="${escapeHtml(value)}" ${currentTarget === value ? "selected" : ""}>${escapeHtml(labels[doc._type])}: ${escapeHtml(documentTitle(doc))}</option>`;
    })
    .join("");
  const options = [["inbox", "Website inbox"], ["whatsapp", "WhatsApp handoff"], ["email", "Email handoff"], ["googleForm", "Embedded Google Form"]];
  const displayModes = [["popup", "Button opens a popup"], ["inline", "Show form inline on the page"]];
  const ctaVariants = [["primary", "Featured gold button"], ["outline", "Outlined button"], ["text", "Simple text link"]];
  const isDraft = form.isDraft === true || form._id.startsWith("drafts.");
  const id = form._id.replace(/^drafts\./, "");
  return `<dialog class="admin-form-builder-dialog" aria-labelledby="form-builder-title"><form id="admin-form-builder" class="admin-form-builder" novalidate><header class="admin-form-builder-header"><div><p class="admin-eyebrow">FORM BUILDER</p><h1 id="form-builder-title">${form._id ? `Edit ${escapeHtml(form.title || "form")}` : "Create a form"}</h1><p>Choose where visitors find this form, how its button looks, and where submissions go.</p></div><button class="admin-dialog-close" type="button" data-form-action="close" aria-label="Close form builder">×</button></header><div class="admin-form-builder-body"><section class="admin-form-builder-section"><h2>Form details</h2><label class="admin-field"><span>Form name</span><input name="title" value="${escapeHtml(form.title)}" maxlength="100" required /></label><label class="admin-field"><span>Standalone form page address</span><input name="slug" value="${escapeHtml(form.slug || "")}" placeholder="Generated from the form name" maxlength="80" /><small>Every published form has its own page at /forms/your-address.</small></label><label class="admin-field"><span>Introduction</span><textarea name="description" rows="3" maxlength="300">${escapeHtml(form.description || "")}</textarea></label><label class="admin-field"><span>Send button label</span><input name="submitLabel" value="${escapeHtml(form.submitLabel || "Send message")}" maxlength="40" /></label><label class="admin-field"><span>Where should this form appear?</span><select name="displayOn"><option value="">Standalone form page only</option>${targetOptions}</select><small>Newly published pages appear in this list. Selecting one places this form on that page instead of adding it to the navigation.</small></label><label class="admin-field"><span>Page presentation</span><select name="displayMode">${displayModes.map(([value, label]) => `<option value="${value}" ${(form.displayMode || "popup") === value ? "selected" : ""}>${label}</option>`).join("")}</select></label><label class="admin-field"><span>Page call-to-action button text</span><input name="ctaLabel" value="${escapeHtml(form.ctaLabel || "Send an enquiry")}" maxlength="50" placeholder="Apply now, Request a quote…" /></label><label class="admin-field"><span>Page call-to-action style</span><select name="ctaVariant">${ctaVariants.map(([value, label]) => `<option value="${value}" ${(form.ctaVariant || "primary") === value ? "selected" : ""}>${label}</option>`).join("")}</select></label><label class="admin-check"><input type="checkbox" name="active" ${form.active === false ? "" : "checked"} /><span>Accept submissions when published</span></label></section><section class="admin-form-builder-section"><div class="admin-form-builder-section-heading"><div><h2>Visitor fields</h2><p>Set each field to required or optional.</p></div><button class="admin-button admin-button--secondary" type="button" data-form-action="add-field">＋ Add field</button></div><div class="admin-builder-fields">${formFieldRows(state.builderFields)}</div></section><section class="admin-form-builder-section"><h2>After Send</h2><label class="admin-field"><span>Submission destination</span><select name="delivery">${options.map(([value, label]) => `<option value="${value}" ${(form.delivery || "inbox") === value ? "selected" : ""}>${label}</option>`).join("")}</select></label><label class="admin-field"><span>WhatsApp number or email address</span><input name="destination" value="${escapeHtml(form.destination || "")}" placeholder="Country code + number or recipient@example.com" /></label><label class="admin-field"><span>Google Forms embed URL</span><input name="googleFormUrl" type="url" value="${escapeHtml(form.googleFormUrl || "")}" placeholder="https://docs.google.com/forms/d/e/…/viewform?embedded=true" /></label><p class="admin-form-note">Website inbox saves submissions to Sanity. WhatsApp/email saves first, then opens the visitor’s contact app with a prepared message. Google Forms submissions are collected by Google, not this inbox. Uploaded files are public Sanity CDN assets; do not request highly confidential documents.</p></section></div><footer class="admin-form-builder-actions"><button class="admin-button admin-button--quiet" type="button" data-form-action="close">Cancel</button>${form._id ? `<button class="admin-button admin-button--danger" type="button" data-form-action="delete" data-form-id="${escapeHtml(form._id)}">Delete form</button>` : ""}<button class="admin-button admin-button--secondary" type="submit" data-form-submit="save">Save draft</button><button class="admin-button admin-button--primary" type="submit" data-form-submit="publish">Publish form</button></footer><p class="admin-form-builder-message" role="status"></p><input type="hidden" name="id" value="${escapeHtml(id)}" /><input type="hidden" name="draft" value="${isDraft}" /></form></dialog>`;
}

function formsDashboard(): string {
  const showingInbox = state.formsTab === "inbox";
  const formsContent = state.forms.length
    ? `<div class="admin-list">${state.forms.map((form) => {
        const draft = form.isDraft === true || form._id.startsWith("drafts.");
        const publishId = form._id.startsWith("drafts.") ? form._id : `drafts.${form._id}`;
        const href = form.slug ? `/forms/${encodeURIComponent(form.slug)}` : "";
        const formLink = href && !draft && form.active !== false
          ? `<a class="admin-form-route" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">Preview form ↗</a>`
          : escapeHtml(href);
        return `<div class="admin-list-row"><span class="admin-list-icon">F</span><span class="admin-list-text"><strong>${escapeHtml(form.title || "Untitled form")}</strong><small>${escapeHtml(formTargetLabel(form))} · ${formLink}</small></span><span class="admin-status ${draft ? "admin-status--draft" : ""}">${draft ? "Draft" : form.active === false ? "Paused" : "Live"}</span><span class="admin-list-actions"><button type="button" class="admin-list-action" data-edit-form="${escapeHtml(form._id)}">Edit</button>${draft ? `<button type="button" class="admin-list-action" data-publish-form="${escapeHtml(publishId)}">Publish</button>` : ""}<button type="button" class="admin-list-action admin-list-action--delete" data-delete-form="${escapeHtml(form._id)}">Delete</button></span></div>`;
      }).join("")}</div>`
    : `<div class="admin-empty"><span class="admin-empty-mark">＋</span><h2>No forms yet</h2><p>Create a reusable form, choose its fields, and publish it as a page or popup on a news story, service, project, or website page.</p><button class="admin-button admin-button--primary" type="button" data-form-action="new">Create your first form</button></div>`;
  const submissionsContent = state.submissions.length
    ? `<div class="admin-submission-list">${state.submissions.map((submission) => {
        const submitted = submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "Date unavailable";
        const responses = (submission.responses ?? []).map((response) => {
          const assetId = response.file?.asset?._ref;
          const answer = assetId
            ? `<a href="/api/admin/assets/${encodeURIComponent(assetId)}">${escapeHtml(response.fileName || "Download attachment")}</a>`
            : escapeHtml(response.value || "—");
          return `<div class="admin-submission-answer"><strong>${escapeHtml(response.label || "Answer")}</strong><span>${answer}</span></div>`;
        }).join("");
        const source = typeof submission.sourcePath === "string" && submission.sourcePath.startsWith("/")
          ? submission.sourcePath
          : "";
        return `<article class="admin-submission-card"><header><div><p class="admin-eyebrow">${escapeHtml(submission.formTitle || "Website form")}</p><h2>${escapeHtml(submitted)}</h2>${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noreferrer">${escapeHtml(source)}</a>` : ""}</div><span class="admin-status ${submission.status === "new" ? "admin-status--draft" : ""}">${escapeHtml(submission.status || "new")}</span></header><div class="admin-submission-answers">${responses || "<p>No answers saved.</p>"}</div><footer><label class="admin-field"><span>Inbox status</span><select data-submission-status="${escapeHtml(submission._id)}"><option value="new" ${submission.status === "new" ? "selected" : ""}>New</option><option value="read" ${submission.status === "read" ? "selected" : ""}>Read</option><option value="archived" ${submission.status === "archived" ? "selected" : ""}>Archived</option></select></label><div class="admin-form-actions"><button class="admin-button admin-button--secondary" type="button" data-save-submission="${escapeHtml(submission._id)}">Save status</button><button class="admin-button admin-button--danger" type="button" data-delete-submission="${escapeHtml(submission._id)}">Delete submission</button></div></footer></article>`;
      }).join("")}</div>`
    : `<div class="admin-empty"><span class="admin-empty-mark">↙</span><h2>Your inbox is clear</h2><p>Native form responses and uploaded documents appear here after someone submits a published form.</p></div>`;
  return `<section class="admin-content"><div class="admin-page-heading"><div><p class="admin-eyebrow">COLLECT RESPONSES</p><h1>Forms &amp; inbox</h1><p class="admin-subtitle">Create branded forms, choose where they appear, and review visitor responses saved in Sanity.</p></div>${showingInbox ? "" : `<button class="admin-button admin-button--primary" type="button" data-form-action="new">＋ Create form</button>`}</div><div class="admin-form-hub-tabs" role="tablist" aria-label="Forms and submissions"><button type="button" role="tab" aria-selected="${!showingInbox}" class="${!showingInbox ? "is-active" : ""}" data-forms-tab="forms">Forms <span>${state.forms.length}</span></button><button type="button" role="tab" aria-selected="${showingInbox}" class="${showingInbox ? "is-active" : ""}" data-forms-tab="inbox">Submissions <span>${state.submissions.filter((item) => item.status === "new").length} new</span></button></div><div class="admin-form-note"><strong>Where submissions go:</strong> Native answers are saved as private Sanity drafts for this admin inbox. Uploaded files are Sanity CDN assets and anyone with the file URL may access them; do not request highly confidential documents. WhatsApp/email save first, then open the visitor’s contact app with a prepared message. Google Forms are embedded and collected by Google, not this inbox.</div>${showingInbox ? submissionsContent : formsContent}</section>`;
}

function overview(): string {
  const cards = (["article", "service", "project", "page", "galleryItem"] as ContentType[]).map((type) => {
    const count = state.documents.filter((doc) => doc._type === type).length;
    const drafts = state.documents.filter((doc) => doc._type === type && doc._id.startsWith("drafts.")).length;
    return `<button class="admin-stat-card" type="button" data-nav="${type}"><span class="admin-stat-label">${escapeHtml(labels[type])}</span><strong>${count}</strong><small>${drafts ? `${drafts} draft${drafts === 1 ? "" : "s"} to review` : "Manage content"} <span>→</span></small></button>`;
  });
  const recent = state.documents.slice(0, 5);
  const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" })
    .format(new Date())
    .toUpperCase();
  return `<section class="admin-content"><div class="admin-welcome"><div><p class="admin-eyebrow">${today}</p><h1>Good to see you.</h1><p>Everything you need to keep the SILAS website up to date is right here.</p></div><span class="admin-welcome-mark">S</span></div><div class="admin-section-heading"><div><p class="admin-eyebrow">YOUR WEBSITE</p><h2>Content at a glance</h2></div><button class="admin-text-button" data-nav="homePage">Edit homepage →</button></div><div class="admin-stat-grid">${cards.join("")}</div><div class="admin-section-heading admin-recent-heading"><div><p class="admin-eyebrow">RECENTLY UPDATED</p><h2>Latest content</h2></div><div><button class="admin-text-button" data-nav="forms">Forms &amp; submissions →</button><button class="admin-text-button" data-action="new-menu">＋ Create new</button></div></div>${recent.length ? `<div class="admin-list">${recent
    .map(
      (doc) =>
        `<div class="admin-list-row"><button type="button" class="admin-list-open" data-edit-id="${escapeHtml(doc._id)}"><span class="admin-list-icon">${escapeHtml((documentTitle(doc)[0] || "S").toUpperCase())}</span><span class="admin-list-text"><strong>${escapeHtml(documentTitle(doc))}</strong><small>${escapeHtml(labels[doc._type])}</small></span><span class="admin-status ${statusOf(doc) === "Draft" ? "admin-status--draft" : ""}">${statusOf(doc)}</span><span class="admin-list-arrow" aria-hidden="true">→</span></button><div class="admin-list-actions"><button type="button" class="admin-list-action" data-edit-id="${escapeHtml(doc._id)}" aria-label="Edit ${escapeHtml(documentTitle(doc))}">Edit</button>${doc._type === "homePage" ? "" : `<button type="button" class="admin-list-action admin-list-action--delete" data-delete-id="${escapeHtml(doc._id)}" aria-label="Delete ${escapeHtml(documentTitle(doc))}">Delete</button>`}</div></div>`,
    )
    .join("")}</div>` : `<div class="admin-empty admin-empty--compact"><h2>Your website starts here</h2><p>Create a story, service, project, or page. Your website will use it as soon as you publish.</p><button class="admin-button admin-button--primary" data-action="new-menu">Create something new</button></div>`}</section>`;
}

function renderShell(content: string, drawer = ""): void {
  if (!root) return;
  root.innerHTML = `<div class="admin-app">${sidebar()}<main class="admin-main"><header class="admin-topbar"><a class="admin-topbar-home" href="/" aria-label="Back to website">← <span>View website</span></a><span class="admin-topbar-label">SILAS WEBSITE DESK</span><div class="admin-topbar-actions">${themeButton()}<button type="button" class="admin-topbar-signout" data-action="logout">Sign out</button></div></header>${content}</main>${drawer}</div>`;
  bindShellEvents();
  const dialog = root.querySelector<HTMLDialogElement>(".admin-editor-drawer");
  if (dialog) {
    setupEditorTabs(dialog);
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeEditor();
    });
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeEditor();
      }
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeEditor();
    });
    dialog.showModal();
    renderLivePreview();
  }
  const formDialog = root.querySelector<HTMLDialogElement>(".admin-form-builder-dialog");
  if (formDialog) {
    formDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeFormEditor();
    });
    formDialog.showModal();
  }
}

function render(): void {
  const content = state.active === "overview"
    ? overview()
    : state.active === "forms"
      ? formsDashboard()
      : listing(state.active);
  const drawer = state.editingForm
    ? formEditorMarkup(state.editingForm)
    : state.editing
      ? editorMarkup(state.editing._type, state.editing)
      : "";
  renderShell(content, drawer);
}

function setupEditorTabs(dialog: HTMLDialogElement): void {
  const tablist = dialog.querySelector<HTMLElement>('[role="tablist"]');
  const sections = [...dialog.querySelectorAll<HTMLElement>(".admin-form-sections > .admin-form-section")];
  if (!tablist || !sections.length) return;

  const tabs = sections.map((section, index) => {
    const title = section.querySelector("h3")?.textContent?.trim() || `Section ${index + 1}`;
    const id = `admin-editor-tab-${index}`;
    const panelId = `admin-editor-panel-${index}`;
    section.id = panelId;
    section.setAttribute("role", "tabpanel");
    section.setAttribute("aria-labelledby", id);
    section.hidden = index !== 0;
    return `<button type="button" id="${id}" class="admin-editor-tab${index === 0 ? " is-active" : ""}" role="tab" aria-controls="${panelId}" aria-selected="${index === 0}" tabindex="${index === 0 ? "0" : "-1"}" data-editor-tab="${index}">${escapeHtml(title)}</button>`;
  });
  tablist.innerHTML = tabs.join("");

  const activate = (index: number, moveFocus: boolean) => {
    sections.forEach((section, sectionIndex) => {
      section.hidden = sectionIndex !== index;
    });
    tablist.querySelectorAll<HTMLButtonElement>("[data-editor-tab]").forEach((tab, tabIndex) => {
      const selected = tabIndex === index;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle("is-active", selected);
      if (selected && moveFocus) tab.focus();
    });
  };
  tablist.addEventListener("click", (event) => {
    const tab = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-editor-tab]");
    if (tab) activate(Number(tab.dataset.editorTab), false);
  });
  tablist.addEventListener("keydown", (event) => {
    const current = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-editor-tab]");
    if (!current) return;
    const currentIndex = Number(current.dataset.editorTab);
    const last = sections.length - 1;
    const nextIndex =
      event.key === "ArrowRight" ? (currentIndex + 1) % sections.length :
      event.key === "ArrowLeft" ? (currentIndex + last) % sections.length :
      event.key === "Home" ? 0 :
      event.key === "End" ? last : -1;
    if (nextIndex >= 0) {
      event.preventDefault();
      activate(nextIndex, true);
    }
  });
}

function closeEditor(): void {
  state.editing = null;
  state.uploads = {};
  render();
  const trigger = [...(root?.querySelectorAll<HTMLElement>("[data-edit-id], [data-nav], [data-action]") ?? [])].find(
    (element) =>
      element.dataset.editId === state.returnFocusId ||
      element.dataset.nav === state.returnFocusId ||
      element.dataset.action === state.returnFocusId,
  );
  trigger?.focus();
  state.returnFocusId = "";
}

async function loadDocuments(): Promise<void> {
  const result = await api<{ documents: DocumentRecord[] }>("/api/admin/content?type=all");
  state.documents = result.documents;
}

async function loadForms(): Promise<void> {
  const result = await api<{ forms: AdminForm[]; submissions: FormSubmissionRecord[] }>("/api/admin/forms");
  state.forms = result.forms;
  state.submissions = result.submissions;
}

async function enterDashboard(): Promise<void> {
  if (!root) return;
  root.innerHTML = `<section class="admin-loading"><span class="admin-spinner" aria-hidden="true"></span><p>Loading your website content…</p></section>`;
  try {
    await Promise.all([loadDocuments(), loadForms()]);
    render();
  } catch (error) {
    root.innerHTML = `<section class="admin-login-wrap"><div class="admin-login-card"><a class="admin-brand admin-brand--login" href="/"><span class="admin-brand-mark">S</span><span><strong>SILAS</strong><small>WEBSITE DESK</small></span></a><h1>Your website desk</h1><p class="admin-login-copy">The dashboard could not load your content.</p><p class="admin-error">${escapeHtml(error instanceof Error ? error.message : "Please try again.")}</p><button class="admin-button admin-button--primary admin-full-button" id="admin-retry">Try again</button></div></section>`;
    document.querySelector("#admin-retry")?.addEventListener("click", () => void enterDashboard());
  }
}

function renderLogin(message = ""): void {
  if (!root) return;
  root.innerHTML = `<section class="admin-login-wrap"><div class="admin-login-card"><div class="admin-login-brand-row"><a class="admin-brand admin-brand--login" href="/"><span class="admin-brand-mark">S</span><span><strong>SILAS</strong><small>WEBSITE DESK</small></span></a>${themeButton()}</div><p class="admin-eyebrow">PRIVATE EDITOR ACCESS</p><h1>Welcome back.</h1><p class="admin-login-copy">Sign in to update the website and preview changes before they go live.</p><form id="admin-login-form"><label class="admin-field" for="admin-password"><span>Website editor password</span><span class="admin-password-control"><input id="admin-password" name="password" type="password" autocomplete="current-password" required autofocus /><button class="admin-password-toggle" id="admin-password-toggle" type="button" aria-label="Show password" aria-pressed="false" title="Show password"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></span></label><p class="admin-login-error" role="alert">${escapeHtml(message)}</p><button class="admin-button admin-button--primary admin-full-button" type="submit">Open website desk <span>→</span></button></form><a class="admin-login-back" href="/">← Back to Silas Paradza’s website</a></div><p class="admin-login-foot">SILAS PARADZA · WEBSITE MANAGEMENT</p></section>`;
  const form = document.querySelector<HTMLFormElement>("#admin-login-form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    void login(event.currentTarget as HTMLFormElement);
  });
  const passwordInput = form?.querySelector<HTMLInputElement>("#admin-password");
  const passwordToggle = form?.querySelector<HTMLButtonElement>("#admin-password-toggle");
  passwordToggle?.addEventListener("click", () => {
    if (!passwordInput) return;
    const showPassword = passwordInput.type === "password";
    passwordInput.type = showPassword ? "text" : "password";
    passwordToggle.setAttribute("aria-label", showPassword ? "Hide password" : "Show password");
    passwordToggle.setAttribute("title", showPassword ? "Hide password" : "Show password");
    passwordToggle.setAttribute("aria-pressed", String(showPassword));
    passwordToggle.innerHTML = showPassword
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a15.7 15.7 0 0 1-3.1 3.8"/><path d="M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7a10.7 10.7 0 0 0 4-.8"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>`;
    passwordInput.focus();
  });
}

async function login(form: HTMLFormElement): Promise<void> {
  const button = form.querySelector<HTMLButtonElement>("button[type=submit]");
  const error = form.querySelector<HTMLElement>(".admin-login-error");
  const password = new FormData(form).get("password");
  if (!(password instanceof File) && typeof password === "string") {
    if (button) {
      button.disabled = true;
      button.textContent = "Signing in…";
    }
    try {
      await api("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      await enterDashboard();
    } catch (reason) {
      if (error) error.textContent = reason instanceof Error ? reason.message : "Sign-in failed.";
      if (button) {
        button.disabled = false;
        button.innerHTML = 'Open website desk <span>→</span>';
      }
    }
  }
}

async function initialize(): Promise<void> {
  if (!root) return;
  try {
    const session = await api<{ authenticated: boolean; configured: boolean }>("/api/admin/session");
    if (!session.configured) {
      renderLogin("The website desk needs its server password and session key configured before you can sign in.");
    } else if (session.authenticated) {
      await enterDashboard();
    } else {
      renderLogin();
    }
  } catch (error) {
    renderLogin(error instanceof Error ? error.message : "");
  }
}

function formFields(form: HTMLFormElement): Record<string, unknown> {
  const data = new FormData(form);
  const values: Record<string, unknown> = Object.fromEntries(data.entries());
  const hotspot = (key: string, previous?: { width?: number; height?: number }) => ({
    _type: "sanity.imageHotspot",
    x: Math.min(0.75, Math.max(0.25, Number(values[`${key}HotspotX`] ?? 50) / 100)),
    y: Math.min(0.75, Math.max(0.25, Number(values[`${key}HotspotY`] ?? 50) / 100)),
    width: previous?.width ?? 0.5,
    height: previous?.height ?? 0.5,
  });
  for (const input of form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
    values[input.name] = input.checked;
  }
  for (const [key, uploaded] of Object.entries(state.uploads)) {
    values[key] =
      uploaded.type === "file"
        ? { asset: { _ref: uploaded._ref } }
        : {
            asset: { _ref: uploaded._ref },
            alt: String(values[`${key}Alt`] ?? ""),
            hotspot: hotspot(key),
          };
  }
  for (const key of ["heroImage", "coverImage", "image"]) {
    const existing = state.editing?.[key] as { asset?: { _ref?: string }; alt?: string; crop?: unknown; hotspot?: { width?: number; height?: number } } | undefined;
    if (!values[key] && existing?.asset?._ref) {
      values[key] = {
        asset: { _ref: existing.asset._ref },
        alt: String(values[`${key}Alt`] ?? existing.alt ?? ""),
        crop: existing.crop,
        hotspot: hotspot(key, existing.hotspot),
      };
    } else if (values[key] === "on" || values[key] === "") {
      delete values[key];
    }
  }
  const videoFile = state.editing?.videoFile as { asset?: { _ref?: string } } | undefined;
  if (!values.videoFile && videoFile?.asset?._ref) {
    values.videoFile = { asset: { _ref: videoFile.asset._ref } };
  }
  const videoPoster = state.editing?.videoPoster as { asset?: { _ref?: string }; alt?: string; crop?: unknown; hotspot?: { width?: number; height?: number } } | undefined;
  if (!values.videoPoster && videoPoster?.asset?._ref) {
    values.videoPoster = {
      asset: { _ref: videoPoster.asset._ref },
      alt: String(values.videoPosterAlt ?? videoPoster.alt ?? ""),
      crop: videoPoster.crop,
      hotspot: hotspot("videoPoster", videoPoster.hotspot),
    };
  }
  for (const key of ["heroImage", "coverImage", "image", "videoPoster"]) {
    delete values[`${key}Alt`];
    delete values[`${key}HotspotX`];
    delete values[`${key}HotspotY`];
  }
  return values;
}

function safePreviewSource(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  try {
    const parsed = new URL(value, window.location.origin);
    return parsed.protocol === "https:" || parsed.origin === window.location.origin ? parsed.href : "";
  } catch {
    return "";
  }
}

function previewImage(key: string, form: HTMLFormElement): string {
  const uploaded = state.uploads[key];
  const current = state.editing?.[key] as
    | { asset?: { _ref?: string; url?: string }; alt?: string; crop?: unknown; hotspot?: unknown }
    | undefined;
  const source = uploaded
    ? { asset: { _ref: uploaded._ref, url: uploaded.url } }
    : current;
  if (!source?.asset) return "";
  const x = Number(form.querySelector<HTMLInputElement>(`[name="${key}HotspotX"]`)?.value ?? 50) / 100;
  const y = Number(form.querySelector<HTMLInputElement>(`[name="${key}HotspotY"]`)?.value ?? 50) / 100;
  const image = {
    ...source,
    hotspot: {
      _type: "sanity.imageHotspot",
      x: Math.min(0.75, Math.max(0.25, x)),
      y: Math.min(0.75, Math.max(0.25, y)),
      width: 0.5,
      height: 0.5,
    },
  };
  return safePreviewSource(imageUrl(image, 1000) ?? source.asset.url);
}

function previewDocument(type: ContentType, values: Record<string, FormDataEntryValue>, form: HTMLFormElement): string {
  const get = (key: string) => String(values[key] ?? "").trim();
  const title = get(type === "homePage" ? "heroTitle" : "title") || "Your title will appear here";
  const summary = get(type === "homePage" ? "heroSubtitle" : type === "article" ? "excerpt" : "summary");
  const body = get(type === "homePage" ? "aboutBody" : "body")
    .split(/\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
  const category = get(type === "galleryItem" ? "category" : "category") ||
    (type === "project" ? get("status") : "");
  const imageKey = type === "homePage" ? "heroImage" : type === "galleryItem" ? "image" : "coverImage";
  const image = previewImage(imageKey, form);
  const videoPoster = previewImage("videoPoster", form);
  const hasVideo = Boolean(get("videoUrl") || state.uploads.videoFile || (state.editing?.videoFile as { asset?: unknown } | undefined)?.asset);
  const media = hasVideo
    ? `<div class="admin-preview-video">${(videoPoster || image) ? `<img src="${escapeHtml(videoPoster || image)}" alt="" />` : ""}<span aria-hidden="true">▶</span></div>`
    : image
      ? `<img class="${type === "homePage" ? "admin-preview-hero-image" : "editorial-feature-media"}" src="${escapeHtml(image)}" alt="${escapeHtml(get(`${imageKey}Alt`))}" />`
      : `<div class="admin-preview-placeholder">Your image will appear here</div>`;

  if (type === "homePage") {
    const highlight = get("heroHighlight");
    const highlightedTitle = highlight && title.includes(highlight)
      ? escapeHtml(title).replace(escapeHtml(highlight), `<span>${escapeHtml(highlight)}</span>`)
      : escapeHtml(title);
    return `<main class="admin-preview-home"><span class="eyebrow">SILAS PARADZA</span><h1>${highlightedTitle}</h1><p>${escapeHtml(summary || "Your introduction will appear here.")}</p>${media}<section><span class="eyebrow">ABOUT</span><h2>${escapeHtml(get("aboutHeading") || "About Silas")}</h2><strong>${escapeHtml(get("aboutMotto"))}</strong>${body}</section></main>`;
  }
  if (type === "galleryItem") {
    return `<main class="admin-preview-gallery"><figure class="gallery-item">${media}<figcaption class="gallery-item-overlay"><span>${escapeHtml(category || "Operations")}</span><h3>${escapeHtml(title)}</h3></figcaption></figure></main>`;
  }
  const meta = type === "project"
    ? get("location") ? `<p class="editorial-meta">Location: ${escapeHtml(get("location"))}</p>` : ""
    : type === "article"
      ? `<p class="editorial-meta">${escapeHtml([get("author"), get("publishedAt") ? new Date(get("publishedAt")).toLocaleDateString() : ""].filter(Boolean).join(" · "))}</p>`
      : "";
  return `<main class="editorial-page"><article class="editorial-article"><header class="editorial-article__header">${category ? `<span class="eyebrow">${escapeHtml(category)}</span>` : ""}<h1 class="section-title">${escapeHtml(title)}</h1>${summary ? `<p class="section-subtitle">${escapeHtml(summary)}</p>` : ""}${meta}</header>${media}<div class="editorial-body">${body || `<p class="admin-preview-placeholder">Your story text will appear here.</p>`}</div></article></main>`;
}

function renderLivePreview(): void {
  const form = root?.querySelector<HTMLFormElement>("#admin-content-form");
  const frame = form?.querySelector<HTMLIFrameElement>(".admin-preview-frame");
  if (!form || !frame) return;
  const type: ContentType = state.editing?._type ?? (
    state.active === "overview" || state.active === "forms" ? "homePage" : state.active
  );
  const fields = Object.fromEntries(new FormData(form).entries());
  const content = previewDocument(type, fields, form);
  const previewRoot = frame.contentDocument?.getElementById("admin-preview-content");
  if (previewRoot) {
    previewRoot.innerHTML = content;
    return;
  }
  if (frame.dataset.initialized) return;
  frame.dataset.initialized = "true";
  frame.addEventListener("load", () => renderLivePreview(), { once: true });
  frame.srcdoc = `<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${escapeHtml(window.location.origin)}/style.css"><style>html,body{min-width:0!important;margin:0!important}body{background:var(--bg-primary,#101923)!important}.admin-preview-home{position:relative;isolation:isolate;min-height:100vh;display:flex;flex-direction:column;justify-content:center;gap:18px;padding:clamp(24px,7vw,72px);overflow:hidden;background:linear-gradient(110deg,rgba(11,18,27,.96),rgba(11,18,27,.65))}.admin-preview-home h1{max-width:760px;margin:0;color:#fff;font-size:clamp(34px,7vw,76px);line-height:1.04}.admin-preview-home h1 span{color:#c7a66b}.admin-preview-home>p{max-width:650px;color:#e3e7e8;font-size:clamp(15px,2vw,19px);line-height:1.7}.admin-preview-home .eyebrow,.admin-preview-home section .eyebrow{color:#c7a66b}.admin-preview-home section{max-width:760px;margin-top:32px;color:#fff}.admin-preview-home section h2{color:#fff}.admin-preview-home section p{color:#d3d9db;line-height:1.75}.admin-preview-hero-image{position:absolute;z-index:-1;inset:0;width:100%;height:100%;object-fit:cover;opacity:.32}.editorial-page{min-height:100vh;padding:48px 22px}.editorial-article{max-width:760px;margin:auto}.editorial-article__header{margin:8px 0 28px}.editorial-feature-media{display:block;width:100%;max-height:420px;object-fit:cover;border-radius:12px}.editorial-body{margin-top:26px;color:var(--text-secondary,#ccd2d5);line-height:1.8}.admin-preview-placeholder{color:#929ba1;font-style:italic}.admin-preview-video{position:relative;overflow:hidden;display:grid;min-height:200px;aspect-ratio:16/9;place-items:center;border-radius:12px;background:#18232c}.admin-preview-video img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.admin-preview-video span{z-index:1;display:grid;width:58px;height:58px;place-items:center;border-radius:50%;color:#fff;background:rgba(199,166,107,.94)}.admin-preview-gallery{min-height:100vh;padding:24px;background:#111923}.admin-preview-gallery .gallery-item{max-width:640px;margin:0 auto}.admin-preview-gallery .gallery-item-overlay{opacity:1}.admin-preview-gallery .admin-preview-video{width:100%}@media(max-width:520px){.editorial-page{padding:32px 16px}.admin-preview-home{min-height:90vh}}</style></head><body><div id="admin-preview-content">${content}</div></body></html>`;
}

async function submitContent(form: HTMLFormElement, action: "save" | "publish"): Promise<void> {
  const message = form.querySelector<HTMLElement>(".admin-form-message");
  const buttons = form.querySelectorAll<HTMLButtonElement>('button[type="submit"]');
  buttons.forEach((button) => (button.disabled = true));
  if (message) message.textContent = action === "publish" ? "Publishing your changes…" : "Saving your draft…";
  try {
    const result = await api<{ id?: string; published?: boolean }>("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        type: state.editing?._type ?? (state.active === "homePage" ? "homePage" : state.active),
        id: state.editing?._id ?? (state.active === "homePage" ? "homePage" : undefined),
        fields: formFields(form),
      }),
    });
    if (action === "save" && state.editing && result.id) state.editing._id = result.id;
    if (message) message.textContent = action === "publish" ? "Published to the website." : "Draft saved. Preview it before you publish.";
    await loadDocuments();
    if (action === "publish") {
      state.editing = null;
      state.active = state.active === "overview" ? "overview" : state.active;
      render();
      showToast("Your changes are live on the website.");
    } else {
      if (result.id) {
        state.editing =
          state.documents.find((document) => document._id === result.id) ?? state.editing;
      }
      render();
      showToast("Draft saved. You can preview it before publishing.");
    }
  } catch (error) {
    if (message) message.textContent = error instanceof Error ? error.message : "The content could not be saved.";
    buttons.forEach((button) => (button.disabled = false));
  }
}

function showToast(message: string): void {
  const toast = document.createElement("div");
  toast.className = "admin-toast";
  toast.textContent = message;
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 4000);
}

function builderFieldsFrom(dialog: HTMLDialogElement): AdminFormField[] {
  return [...dialog.querySelectorAll<HTMLFieldSetElement>("[data-builder-field]")].map((row) => {
    const type = row.querySelector<HTMLSelectElement>("[data-builder-type]")?.value as FormFieldType;
    return {
      name: row.querySelector<HTMLInputElement>("[data-builder-name]")?.value ?? "",
      label: row.querySelector<HTMLInputElement>("[data-builder-label]")?.value.trim() ?? "",
      type,
      placeholder: row.querySelector<HTMLInputElement>("[data-builder-placeholder]")?.value.trim() ?? "",
      options: row.querySelector<HTMLInputElement>("[data-builder-options]")?.value.split(",").map((option) => option.trim()).filter(Boolean) ?? [],
      required: row.querySelector<HTMLInputElement>("[data-builder-required]")?.checked ?? false,
    };
  });
}

function refreshBuilderFields(dialog: HTMLDialogElement): void {
  const container = dialog.querySelector<HTMLElement>(".admin-builder-fields");
  if (container) container.innerHTML = formFieldRows(state.builderFields);
}

function openFormEditor(form?: AdminForm): void {
  state.active = "forms";
  state.formsTab = "forms";
  state.editing = null;
  state.editingForm = form ?? {
    _id: "",
    _type: "formDefinition",
    title: "",
    fields: [
      { name: "name", label: "Your name", type: "text", required: true },
      { name: "email", label: "Email address", type: "email", required: true },
      { name: "message", label: "How can we help?", type: "textarea", required: true },
    ],
    delivery: "inbox",
    active: true,
  };
  state.builderFields = state.editingForm.fields.map((item) => ({ ...item, options: item.options ? [...item.options] : [] }));
  render();
}

function closeFormEditor(): void {
  state.editingForm = null;
  state.builderFields = [];
  render();
  root?.querySelector<HTMLElement>('[data-form-action="new"]')?.focus();
}

async function submitFormBuilder(form: HTMLFormElement, action: "save" | "publish"): Promise<void> {
  const dialog = form.closest<HTMLDialogElement>(".admin-form-builder-dialog");
  const message = form.querySelector<HTMLElement>(".admin-form-builder-message");
  const buttons = [...form.querySelectorAll<HTMLButtonElement>('button[type="submit"]')];
  if (!dialog || !message) return;
  if (!form.reportValidity()) return;

  const fields = builderFieldsFrom(dialog);
  if (fields.some((item) => !item.label) || fields.length === 0) {
    message.textContent = "Add at least one field and give every field a label.";
    message.setAttribute("role", "alert");
    return;
  }
  const data = new FormData(form);
  const target = String(data.get("displayOn") ?? "");
  const [displayOnType = "", displayOnSlug = ""] = target.split("|", 2);
  const formFields = {
    title: String(data.get("title") ?? ""),
    slug: String(data.get("slug") ?? ""),
    description: String(data.get("description") ?? ""),
    submitLabel: String(data.get("submitLabel") ?? ""),
    displayOn: target ? `${displayOnType}|${displayOnSlug}` : "",
    displayMode: String(data.get("displayMode") ?? "popup"),
    ctaLabel: String(data.get("ctaLabel") ?? ""),
    ctaVariant: String(data.get("ctaVariant") ?? "primary"),
    active: data.get("active") === "on",
    fields,
    delivery: String(data.get("delivery") ?? "inbox"),
    destination: String(data.get("destination") ?? ""),
    googleFormUrl: String(data.get("googleFormUrl") ?? ""),
  };
  buttons.forEach((button) => (button.disabled = true));
  message.removeAttribute("role");
  message.textContent = action === "publish" ? "Publishing your form…" : "Saving your draft…";
  try {
    const result = await api<{ id: string; published?: boolean }>("/api/admin/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id: String(data.get("id") ?? ""), fields: formFields }),
    });
    state.editingForm = null;
    state.builderFields = [];
    await loadForms();
    render();
    showToast(result.published ? `Form published at /forms/${slugifyClient(formFields.slug || formFields.title)}.` : "Form draft saved.");
  } catch (error) {
    message.setAttribute("role", "alert");
    message.textContent = error instanceof Error ? error.message : "The form could not be saved.";
  } finally {
    buttons.forEach((button) => (button.disabled = false));
  }
}

function slugifyClient(value: string): string {
  return value.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

async function publishFormDraft(id: string): Promise<void> {
  try {
    await api("/api/admin/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publishDraft", id }),
    });
    await loadForms();
    render();
    showToast("Form published.");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "The form could not be published.");
  }
}

async function deleteForm(id: string): Promise<void> {
  if (!window.confirm("Delete this form? Its submitted inbox records will remain available.")) return;
  try {
    await api("/api/admin/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    state.editingForm = null;
    await loadForms();
    render();
    showToast("Form deleted.");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "The form could not be deleted.");
  }
}

async function saveSubmissionStatus(id: string): Promise<void> {
  const select = root?.querySelector<HTMLSelectElement>(`[data-submission-status="${CSS.escape(id)}"]`);
  if (!select) return;
  try {
    await api("/api/admin/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setSubmissionStatus", id, status: select.value }),
    });
    await loadForms();
    render();
    showToast("Inbox status updated.");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "The inbox status could not be updated.");
  }
}

async function deleteSubmission(id: string): Promise<void> {
  const submission = state.submissions.find((item) => item._id === id);
  if (!submission) return;
  const label = submission.formTitle || "this form";
  if (!window.confirm(`Permanently delete this submission to “${label}”? This cannot be undone.`)) return;
  try {
    await api("/api/admin/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteSubmission", id }),
    });
    await loadForms();
    render();
    showToast("Submission deleted.");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "The submission could not be deleted.");
  }
}

async function upload(file: File, key: string, input: HTMLInputElement): Promise<void> {
  const form = new FormData();
  form.set("file", file);
  input.disabled = true;
  try {
    const result = await api<{ asset: { _id: string; url: string; _type: string } }>("/api/admin/assets", {
      method: "POST",
      body: form,
    });
    state.uploads[key] = {
      _ref: result.asset._id,
      url: result.asset.url,
      type: result.asset._type === "image" ? "image" : "file",
    };
    const preview = input.closest(".admin-upload")?.querySelector(".admin-media-preview");
    if (preview) {
      preview.innerHTML =
        state.uploads[key].type === "image"
          ? `<img src="${escapeHtml(result.asset.url)}" alt="" />`
          : `<video class="admin-video-preview" controls width="640" height="360" playsinline preload="none" src="${escapeHtml(result.asset.url)}" aria-label="Uploaded video preview"></video>`;
    }
    renderLivePreview();
    showToast("Media uploaded to Sanity.");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Upload failed.");
    input.value = "";
  } finally {
    input.disabled = false;
  }
}

function openPreview(): void {
  const doc = state.editing;
  const type: ContentType = doc?._type ?? (state.active === "homePage" || state.active === "forms" || state.active === "overview" ? "homePage" : state.active);
  const path =
    type === "article"
      ? `/news/${doc?.slug?.current ?? ""}`
      : type === "service"
        ? `/services/${doc?.slug?.current ?? ""}`
        : type === "project"
          ? `/projects/${doc?.slug?.current ?? ""}`
          : type === "page"
            ? `/pages/${doc?.slug?.current ?? ""}`
            : type === "galleryItem"
              ? "/#gallery"
              : "/";
  window.open(`/api/admin/preview?path=${encodeURIComponent(path)}`, "_blank", "noopener");
}

function openNewMenu(): void {
  const dialog = document.createElement("dialog");
  dialog.className = "admin-create-dialog";
  dialog.innerHTML = `<form method="dialog"><div class="admin-dialog-heading"><div><p class="admin-eyebrow">START WRITING</p><h2>What would you like to create?</h2></div><button class="admin-dialog-close" aria-label="Close">×</button></div><div class="admin-create-grid">${(["article", "service", "project", "page", "galleryItem"] as ContentType[])
    .map((type) => `<button value="${type}" class="admin-create-option"><span class="admin-create-icon">＋</span><strong>${escapeHtml(singularLabels[type])}</strong><small>${type === "article" ? "Share an update or story" : type === "service" ? "Add a service offering" : type === "project" ? "Showcase an operation" : type === "page" ? "Create a new web page" : "Add a photo or video"}</small></button>`)
    .join("")}</div></form>`;
  document.body.append(dialog);
  dialog.addEventListener("close", () => {
    const type = dialog.returnValue as ContentType;
    dialog.remove();
    if (!type || !labels[type]) return;
    state.active = type;
    state.uploads = {};
    state.editing = { _id: "", _type: type };
    state.returnFocusId = "new";
    render();
  });
  dialog.showModal();
}

function bindShellEvents(): void {
  root?.querySelectorAll<HTMLElement>("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      const destination = button.dataset.nav as AdminSection;
      state.active = destination;
      state.filter = "";
      state.uploads = {};
      state.editingForm = null;
      state.builderFields = [];
      if (destination === "forms") state.formsTab = "forms";
      state.returnFocusId = destination;
      state.editing =
        destination === "homePage"
          ? (state.documents.find((item) => item._type === "homePage") ?? { _id: "homePage", _type: "homePage" })
          : null;
      render();
    });
  });
  root?.querySelectorAll<HTMLButtonElement>("[data-edit-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const doc = state.documents.find((item) => item._id === button.dataset.editId);
      if (!doc) return;
      state.active = doc._type;
      state.editing = doc;
      state.uploads = {};
      state.returnFocusId = doc._id;
      render();
    });
  });
  root?.querySelectorAll<HTMLButtonElement>("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const doc = state.documents.find((item) => item._id === button.dataset.deleteId);
      if (doc) void deleteDocument(doc);
    });
  });
  root?.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "logout") void logout();
      if (action === "new") openNewMenu();
      if (action === "new-menu") openNewMenu();
      if (action === "cancel") closeEditor();
      if (action === "delete") void deleteDocument();
    });
  });
  root?.querySelectorAll<HTMLButtonElement>("[data-form-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.formAction;
      if (action === "new") openFormEditor();
      if (action === "close") closeFormEditor();
      if (action === "delete" && button.dataset.formId) void deleteForm(button.dataset.formId);
      if (action === "add-field") {
        const dialog = button.closest<HTMLDialogElement>(".admin-form-builder-dialog");
        if (!dialog) return;
        state.builderFields = builderFieldsFrom(dialog);
        if (state.builderFields.length >= 25) {
          showToast("A form can have up to 25 fields.");
          return;
        }
        state.builderFields.push({
          name: `field_${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`,
          label: "",
          type: "text",
          required: false,
        });
        refreshBuilderFields(dialog);
      }
    });
  });
  root?.querySelectorAll<HTMLButtonElement>("[data-builder-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = button.closest<HTMLDialogElement>(".admin-form-builder-dialog");
      if (!dialog) return;
      state.builderFields = builderFieldsFrom(dialog).filter((item) => item.name !== button.dataset.builderRemove);
      refreshBuilderFields(dialog);
    });
  });
  root?.querySelectorAll<HTMLButtonElement>("[data-edit-form]").forEach((button) => {
    button.addEventListener("click", () => {
      const form = state.forms.find((item) => item._id === button.dataset.editForm);
      if (form) openFormEditor(form);
    });
  });
  root?.querySelectorAll<HTMLButtonElement>("[data-publish-form]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.publishForm) void publishFormDraft(button.dataset.publishForm);
    });
  });
  root?.querySelectorAll<HTMLButtonElement>("[data-delete-form]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.deleteForm) void deleteForm(button.dataset.deleteForm);
    });
  });
  root?.querySelectorAll<HTMLButtonElement>("[data-forms-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.formsTab = button.dataset.formsTab === "inbox" ? "inbox" : "forms";
      render();
    });
  });
  root?.querySelectorAll<HTMLButtonElement>("[data-save-submission]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.saveSubmission) void saveSubmissionStatus(button.dataset.saveSubmission);
    });
  });
  root?.querySelectorAll<HTMLButtonElement>("[data-delete-submission]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.deleteSubmission) void deleteSubmission(button.dataset.deleteSubmission);
    });
  });
  root?.querySelector<HTMLFormElement>("#admin-form-builder")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
    void submitFormBuilder(event.currentTarget as HTMLFormElement, submitter?.dataset.formSubmit === "publish" ? "publish" : "save");
  });
  root?.querySelector<HTMLFormElement>("#admin-content-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
    void submitContent(event.currentTarget as HTMLFormElement, submitter?.dataset.submit === "publish" ? "publish" : "save");
  });
  root?.querySelector<HTMLFormElement>("#admin-content-form")?.addEventListener("input", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.dataset.hotspot) {
      const output = root?.querySelector<HTMLOutputElement>(`[data-hotspot-output="${target.name}"]`);
      if (output) output.value = `${target.value}%`;
      const preview = root?.querySelector<HTMLElement>(`[data-media-preview="${target.dataset.hotspot}"] img`);
      if (preview) preview.style.objectPosition = `${root?.querySelector<HTMLInputElement>(`[name="${target.dataset.hotspot}HotspotX"]`)?.value ?? 50}% ${root?.querySelector<HTMLInputElement>(`[name="${target.dataset.hotspot}HotspotY"]`)?.value ?? 50}%`;
    }
    renderLivePreview();
  });
  root?.querySelectorAll<HTMLButtonElement>("[data-preview-device]").forEach((button) => {
    button.addEventListener("click", () => {
      const mobile = button.dataset.previewDevice === "mobile";
      root?.querySelector(".admin-preview-frame-wrap")?.classList.toggle("is-mobile", mobile);
      root?.querySelectorAll<HTMLButtonElement>("[data-preview-device]").forEach((deviceButton) => {
        const selected = deviceButton === button;
        deviceButton.classList.toggle("is-active", selected);
        deviceButton.setAttribute("aria-pressed", String(selected));
      });
    });
  });
  root?.querySelector<HTMLInputElement>("#content-search")?.addEventListener("input", (event) => {
    state.filter = (event.currentTarget as HTMLInputElement).value;
    const cursor = state.filter.length;
    render();
    const search = root?.querySelector<HTMLInputElement>("#content-search");
    search?.focus();
    search?.setSelectionRange(cursor, cursor);
  });
  root?.querySelectorAll<HTMLInputElement>("[data-upload]").forEach((input) => {
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (file && input.dataset.upload) void upload(file, input.dataset.upload, input);
    });
  });
  root?.querySelector<HTMLButtonElement>("[data-action=preview]")?.addEventListener("click", openPreview);
}

async function deleteDocument(doc = state.editing): Promise<void> {
  if (!doc || doc._type === "homePage") return;
  const title = documentTitle(doc);
  if (!window.confirm(`Delete “${title}”? This permanently removes it from Sanity and the live website.`)) return;
  try {
    await api("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", type: doc._type, id: doc._id }),
    });
    if (state.editing?._id === doc._id) state.editing = null;
    await loadDocuments();
    render();
    showToast("Content deleted.");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Content could not be deleted.");
  }
}

async function logout(): Promise<void> {
  try {
    await api("/api/admin/logout", { method: "POST" });
    state.documents = [];
    state.forms = [];
    state.submissions = [];
    state.editing = null;
    state.editingForm = null;
    renderLogin();
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Sign out failed.");
  }
}

void initialize();
