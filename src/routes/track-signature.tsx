import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { button, heading, muted } from "#/components/ui";
import { pageHead } from "#/lib/seo";

interface Status {
  status: "complete" | "declined" | "attention" | "waiting";
  signers: Array<{ status: string }>;
}

export const Route = createFileRoute("/track-signature")({
  head: () => {
    const page = pageHead({
      title: "Track Signature Request",
      description: "Check the current status of a Dropbox Sign request.",
      path: "/track-signature",
    });
    return { ...page, meta: [...page.meta, { name: "robots", content: "noindex,nofollow" }] };
  },
  component: TrackSignaturePage,
});

function TrackSignaturePage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!token) {
      setError("This tracking link is missing its private token.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/signature-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const payload = (await response.json()) as Status | { error?: string };
      if (!response.ok || !("status" in payload)) {
        throw new Error("error" in payload ? payload.error : "Could not read the request status.");
      }
      setStatus(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read the request status.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setToken(window.location.hash.slice(1));
  }, []);

  useEffect(() => {
    if (!token) {
      setError("This tracking link is missing its private token.");
      return;
    }
    void refresh();
    // Refresh status periodically while this tracking page is open.
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [token]);

  const label = status?.status === "complete"
    ? "All signatures complete"
    : status?.status === "declined"
      ? "A signer declined"
      : status?.status === "attention"
        ? "Dropbox Sign needs attention"
        : "Waiting for signatures";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className={heading.h1}>Signature request status</h1>
      <p className={`mt-3 ${muted}`}>This private page checks Dropbox Sign for the latest status. It refreshes automatically every minute while open.</p>
      <section className="mt-8 rounded-2xl bg-white p-6 ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-800">
        {status ? (
          <>
            <h2 className="text-lg font-semibold text-ink-900 dark:text-white">{label}</h2>
            {status.signers.length > 0 && (
              <ol className="mt-4 space-y-2">
                {status.signers.map((signer, index) => (
                  <li key={index} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm dark:bg-ink-950">
                    <span className="text-ink-700 dark:text-ink-300">Signer {index + 1}</span>
                    <span className="font-medium capitalize text-ink-900 dark:text-white">{signer.status.replaceAll("_", " ")}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        ) : !error && <p className="text-sm text-ink-600 dark:text-ink-300">{loading ? "Checking request status…" : "Status not available."}</p>}
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
        <button type="button" onClick={() => void refresh()} disabled={loading} className={`${button("secondary", "md")} mt-5`}>
          {loading ? "Refreshing…" : "Refresh status"}
        </button>
      </section>
      <p className={`mt-4 text-xs ${muted}`}>The private token in this URL grants access to status only. Do not share it publicly. Tracking links expire after 30 days.</p>
    </main>
  );
}
