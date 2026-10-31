import { defineArrayMember, defineField, defineType } from "sanity";

export const seoFields = defineField({
  name: "seo",
  title: "Search and sharing",
  type: "object",
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({ name: "metaTitle", title: "Search title", type: "string", validation: (rule) => rule.max(60) }),
    defineField({ name: "metaDescription", title: "Search description", type: "text", rows: 3, validation: (rule) => rule.max(160) }),
    defineField({ name: "shareImage", title: "Social sharing image", type: "image", options: { hotspot: true } }),
  ],
});

export const portableText = defineType({
  name: "portableText",
  title: "Article text",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Normal", value: "normal" },
        { title: "Heading 2", value: "h2" },
        { title: "Heading 3", value: "h3" },
        { title: "Quote", value: "blockquote" },
      ],
      lists: [
        { title: "Bullet list", value: "bullet" },
        { title: "Numbered list", value: "number" },
      ],
      marks: {
        decorators: [
          { title: "Bold", value: "strong" },
          { title: "Italic", value: "em" },
        ],
        annotations: [
          defineArrayMember({
            name: "link",
            title: "Link",
            type: "object",
            fields: [
              defineField({
                name: "href",
                title: "URL",
                type: "url",
                validation: (rule) => rule.required().uri({ scheme: ["http", "https", "mailto", "tel"] }),
              }),
            ],
          }),
        ],
      },
    }),
    defineArrayMember({
      name: "inlineImage",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      fields: [defineField({ name: "alt", title: "Image description", type: "string" })],
    }),
  ],
});

export const videoFields = [
  defineField({
    name: "videoFile",
    title: "Upload a video",
    type: "file",
    options: { accept: "video/*" },
    description: "Upload directly to Sanity, or use the video URL field below.",
  }),
  defineField({
    name: "videoUrl",
    title: "Or paste a video URL",
    type: "url",
    description: "YouTube, Vimeo, or a hosted MP4 URL.",
    validation: (rule) =>
      rule.uri({
        scheme: ["http", "https"],
      }),
  }),
  defineField({
    name: "videoPoster",
    title: "Video poster image",
    type: "image",
    options: { hotspot: true },
    fields: [
      defineField({ name: "alt", title: "Image description", type: "string" }),
    ],
  }),
];
