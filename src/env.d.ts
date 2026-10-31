/// <reference types="astro/client" />
/// <reference types="@sanity/astro/module" />

interface Env {
  SANITY_API_READ_TOKEN?: string;
  SANITY_API_WRITE_TOKEN?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
  PUBLIC_SANITY_PROJECT_ID?: string;
  PUBLIC_SANITY_DATASET?: string;
}

declare namespace astroHTML.JSX {
  interface VideoHTMLAttributes {
    loading?: "eager" | "lazy";
  }
}

declare module "cloudflare:workers" {
  export const env: Env;
}
