import { createFileRoute } from "@tanstack/react-router";
import { CategoryHubPage } from "#/components/CategoryHub";
import { pageHead } from "#/lib/seo";

/**
 * The "PDF security" category hub. Copy and layout live in CategoryHubPage so
 * all six hubs stay identical in structure; this file exists to give the
 * category its own crawlable URL and its own head.
 */
export const Route = createFileRoute("/pdf-security")({
  head: () =>
    pageHead({
      title: `PDF Security — Protect, Unlock & Redact PDF Online Free`,
      description:
        "Secure your PDF free. Add password protection, remove password locks, redact sensitive text permanently. Runs in your browser.",
      path: "/pdf-security",
    }),
  component: () => <CategoryHubPage category="PDF security" path="/pdf-security" />,
});
