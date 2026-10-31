import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sanity from "@sanity/astro";
import { defineConfig } from "astro/config";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID ?? "z2cpms2c";
const dataset = process.env.PUBLIC_SANITY_DATASET ?? "production";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  devToolbar: {
    enabled: false,
  },
  integrations: [
    sanity({
      projectId,
      dataset,
      apiVersion: "2025-11-25",
      useCdn: true,
    }),
    react(),
  ],
  vite: {
    plugins: [
      {
        name: "sanity-package-entry-aliases",
        enforce: "post",
        config(config) {
          const aliases = config.resolve?.alias;
          if (!Array.isArray(aliases)) return;
          for (const alias of aliases) {
            if (alias.find instanceof RegExp && alias.find.source === "^sanity$") {
              alias.replacement = require.resolve("sanity");
            } else if (alias.find instanceof RegExp && alias.find.source === "^styled-components$") {
              alias.replacement = require.resolve("styled-components/dist/styled-components.esm.js");
            }
          }
        },
      },
    ],
  },
});
