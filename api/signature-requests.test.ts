import { beforeEach, describe, expect, it, vi } from "vitest";

const { findSignatureRequest, saveSignatureRequest } = vi.hoisted(() => ({
  findSignatureRequest: vi.fn(async (_token: string) => null as string | null),
  saveSignatureRequest: vi.fn(async (_requestId: string, _hash: string) => true),
}));

vi.mock("./_db", () => ({
  db: () => ({}),
  findSignatureRequest: (token: string) => findSignatureRequest(token),
  saveSignatureRequest: (requestId: string, hash: string) => saveSignatureRequest(requestId, hash),
}));

const { POST } = await import("./signature-requests");
const { POST: statusPost } = await import("./signature-status");
let nextIp = 1;

function formRequest(file: File, extra: Record<string, string> = {}) {
  const form = new FormData();
  form.set("file", file);
  form.set("signerName", "Test Signer");
  form.set("signerEmail", "signer@example.com");
  form.set("subject", "Review this");
  form.set("consent", "yes");
  for (const [key, value] of Object.entries(extra)) form.set(key, value);
  return new Request("https://pdfpilot.site/api/signature-requests", {
    method: "POST",
    headers: { "x-forwarded-for": `198.51.100.${nextIp++}` },
    body: form,
  });
}

beforeEach(() => {
  vi.stubEnv("DROPBOX_SIGN_API_KEY", "test-key");
  vi.stubEnv("DROPBOX_SIGN_TEST_MODE", "true");
  saveSignatureRequest.mockClear();
  saveSignatureRequest.mockResolvedValue(true);
  findSignatureRequest.mockClear();
  findSignatureRequest.mockResolvedValue(null);
  vi.stubGlobal("fetch", vi.fn());
});

describe("Dropbox Sign request API", () => {
  it("rejects missing consent and invalid PDF content before contacting Dropbox", async () => {
    const noConsent = await POST(formRequest(new File(["%PDF-1.7"], "a.pdf"), { consent: "no" }));
    expect(noConsent.status).toBe(400);
    const invalidFile = await POST(formRequest(new File(["not a pdf"], "a.pdf")));
    expect(invalidFile.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends an explicit-consent request and stores only a hash of the tracking token", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        signature_request: { signature_request_id: "provider-request-1" },
      }), { status: 200 }),
    );

    const response = await POST(formRequest(new File(["%PDF-1.7 document"], "form.pdf")));
    const payload = await response.json() as { trackingUrl: string };

    expect(response.status).toBe(200);
    expect(payload.trackingUrl).toMatch(/^https:\/\/pdfpilot\.site\/track-signature\?token=/);
    const [, hash] = saveSignatureRequest.mock.calls[0]!;
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.trackingUrl).not.toContain("provider-request-1");
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain("/signature_request/send");
  });

  it("refuses status checks with malformed tracking tokens", async () => {
    const response = await statusPost(new Request("https://pdfpilot.site/api/signature-status", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `198.51.100.${nextIp++}` },
      body: JSON.stringify({ token: "short" }),
    }));
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
