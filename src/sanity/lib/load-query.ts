import type { AstroCookies } from "astro";
import type { ClientPerspective, QueryParams } from "@sanity/client";
import { sanityClient } from "sanity:client";
import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";

function parsePerspective(value: string | undefined): ClientPerspective | undefined {
  if (!value) return undefined;
  const decoded = decodeURIComponent(value);

  if (decoded.startsWith("[")) {
    try {
      return JSON.parse(decoded) as ClientPerspective;
    } catch (error) {
      console.error("Invalid Sanity preview perspective cookie.", error);
      return undefined;
    }
  }

  return decoded as ClientPerspective;
}

export function getDraftModeProps(cookies: AstroCookies) {
  return {
    perspectiveCookie: cookies.get(perspectiveCookieName)?.value,
  };
}

export async function loadQuery<Result>({
  query,
  params = {},
  perspectiveCookie,
  token,
}: {
  query: string;
  params?: QueryParams;
  perspectiveCookie?: string;
  token?: string;
}) {
  const preview = Boolean(perspectiveCookie);
  const perspective: ClientPerspective = preview
    ? (parsePerspective(perspectiveCookie) ?? "drafts")
    : "published";

  if (preview && !token) {
    throw new Error("Draft preview requires the server-only SANITY_API_READ_TOKEN binding.");
  }

  const result = await sanityClient.fetch<Result>(
    query,
    params,
    {
      perspective,
      useCdn: false,
      ...(preview ? { token } : {}),
    },
  );

  return {
    data: result,
    perspective,
  };
}
