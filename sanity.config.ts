import { defineConfig } from "sanity";
import { presentationTool } from "sanity/presentation";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./src/sanity/schemaTypes";
import { EditorialDashboard } from "./src/sanity/EditorialDashboard";
import { structure } from "./src/sanity/structure";
import { resolve } from "./src/sanity/resolve";

const previewUrl = import.meta.env.DEV ? "http://localhost:4321" : "https://silasmparadza.com";

export default defineConfig({
  name: "silas",
  title: "SILAS | Website editor",
  projectId: "z2cpms2c",
  dataset: "production",
  plugins: [
    structureTool({ structure }),
    presentationTool({
      resolve,
      previewUrl: {
        initial: previewUrl,
        previewMode: {
          enable: "/api/draft-mode/enable",
        },
      },
    }),
  ],
  tools: (previous) => [
    { name: "editorial-home", title: "Overview", component: EditorialDashboard },
    ...previous,
  ],
  schema: {
    types: schemaTypes,
  },
});
