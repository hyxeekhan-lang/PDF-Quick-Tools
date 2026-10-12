import { createHash } from "node:crypto";
import { findSignatureRequest } from "./_db.js";
import { clientIp, takeRateLimit } from "./_rate-limit.js";

const API = "https://api.hellosign.com/v3";

export async function POST(request: Request): Promise<Response> {
  const limit = takeRateLimit(`signature-status:${clientIp(request)}`, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.ok) return json({ error: "Too many status checks. Try again later." }, 429);

  let body: { token?: unknown };
  try {
    body = await request.json() as { token?: unknown };
  } catch {
    return json({ error: "Invalid tracking request." }, 400);
  }
  const token = typeof body.token === "string" ? body.token : "";
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return json({ error: "Invalid tracking link." }, 400);

  const apiKey = process.env.DROPBOX_SIGN_API_KEY;
  if (!apiKey) return json({ error: "Signature status is not configured." }, 503);

  let requestId: string | null;
  try {
    requestId = await findSignatureRequest(createHash("sha256").update(token).digest("hex"));
  } catch {
    return json({ error: "Tracking storage is unavailable." }, 503);
  }
  if (!requestId) return json({ error: "This tracking link has expired or is invalid." }, 404);

  let response: Response;
  try {
    response = await fetch(`${API}/signature_request/${encodeURIComponent(requestId)}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return json({ error: "Dropbox Sign status is temporarily unavailable." }, 502);
  }

  const payload = (await response.json().catch(() => null)) as {
    signature_request?: {
      is_complete?: boolean;
      is_declined?: boolean;
      has_error?: boolean;
      signatures?: Array<{ status_code?: string }>;
    };
  } | null;
  if (!response.ok || !payload?.signature_request) {
    return json({ error: "Could not read the request status from Dropbox Sign." }, 502);
  }

  const signatureRequest = payload.signature_request;
  const status = signatureRequest.is_complete
    ? "complete"
    : signatureRequest.is_declined
      ? "declined"
      : signatureRequest.has_error
        ? "attention"
        : "waiting";
  return json({
    status,
    signers: (signatureRequest.signatures ?? []).map((signature) => ({
      status: signature.status_code ?? "unknown",
    })),
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
