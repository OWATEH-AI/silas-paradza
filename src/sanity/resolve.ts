import { defineLocations } from "sanity/presentation";
import type { PresentationPluginOptions } from "sanity/presentation";

export const resolve: PresentationPluginOptions["resolve"] = {
  locations: {
    homePage: defineLocations({
      select: {},
      resolve: () => ({
        locations: [{ title: "Homepage", href: "/" }],
      }),
    }),
    article: defineLocations({
      select: { title: "title", slug: "slug.current" },
      resolve: (document) => ({
        locations: [
          { title: document?.title || "Untitled story", href: `/news/${document?.slug || ""}` },
          { title: "Homepage", href: "/" },
        ],
      }),
    }),
    service: defineLocations({
      select: { title: "title", slug: "slug.current" },
      resolve: (document) => ({
        locations: [
          { title: document?.title || "Untitled service", href: `/services/${document?.slug || ""}` },
          { title: "Homepage", href: "/" },
        ],
      }),
    }),
    project: defineLocations({
      select: { title: "title", slug: "slug.current" },
      resolve: (document) => ({
        locations: [
          { title: document?.title || "Untitled project", href: `/projects/${document?.slug || ""}` },
          { title: "Homepage", href: "/" },
        ],
      }),
    }),
    page: defineLocations({
      select: { title: "title", slug: "slug.current" },
      resolve: (document) => ({
        locations: [{ title: document?.title || "Untitled page", href: `/pages/${document?.slug || ""}` }],
      }),
    }),
  },
};
