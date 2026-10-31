import { defineField, defineType } from "sanity";
import { seoFields, videoFields } from "./shared";

export const project = defineType({
  name: "project",
  title: "Project",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Project name", type: "string", validation: (rule) => rule.required().max(100) }),
    defineField({ name: "slug", title: "Page address", type: "slug", options: { source: "title", maxLength: 80 }, validation: (rule) => rule.required() }),
    defineField({ name: "status", title: "Status", type: "string", options: { list: ["Active operation", "Operational", "Completed", "Planned"] }, initialValue: "Operational" }),
    defineField({ name: "location", title: "Location", type: "string" }),
    defineField({ name: "summary", title: "Short introduction", type: "text", rows: 3, validation: (rule) => rule.required().max(240) }),
    defineField({ name: "body", title: "Full description", type: "portableText" }),
    defineField({ name: "featured", title: "Show on homepage", type: "boolean", initialValue: true }),
    defineField({ name: "coverImage", title: "Cover image", type: "image", options: { hotspot: true }, fields: [{ name: "alt", title: "Image description", type: "string" }] }),
    ...videoFields,
    defineField({
      name: "highlights",
      title: "Project highlights",
      type: "array",
      of: [{ type: "object", fields: [defineField({ name: "value", title: "Value", type: "string" }), defineField({ name: "label", title: "Description", type: "string" })] }],
    }),
    seoFields,
  ],
  preview: { select: { title: "title", subtitle: "status", media: "coverImage" } },
});
