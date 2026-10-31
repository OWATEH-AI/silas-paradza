import { defineField, defineType } from "sanity";

export const formDefinition = defineType({
  name: "formDefinition",
  title: "Website form",
  type: "document",
  groups: [
    { name: "setup", title: "Form setup", default: true },
    { name: "fields", title: "Form fields" },
    { name: "delivery", title: "Submission delivery" },
  ],
  fields: [
    defineField({ name: "title", title: "Form name", type: "string", group: "setup", validation: (rule) => rule.required().max(100) }),
    defineField({ name: "slug", title: "Form address", type: "slug", group: "setup", options: { source: "title", maxLength: 80 }, validation: (rule) => rule.required() }),
    defineField({ name: "description", title: "Introduction", type: "text", rows: 3, group: "setup", validation: (rule) => rule.max(300) }),
    defineField({ name: "submitLabel", title: "Send button label", type: "string", initialValue: "Send message", group: "setup", validation: (rule) => rule.max(40) }),
    defineField({
      name: "displayOnType",
      title: "Show popup on",
      type: "string",
      group: "setup",
      options: { list: [
        { title: "Do not attach to a content page", value: "" },
        { title: "News story", value: "article" },
        { title: "Service", value: "service" },
        { title: "Project", value: "project" },
        { title: "Website page", value: "page" },
      ] },
    }),
    defineField({ name: "displayOnSlug", title: "Content page address", type: "string", group: "setup", description: "Choose the matching page address from the admin form builder." }),
    defineField({ name: "active", title: "Accept submissions", type: "boolean", initialValue: true, group: "setup" }),
    defineField({
      name: "fields",
      title: "Visitor fields",
      type: "array",
      group: "fields",
      of: [{
        type: "object",
        name: "formField",
        fields: [
          defineField({ name: "name", title: "Field key", type: "string", validation: (rule) => rule.required().regex(/^[a-z][a-z0-9_]{0,39}$/) }),
          defineField({ name: "label", title: "Field label", type: "string", validation: (rule) => rule.required().max(80) }),
          defineField({ name: "type", title: "Field type", type: "string", options: { list: ["text", "email", "tel", "url", "textarea", "select", "checkbox", "file"] }, validation: (rule) => rule.required() }),
          defineField({ name: "placeholder", title: "Hint text", type: "string", validation: (rule) => rule.max(120) }),
          defineField({ name: "required", title: "Required", type: "boolean", initialValue: false }),
          defineField({ name: "options", title: "Choice options", type: "array", of: [{ type: "string" }], hidden: ({ parent }) => parent?.type !== "select" }),
        ],
        preview: { select: { title: "label", subtitle: "type" } },
      }],
      validation: (rule) => rule.required().min(1).max(25),
    }),
    defineField({
      name: "delivery",
      title: "After Send",
      type: "string",
      group: "delivery",
      initialValue: "inbox",
      options: { list: [
        { title: "Save to website inbox", value: "inbox" },
        { title: "Save, then open WhatsApp", value: "whatsapp" },
        { title: "Save, then open email app", value: "email" },
        { title: "Embed a Google Form", value: "googleForm" },
      ] },
    }),
    defineField({ name: "destination", title: "WhatsApp number or email address", type: "string", group: "delivery", description: "WhatsApp: international digits only. Email: recipient address." }),
    defineField({ name: "googleFormUrl", title: "Google Forms embed URL", type: "url", group: "delivery", description: "Paste the Google Forms embed URL. Google collects these answers outside the website inbox.", validation: (rule) => rule.uri({ scheme: ["https"] }) }),
  ],
  preview: { select: { title: "title", subtitle: "slug.current" } },
});
