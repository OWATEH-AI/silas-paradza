import { defineField, defineType } from "sanity";
import { seoFields } from "./shared";

export const homePage = defineType({
  name: "homePage",
  title: "Homepage",
  type: "document",
  groups: [
    { name: "hero", title: "Welcome area", default: true },
    { name: "about", title: "About Silas" },
    { name: "contact", title: "Contact details" },
    { name: "seo", title: "Search & sharing" },
  ],
  fields: [
    defineField({ name: "heroTitle", title: "Main headline", type: "string", group: "hero", validation: (rule) => rule.required().max(90) }),
    defineField({ name: "heroHighlight", title: "Highlighted words", type: "string", group: "hero", description: "These words use the gold highlight." }),
    defineField({ name: "heroSubtitle", title: "Short introduction", type: "text", rows: 3, group: "hero", validation: (rule) => rule.required().max(220) }),
    defineField({ name: "heroImage", title: "Welcome background", type: "image", group: "hero", options: { hotspot: true } }),
    defineField({ name: "aboutHeading", title: "About heading", type: "string", group: "about" }),
    defineField({ name: "aboutMotto", title: "Short motto", type: "string", group: "about" }),
    defineField({ name: "aboutBody", title: "About text", type: "text", rows: 5, group: "about", validation: (rule) => rule.max(700) }),
    defineField({ name: "phone", title: "Phone number", type: "string", group: "contact" }),
    defineField({ name: "email", title: "Email address", type: "string", group: "contact" }),
    defineField({ name: "whatsAppNumber", title: "WhatsApp number", type: "string", group: "contact", description: "International format without + or spaces." }),
    seoFields,
  ],
  preview: {
    prepare: () => ({ title: "Homepage", subtitle: "Edit the words visitors see first" }),
  },
});
