import { createFileRoute } from "@tanstack/react-router";
import { CategoryHubPage } from "#/components/CategoryHub";
import { pageHead } from "#/lib/seo";

/**
 * The "Convert" category hub. Copy and layout live in CategoryHubPage so
 * all six hubs stay identical in structure; this file exists to give the
 * category its own crawlable URL and its own head.
 */
export const Route = createFileRoute("/convert-pdf")({
  head: () =>
    pageHead({
      title: `Convert PDF — PDF to Word, Excel, JPG, PNG & More Free`,
      description:
        "Convert PDF to Word, Excel, JPG, PNG, text and Markdown, and convert Word, Excel and images back to PDF. Free, no signup.",
      path: "/convert-pdf",
    }),
  component: () => <CategoryHubPage category="Convert" path="/convert-pdf" />,
});
