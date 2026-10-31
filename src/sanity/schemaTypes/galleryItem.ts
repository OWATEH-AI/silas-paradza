import { defineField, defineType } from "sanity";
import { videoFields } from "./shared";

export const galleryItem = defineType({
  name: "galleryItem",
  title: "Gallery photo or video",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Caption", type: "string", validation: (rule) => rule.required().max(100) }),
    defineField({ name: "category", title: "Gallery category", type: "string", options: { list: ["Mining", "Transport", "Corporate", "Operations", "Driving school"] }, initialValue: "Operations" }),
    defineField({ name: "image", title: "Photo", type: "image", options: { hotspot: true }, fields: [{ name: "alt", title: "Image description", type: "string" }] }),
    ...videoFields,
    defineField({ name: "showOnHome", title: "Show in homepage gallery", type: "boolean", initialValue: true }),
    defineField({ name: "order", title: "Display order", type: "number", initialValue: 10, validation: (rule) => rule.integer().min(0) }),
  ],
  preview: { select: { title: "title", subtitle: "category", media: "image" } },
});
