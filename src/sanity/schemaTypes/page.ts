import { defineField, defineType } from "sanity";
import { seoFields, videoFields } from "./shared";

export const page = defineType({
  name: "page",
  title: "Website page",
  type: "document",
  groups: [
    { name: "content", title: "Page content", default: true },
    { name: "media", title: "Photos and video" },
    { name: "seo", title: "Search & sharing" },
  ],
  fields: [
    defineField({ name: "title", title: "Page title", type: "string", group: "content", validation: (rule) => rule.required().max(100) }),
    defineField({ name: "slug", title: "Page address", type: "slug", group: "content", options: { source: "title", maxLength: 90 }, validation: (rule) => rule.required() }),
    defineField({ name: "summary", title: "Short introduction", type: "text", rows: 3, group: "content", validation: (rule) => rule.max(240) }),
    defineField({ name: "body", title: "Page text", type: "portableText", group: "content" }),
    defineField({ name: "coverImage", title: "Cover image", type: "image", group: "media", options: { hotspot: true }, fields: [{ name: "alt", title: "Image description", type: "string" }] }),
    ...videoFields.map((field) => ({ ...field, group: "media" as const })),
    defineField({ name: "showInNavigation", title: "Show in website navigation", type: "boolean", initialValue: true, group: "content" }),
    seoFields,
  ],
  preview: { select: { title: "title", subtitle: "slug.current", media: "coverImage" } },
});
