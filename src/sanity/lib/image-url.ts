import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";

const builder = createImageUrlBuilder({
  projectId: "z2cpms2c",
  dataset: "production",
});

export function imageUrl(source: unknown, width = 1200) {
  if (!source || typeof source !== "object" || !("asset" in source)) return undefined;
  const asset = source.asset;
  if (typeof asset !== "string" && (!asset || typeof asset !== "object")) return undefined;
  return builder.image(source as SanityImageSource).width(width).auto("format").url();
}
