import { createFileRoute } from "@tanstack/react-router";
import { CategoryHubPage } from "#/components/CategoryHub";
import { pageHead } from "#/lib/seo";

/**
 * The "Organize PDF" category hub. Copy and layout live in CategoryHubPage so
 * all six hubs stay identical in structure; this file exists to give the
 * category its own crawlable URL and its own head.
 */
export const Route = createFileRoute("/organize-pdf")({
  head: () =>
    pageHead({
      title: `Organize PDF Online — Reorder, Split & Delete Pages Free`,
      description:
        "Organize PDF pages online for free. Reorder, delete, extract and split pages without uploading your file. No account needed.",
      path: "/organize-pdf",
    }),
  component: () => <CategoryHubPage category="Organize PDF" path="/organize-pdf" />,
});
