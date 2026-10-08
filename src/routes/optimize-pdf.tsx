import { createFileRoute } from "@tanstack/react-router";
import { CategoryHubPage } from "#/components/CategoryHub";
import { pageHead } from "#/lib/seo";

/**
 * The "Optimize" category hub. Copy and layout live in CategoryHubPage so
 * all six hubs stay identical in structure; this file exists to give the
 * category its own crawlable URL and its own head.
 */
export const Route = createFileRoute("/optimize-pdf")({
  head: () =>
    pageHead({
      title: `Optimize PDF — Compress, Shrink & Clean Up Files Free`,
      description:
        "Optimize PDF files online for free. Compress, reduce size, convert to greyscale, flatten and strip metadata. Nothing is uploaded.",
      path: "/optimize-pdf",
    }),
  component: () => <CategoryHubPage category="Optimize" path="/optimize-pdf" />,
});
