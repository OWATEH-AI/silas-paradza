export const HOME_PAGE_QUERY = `*[_type == "homePage" && _id == "homePage"][0] {
  heroTitle,
  heroHighlight,
  heroSubtitle,
  heroImage {..., asset->{_id, url}},
  aboutHeading,
  aboutMotto,
  aboutBody,
  phone,
  email,
  whatsAppNumber,
  seo
}`;

export const SERVICES_QUERY = `*[_type == "service" && defined(slug.current) && isActive != false] | order(order asc, title asc) {
  _id,
  title,
  "slug": slug.current,
  category,
  summary,
  featured,
  coverImage {..., asset->{_id, url}}
}`;

export const PROJECTS_QUERY = `*[_type == "project" && defined(slug.current) && featured == true] | order(_updatedAt desc)[0...6] {
  _id,
  title,
  "slug": slug.current,
  status,
  location,
  summary,
  coverImage {..., asset->{_id, url}},
  highlights
}`;

export const GALLERY_QUERY = `*[_type == "galleryItem" && showOnHome == true] | order(order asc, _createdAt desc)[0...12] {
  _id,
  title,
  category,
  image {..., asset->{_id, url}},
  videoFile {asset->{_id, url, mimeType}},
  videoUrl,
  videoPoster {..., asset->{_id, url}}
}`;

export const HOMEPAGE_MEDIA_QUERY = `*[_type == "galleryItem" && defined(image.asset)] | order(order asc, title asc) {
  _id,
  title,
  category,
  order,
  image {..., asset->{_id, url}}
}`;

export const ARTICLES_QUERY = `*[_type == "article" && defined(slug.current)] | order(publishedAt desc)[0...3] {
  _id,
  title,
  "slug": slug.current,
  excerpt,
  category,
  publishedAt,
  coverImage {..., asset->{_id, url}}
}`;

export const NAVIGATION_PAGES_QUERY = `*[_type == "page" && (!defined(showInNavigation) || showInNavigation == true) && defined(slug.current)] | order(title asc) {
  _id,
  title,
  "slug": slug.current
}`;

export const PUBLIC_FORM_QUERY = `*[_type == "formDefinition" && active == true && slug.current == $slug][0] {
  _id,
  title,
  "slug": slug.current,
  description,
  submitLabel,
  delivery,
  destination,
  googleFormUrl,
  fields[] { name, label, type, placeholder, required, options }
}`;

export const FORM_FOR_CONTENT_QUERY = `*[_type == "formDefinition" && active == true && displayOnType == $contentType && displayOnSlug == $slug][0] {
  _id,
  title,
  "slug": slug.current,
  description,
  submitLabel,
  delivery,
  destination,
  googleFormUrl,
  fields[] { name, label, type, placeholder, required, options }
}`;

export const ARTICLE_QUERY = `*[_type == "article" && slug.current == $slug][0] {
  _id,
  _type,
  title,
  "slug": slug.current,
  excerpt,
  category,
  author,
  publishedAt,
  coverImage {..., asset->{_id, url}},
  videoFile {asset->{_id, url, mimeType}},
  videoUrl,
  videoPoster {..., asset->{_id, url}},
  body[] {
    ...,
    _type == "inlineImage" => { ..., asset->{_id, url} }
  },
  seo
}`;

export const SERVICE_QUERY = `*[_type == "service" && slug.current == $slug][0] {
  _id,
  _type,
  title,
  "slug": slug.current,
  category,
  summary,
  body[] {
    ...,
    _type == "inlineImage" => { ..., asset->{_id, url} }
  },
  coverImage {..., asset->{_id, url}},
  videoFile {asset->{_id, url, mimeType}},
  videoUrl,
  videoPoster {..., asset->{_id, url}},
  seo
}`;

export const PROJECT_QUERY = `*[_type == "project" && slug.current == $slug][0] {
  _id,
  _type,
  title,
  "slug": slug.current,
  status,
  location,
  summary,
  body[] {
    ...,
    _type == "inlineImage" => { ..., asset->{_id, url} }
  },
  coverImage {..., asset->{_id, url}},
  videoFile {asset->{_id, url, mimeType}},
  videoUrl,
  videoPoster {..., asset->{_id, url}},
  highlights,
  seo
}`;

export const PAGE_QUERY = `*[_type == "page" && slug.current == $slug][0] {
  _id,
  _type,
  title,
  "slug": slug.current,
  summary,
  body[] {
    ...,
    _type == "inlineImage" => { ..., asset->{_id, url} }
  },
  coverImage {..., asset->{_id, url}},
  videoFile {asset->{_id, url, mimeType}},
  videoUrl,
  videoPoster {..., asset->{_id, url}},
  seo
}`;
