import { createFileRoute } from "@tanstack/react-router";
import { CategoryHubPage } from "#/components/CategoryHub";
import { pageHead } from "#/lib/seo";

/**
 * The "AI Tools" category hub. Copy and layout live in CategoryHubPage so
 * all six hubs stay identical in structure; this file exists to give the
 * category its own crawlable URL and its own head.
 */
export const Route = createFileRoute("/ai-pdf-tools")({
  head: () =>
    pageHead({
      title: `AI PDF Tools — Summarize, Translate & Analyze PDFs Free`,
      description:
        "AI PDF tools free: summarize, translate, rewrite, quiz and analyze any PDF with AI. Uploaded files stay on your device.",
      path: "/ai-pdf-tools",
    }),
  component: () => <CategoryHubPage category="AI Tools" path="/ai-pdf-tools" />,
});
