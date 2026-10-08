import { createFileRoute } from "@tanstack/react-router";
import { CategoryHubPage } from "#/components/CategoryHub";
import { pageHead } from "#/lib/seo";

/**
 * The "Edit PDF" category hub.
 *
 * Not /edit-pdf: that path is already the Edit PDF text tool, and a hub that
 * shadowed a working tool would break that page's URL. "PDF editor" is the
 * other term this category ranks for, so this page carries that one.
 */
export const Route = createFileRoute("/pdf-editor")({
  head: () =>
    pageHead({
      title: "Edit PDF Online — Sign, Watermark & Crop Pages Free",
      description:
        "Edit PDF files online for free. Sign, watermark, highlight, crop and fill forms in your browser. Nothing is uploaded.",
      path: "/pdf-editor",
    }),
  component: () => <CategoryHubPage category="Edit PDF" path="/pdf-editor" />,
});
