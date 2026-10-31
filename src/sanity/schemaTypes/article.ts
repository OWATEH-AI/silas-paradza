import { defineField, defineType } from "sanity";
import { seoFields, videoFields } from "./shared";

export const article = defineType({
  name: "article",
  title: "News & insights",
  type: "document",
  groups: [
    { name: "story", title: "Write your story", default: true },
    { name: "media", title: "Photos and video" },
    { name: "seo", title: "Search & sharing" },
  ],
  fields: [
    defineField({ name: "title", title: "Story headline", type: "string", group: "story", validation: (rule) => rule.required().max(110) }),
    defineField({ name: "slug", title: "Page address", type: "slug", group: "story", options: { source: "title", maxLength: 90 }, validation: (rule) => rule.required() }),
    defineField({ name: "excerpt", title: "Short summary", type: "text", rows: 3, group: "story", validation: (rule) => rule.required().max(260) }),
    defineField({ name: "category", title: "Topic", type: "string", group: "story", options: { list: ["Company news", "Mining", "Transport & logistics", "Community", "Business development", "Other"] } }),
    defineField({ name: "author", title: "Author", type: "string", group: "story", initialValue: "Silas Paradza" }),
    defineField({ name: "publishedAt", title: "Publication date", type: "datetime", group: "story", initialValue: () => new Date().toISOString(), validation: (rule) => rule.required() }),
    defineField({ name: "body", title: "Article", type: "portableText", group: "story", validation: (rule) => rule.required() }),
    defineField({ name: "coverImage", title: "Cover image", type: "image", group: "media", options: { hotspot: true }, fields: [{ name: "alt", title: "Image description", type: "string" }] }),
    ...videoFields.map((field) => ({ ...field, group: "media" as const })),
    defineField({ name: "featured", title: "Feature on homepage", type: "boolean", initialValue: false, group: "story" }),
    seoFields,
  ],
  preview: { select: { title: "title", subtitle: "publishedAt", media: "coverImage" } },
});
