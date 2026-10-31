import { defineField, defineType } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  groups: [
    { name: "contact", title: "Contact" },
    { name: "social", title: "Social links" },
  ],
  fields: [
    defineField({ name: "businessName", title: "Business name", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "phone", title: "Phone number", type: "string", group: "contact" }),
    defineField({ name: "email", title: "Email address", type: "string", group: "contact" }),
    defineField({ name: "whatsAppNumber", title: "WhatsApp number", type: "string", group: "contact", description: "International format without + or spaces." }),
    defineField({ name: "location", title: "Location", type: "string", group: "contact" }),
    defineField({
      name: "socialLinks",
      title: "Social media",
      type: "array",
      group: "social",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "label", title: "Network", type: "string" }),
            defineField({ name: "url", title: "Link", type: "url", validation: (rule) => rule.uri({ scheme: ["http", "https"] }) }),
          ],
          preview: { select: { title: "label", subtitle: "url" } },
        },
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Site settings", subtitle: "Contact details and social links" }),
  },
});
