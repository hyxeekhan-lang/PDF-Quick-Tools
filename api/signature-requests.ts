import { createHash, randomBytes } from "node:crypto";
import { db, saveSignatureRequest } from "./_db.js";
import { clientIp, takeRateLimit } from "./_rate-limit.js";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const API = "https://api.hellosign.com/v3";
const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request): Promise<Response> {
  const limit = takeRateLimit(`signature-create:${clientIp(request)}`, {
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.ok) return json({ error: "Too many requests. Try again in an hour." }, 429);

  const apiKey = process.env.DROPBOX_SIGN_API_KEY;
  if (!apiKey) {
    return json({ error: "Signature requests are not configured yet." }, 503);
  }
  if (!db()) {
    return json({ error: "Signature tracking requires POSTGRES_URL to be configured first." }, 503);
  }

  let body: FormData;
  try {
    body = await request.formData();
  } catch {
    return json({ error: "Could not read the signature request form." }, 400);
  }

  const file = body.get("file");
  const signerEmail = field(body, "signerEmail");
  const signerName = field(body, "signerName");
  const subject = field(body, "subject");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_BYTES) {
    return json({ error: "Choose a PDF no larger than 4 MB for this signature request." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail) || signerEmail.length > 254) {
    return json({ error: "Enter a valid signer email address." }, 400);
  }
  if (signerName.length < 1 || signerName.length > 100 || subject.length > 150) {
    return json({ error: "Enter a signer name and a subject under 150 characters." }, 400);
  }
  if (body.get("consent") !== "yes") {
    return json({ error: "Confirm that you want to send this PDF to Dropbox Sign." }, 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasPdfHeader(bytes)) return json({ error: "The selected file is not a valid PDF." }, 400);

  const form = new FormData();
  form.append("files[0]", new Blob([bytes], { type: "application/pdf" }), safeFilename(file.name));
  form.append("signers[0][email_address]", signerEmail);
  form.append("signers[0][name]", signerName);
  form.append("title", (subject || file.name).slice(0, 150));
  form.append("subject", (subject || "Please sign this PDF").slice(0, 150));
  form.append("message", "Please review and sign this document using Dropbox Sign.");
  if (process.env.DROPBOX_SIGN_TEST_MODE === "true") form.append("test_mode", "1");

  let providerResponse: Response;
  try {
    providerResponse = await fetch(`${API}/signature_request/send`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}` },
      body: form,
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    return json({ error: "Dropbox Sign could not be reached. Please try again." }, 502);
  }

  const payload = (await providerResponse.json().catch(() => null)) as {
    signature_request?: { signature_request_id?: unknown };
    error?: { error_msg?: unknown };
  } | null;
  const requestId = payload?.signature_request?.signature_request_id;
  if (!providerResponse.ok || typeof requestId !== "string") {
    const message =
      typeof payload?.error?.error_msg === "string"
        ? payload.error.error_msg.slice(0, 250)
        : "Dropbox Sign could not create this request.";
    return json({ error: message }, providerResponse.status >= 500 ? 502 : 400);
  }

  const token = randomBytes(32).toString("base64url");
  try {
    const saved = await saveSignatureRequest(
      requestId,
      createHash("sha256").update(token).digest("hex"),
    );
    if (!saved) {
      return json({
        error: "The signature request was sent, but tracking storage is not configured. Keep the Dropbox Sign email for status updates.",
      }, 503);
    }
  } catch {
    return json({
      error: "The signature request was sent, but its tracking link could not be saved. Keep the Dropbox Sign email for status updates.",
    }, 503);
  }

  return json({ trackingUrl: `https://pdfpilot.site/track-signature?token=${token}` });
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function hasPdfHeader(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length, 1024);
  for (let index = 0; index <= limit - 4; index += 1) {
    if (
      bytes[index] === 0x25 &&
      bytes[index + 1] === 0x50 &&
      bytes[index + 2] === 0x44 &&
      bytes[index + 3] === 0x46
    ) return true;
  }
  return false;
}

function safeFilename(name: string): string {
  const safe = name.replace(/[^\p{L}\p{N} ._-]/gu, "").slice(0, 100).trim();
  return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe || "document"}.pdf`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...NO_STORE, "Content-Type": "application/json; charset=utf-8" },
  });
}
