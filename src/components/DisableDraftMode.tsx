import { useIsPresentationTool } from "@sanity/visual-editing/react";

export default function DisableDraftMode() {
  const isPresentationTool = useIsPresentationTool();
  if (isPresentationTool !== false) return null;

  return (
    <a
      href="/api/draft-mode/disable"
      style={{
        position: "fixed",
        insetBlockEnd: "1rem",
        insetInlineEnd: "1rem",
        zIndex: 50,
        padding: "0.65rem 1rem",
        borderRadius: "9999px",
        background: "#17243a",
        color: "#fff",
        fontSize: "0.875rem",
        textDecoration: "none",
        boxShadow: "0 4px 18px #0004",
      }}
    >
      Leave preview
    </a>
  );
}
