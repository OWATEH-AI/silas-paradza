import { defineField, defineType } from "sanity";
import { seoFields, videoFields } from "./shared";

export const service = defineType({
  name: "service",
  title: "Service",
  type: "document",
  groups: [
    { name: "content", title: "Service details", default: true },
    { name: "media", title: "Photos and video" },
    { name: "seo", title: "Search & sharing" },
  ],
  fields: [
    defineField({ name: "title", title: "Service name", type: "string", group: "content", validation: (rule) => rule.required().max(90) }),
    defineField({ name: "slug", title: "Page address", type: "slug", group: "content", options: { source: "title", maxLength: 80 }, validation: (rule) => rule.required() }),
    defineField({ name: "category", title: "Category", type: "string", group: "content", options: { list: ["Mining", "Transport", "Driving school", "Consulting", "Other"] } }),
    defineField({ name: "summary", title: "Short introduction", type: "text", rows: 3, group: "content", validation: (rule) => rule.required().max(240) }),
    defineField({ name: "body", title: "Full description", type: "portableText", group: "content" }),
    defineField({ name: "featured", title: "Show on homepage", type: "boolean", initialValue: true, group: "content" }),
    defineField({ name: "isActive", title: "Currently available", type: "boolean", initialValue: true, group: "content" }),
    defineField({ name: "order", title: "Display order", type: "number", initialValue: 10, group: "content", validation: (rule) => rule.integer().min(0) }),
    defineField({ name: "coverImage", title: "Cover image", type: "image", group: "media", options: { hotspot: true }, fields: [{ name: "alt", title: "Image description", type: "string" }] }),
    ...videoFields.map((field) => ({ ...field, group: "media" as const })),
    seoFields,
  ],
  preview: { select: { title: "title", subtitle: "category", media: "coverImage" } },
});
