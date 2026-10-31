export type FormFieldType = "text" | "email" | "tel" | "url" | "textarea" | "select" | "checkbox" | "file";

export interface FormFieldDefinition {
  name: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

export interface FormDefinition {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  submitLabel?: string;
  displayMode?: "popup" | "inline";
  ctaLabel?: string;
  ctaVariant?: "primary" | "outline" | "text";
  displayOnType?: string;
  displayOnSlug?: string;
  delivery?: "inbox" | "whatsapp" | "email" | "googleForm";
  destination?: string;
  googleFormUrl?: string;
  fields: FormFieldDefinition[];
}
