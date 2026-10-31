import { defineField, defineType } from "sanity";

export const formSubmission = defineType({
  name: "formSubmission",
  title: "Form submission",
  type: "document",
  fields: [
    defineField({ name: "formId", title: "Form ID", type: "string" }),
    defineField({ name: "formTitle", title: "Form", type: "string" }),
    defineField({ name: "submittedAt", title: "Submitted", type: "datetime" }),
    defineField({ name: "status", title: "Inbox status", type: "string", options: { list: ["new", "read", "archived"] } }),
    defineField({ name: "sourcePath", title: "Submitted from", type: "string" }),
    defineField({
      name: "responses",
      title: "Answers",
      type: "array",
      of: [{
        type: "object",
        fields: [
          defineField({ name: "name", title: "Field key", type: "string" }),
          defineField({ name: "label", title: "Field", type: "string" }),
          defineField({ name: "value", title: "Answer", type: "text" }),
          defineField({ name: "file", title: "Uploaded document", type: "file" }),
          defineField({ name: "fileName", title: "Original file name", type: "string" }),
        ],
        preview: { select: { title: "label", subtitle: "value" } },
      }],
    }),
  ],
  preview: {
    select: { title: "formTitle", subtitle: "submittedAt" },
    prepare: ({ title, subtitle }) => ({ title: title || "Form submission", subtitle: subtitle ? new Date(subtitle).toLocaleString() : "" }),
  },
});
