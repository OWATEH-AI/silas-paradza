import { useEffect, useState } from "react";
import { useClient } from "sanity";
import { IntentLink } from "sanity/router";

type DashboardCounts = {
  articles: number;
  services: number;
  projects: number;
  galleryItems: number;
  pages: number;
};

const emptyCounts: DashboardCounts = {
  articles: 0,
  services: 0,
  projects: 0,
  galleryItems: 0,
  pages: 0,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e7e2d8",
  borderRadius: 12,
  padding: 22,
};

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "0 16px",
  borderRadius: 7,
  background: "#17243a",
  color: "#fff",
  fontSize: 14,
  fontWeight: 650,
  textDecoration: "none",
};

const secondaryLinkStyle: React.CSSProperties = {
  ...primaryLinkStyle,
  background: "#f5f2eb",
  color: "#17243a",
  border: "1px solid #e5dfd2",
};

export function EditorialDashboard() {
  const client = useClient({ apiVersion: "2025-11-25" });
  const [counts, setCounts] = useState<DashboardCounts>(emptyCounts);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;

    client
      .fetch<DashboardCounts>(`{
        "articles": count(*[_type == "article"]),
        "services": count(*[_type == "service"]),
        "projects": count(*[_type == "project"]),
        "galleryItems": count(*[_type == "galleryItem"]),
        "pages": count(*[_type == "page"])
      }`)
      .then((result) => {
        if (active) setCounts(result);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Could not load your content overview.");
        }
      });

    return () => {
      active = false;
    };
  }, [client]);

  const collections = [
    { label: "News stories", count: counts.articles, type: "article", action: "Write a story" },
    { label: "Services", count: counts.services, type: "service", action: "Add a service" },
    { label: "Projects", count: counts.projects, type: "project", action: "Add a project" },
    { label: "Gallery items", count: counts.galleryItems, type: "galleryItem", action: "Add photo or video" },
    { label: "Website pages", count: counts.pages, type: "page", action: "Create a page" },
  ];

  return (
    <main style={{ minHeight: "100%", background: "#f7f5f0", color: "#17243a", padding: "clamp(24px, 5vw, 56px)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <p style={{ margin: "0 0 8px", color: "#8c702a", fontSize: 12, fontWeight: 750, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          SILAS · Website desk
        </p>
        <h1 style={{ margin: "0 0 10px", fontFamily: "Georgia, serif", fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 500, letterSpacing: "-0.03em" }}>
          Good to see you.
        </h1>
        <p style={{ maxWidth: 620, margin: "0 0 28px", color: "#596274", fontSize: 16, lineHeight: 1.6 }}>
          Choose what you want to update. Your changes stay in draft until you publish them.
        </p>

        <section aria-label="Create new content" style={{ ...cardStyle, marginBottom: 18 }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 17 }}>Create something new</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {collections.map((item) => (
              <IntentLink key={item.type} intent="create" params={{ type: item.type }} style={primaryLinkStyle}>
                {item.action}
              </IntentLink>
            ))}
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 18 }}>
          {collections.map((item) => (
            <section key={item.type} style={cardStyle} aria-label={item.label}>
              <p style={{ margin: "0 0 8px", color: "#596274", fontSize: 13 }}>{item.label}</p>
              <p style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>{item.count}</p>
            </section>
          ))}
        </div>

        <section style={{ ...cardStyle, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
          <div>
            <h2 style={{ margin: "0 0 7px", fontSize: 17 }}>Check it before it goes live</h2>
            <p style={{ margin: 0, color: "#596274", fontSize: 14, lineHeight: 1.55 }}>
              Open Preview to see the actual website with your draft changes, then publish when it looks right.
            </p>
          </div>
          <IntentLink intent="edit" params={{ id: "homePage", type: "homePage" }} style={secondaryLinkStyle}>
            Edit homepage
          </IntentLink>
        </section>

        {error && (
          <p role="alert" style={{ marginTop: 18, color: "#a22d27", fontSize: 14 }}>
            Could not load the content counts: {error}
          </p>
        )}
      </div>
    </main>
  );
}
