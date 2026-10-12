import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { button, heading, muted } from "#/components/ui";
import { pageHead } from "#/lib/seo";
import { formatBytes, validateFile } from "#/lib/files";

const SIGNATURE_UPLOAD_LIMIT = 4 * 1024 * 1024;

export const Route = createFileRoute("/request-signature")({
  head: () => pageHead({
    title: "Request a PDF Signature",
    description: "Send a PDF to a signer and track the request securely with Dropbox Sign.",
    path: "/request-signature",
  }),
  component: RequestSignaturePage,
});

function RequestSignaturePage() {
  const [file, setFile] = useState<File | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;
    if (file.size > SIGNATURE_UPLOAD_LIMIT) {
      setError(`Choose a PDF no larger than ${formatBytes(SIGNATURE_UPLOAD_LIMIT)}.`);
      return;
    }
    const issue = validateFile(file, "pdf");
    if (issue) {
      setError(issue);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("signerName", signerName.trim());
      form.set("signerEmail", signerEmail.trim());
      form.set("subject", subject.trim());
      form.set("consent", consent ? "yes" : "no");
      const response = await fetch("/api/signature-requests", { method: "POST", body: form });
      const payload = (await response.json()) as { trackingUrl?: string; error?: string };
      if (!response.ok || !payload.trackingUrl) {
        throw new Error(payload.error ?? "The signature request could not be sent.");
      }
      const token = new URL(payload.trackingUrl).searchParams.get("token");
      if (!token) throw new Error("The signature request was sent, but its private tracking link was not returned.");
      setTrackingUrl(`${window.location.origin}/track-signature#${token}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send the request.");
    } finally {
      setBusy(false);
    }
  }

  async function copyTrackingLink() {
    if (!trackingUrl) return;
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
    } catch {
      setError("Could not copy automatically. Select and copy the tracking link below.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className={heading.h1}>Request a PDF signature</h1>
      <p className={`mt-3 max-w-2xl ${muted}`}>
        Send a PDF to one signer by email. Dropbox Sign delivers the signing email;
        this page gives you a private link to check its status.
      </p>

      {trackingUrl ? (
        <section className="mt-8 rounded-2xl bg-emerald-50 p-6 ring-1 ring-emerald-200 dark:bg-emerald-950/25 dark:ring-emerald-900/60">
          <h2 className="font-semibold text-emerald-900 dark:text-emerald-100">Request sent</h2>
          <p className="mt-2 text-sm text-emerald-900 dark:text-emerald-200">
            Dropbox Sign will email the signer. Save this private link to check the status.
          </p>
          <label htmlFor="signature-tracking-link" className="sr-only">Private tracking link</label>
          <input
            id="signature-tracking-link"
            readOnly
            value={trackingUrl}
            className="mt-4 w-full rounded-lg bg-white px-3 py-2 text-sm text-ink-800 ring-1 ring-emerald-300 dark:bg-ink-900 dark:text-ink-100"
          />
          <button type="button" onClick={() => void copyTrackingLink()} className={`${button("primary", "md")} mt-3`}>
            {copied ? "Copied" : "Copy tracking link"}
          </button>
          <p className="mt-3 text-xs text-emerald-900/80 dark:text-emerald-200/80">
            This link grants access to the request status. Share it only with people you trust.
          </p>
        </section>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="mt-8 space-y-5 rounded-2xl bg-white p-5 ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-800 sm:p-7">
          <label className="block text-sm font-medium text-ink-800 dark:text-ink-100">
            PDF file
            <input
              type="file"
              accept="application/pdf,.pdf"
              required
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-800 dark:file:bg-brand-600/15 dark:file:text-brand-200"
            />
            <span className={`mt-1 block text-xs ${muted}`}>
              Maximum {formatBytes(SIGNATURE_UPLOAD_LIMIT)}. The document is securely transmitted to Dropbox Sign for signature.
            </span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-ink-800 dark:text-ink-100">
              Signer name
              <input required maxLength={100} value={signerName} onChange={(event) => setSignerName(event.target.value)} className="mt-1.5 w-full rounded-lg bg-white px-3 py-2.5 text-sm ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-ink-700" />
            </label>
            <label className="block text-sm font-medium text-ink-800 dark:text-ink-100">
              Signer email
              <input required type="email" maxLength={254} value={signerEmail} onChange={(event) => setSignerEmail(event.target.value)} className="mt-1.5 w-full rounded-lg bg-white px-3 py-2.5 text-sm ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-ink-700" />
            </label>
          </div>
          <label className="block text-sm font-medium text-ink-800 dark:text-ink-100">
            Email subject <span className={muted}>(optional)</span>
            <input maxLength={150} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Please sign this document" className="mt-1.5 w-full rounded-lg bg-white px-3 py-2.5 text-sm ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-ink-700" />
          </label>
          <label className="flex items-start gap-3 text-sm text-ink-700 dark:text-ink-300">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required className="mt-0.5 h-4 w-4 accent-brand-600" />
            <span>I understand the PDF and signer details will be sent to Dropbox Sign, which emails the signer and processes signatures.</span>
          </label>
          {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
          <button type="submit" disabled={!file || !consent || busy} className={button("primary", "lg")}>
            {busy ? "Sending securely…" : "Send signature request"}
          </button>
        </form>
      )}

      <aside className="mt-6 rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-950 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-100 dark:ring-amber-400/20">
        Signature requests are optional and leave local-only processing: your PDF and signer’s email/name go to Dropbox Sign. Do not use this flow for documents unless you have permission to share them. Existing “Sign PDF” remains local to your device.
      </aside>
    </main>
  );
}
