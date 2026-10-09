import { afterEach, describe, expect, it, vi } from "vitest";
import { watchUploads } from "./upload-proof";

/**
 * These tests exist because the number this module produces is shown to
 * visitors as proof of a privacy claim. If `watchUploads` ever reported zero
 * for an upload that happened, the site would be displaying a false statement
 * about a user's document — the one failure mode that is worse than having no
 * proof at all.
 *
 * So the counter is tested in the direction that matters: it must fire on a
 * real upload of the tracked file, and must not be silenced by an unrelated
 * request of a different size.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Minimal stand-ins for the browser globals the module patches.
 *
 * `fetch` is deliberately a real function rather than a `vi.fn()` spy: the
 * module wraps whatever `window.fetch` is at patch time and calls through to
 * it, so a mock with no implementation would never reach the wrapper's own
 * bookkeeping — and the test would then be asserting on an empty counter while
 * appearing to pass.
 */
function stubBrowser() {
  const xhrCalls: unknown[] = [];
  class FakeXhr {
    send(body: unknown) {
      xhrCalls.push(body);
    }
  }
  const calls: string[] = [];
  const fetchImpl = (input: unknown) => {
    calls.push(String(input));
    return Promise.resolve({ ok: true });
  };
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
  vi.stubGlobal("fetch", fetchImpl);
  vi.stubGlobal("window", { fetch: fetchImpl });
  return { xhrCalls, calls, fetchImpl };
}

describe("watchUploads", () => {
  it("reports the document bytes when the tracked file is uploaded", () => {
    const { xhrCalls } = stubBrowser();
    const file = new Blob(["a".repeat(2048)], { type: "application/pdf" });

    const session = watchUploads(file.size);
    new XMLHttpRequest().send(file);

    expect(session.evidence().documentBytes).toBe(2048);
    expect(session.evidence().uploadAttempts).toBe(1);
    // Restoring must not leave a patched prototype behind for other tests.
    session.stop();
    expect(xhrCalls).toHaveLength(1);
  });

  it("does not count a different-sized request as the document", () => {
    stubBrowser();
    const file = new Blob(["a".repeat(2048)], { type: "application/pdf" });

    const session = watchUploads(file.size);
    // A smaller ad beacon must not be able to inflate the document count.
    new XMLHttpRequest().send(new Blob(["tiny"]));

    expect(session.evidence().documentBytes).toBe(0);
    expect(session.evidence().otherRequests).toBe(1);
    session.stop();
  });

  it("reports zero for a page that only makes ordinary requests", async () => {
    const { calls } = stubBrowser();
    const file = new Blob(["a".repeat(2048)], { type: "application/pdf" });

    const session = watchUploads(file.size);
    await window.fetch("/assets/chunk.js");
    await window.fetch("/fonts/inter.woff2");
    expect(calls).toHaveLength(2);

    const evidence = session.evidence();
    expect(evidence.documentBytes).toBe(0);
    expect(evidence.uploadAttempts).toBe(0);
    expect(evidence.otherRequests).toBe(2);
    session.stop();
  });

  it("never treats a string body as the document", () => {
    stubBrowser();
    const file = new Blob(["a".repeat(2048)], { type: "application/pdf" });

    const session = watchUploads(file.size);
    // Serialised form data is a string, not a Blob, even when it happens to be
    // the same length as the document.
    new XMLHttpRequest().send("x".repeat(2048));

    expect(session.evidence().documentBytes).toBe(0);
    session.stop();
  });

  it("restores the original network functions on stop", () => {
    stubBrowser();
    const before = globalThis.fetch;
    const session = watchUploads(10);
    session.stop();
    expect(globalThis.fetch).toBe(before);
  });

  it("reports observed=false until a request is seen", () => {
    stubBrowser();
    const session = watchUploads(10);
    // "0 bytes" and "we looked and found nothing" are different claims, and
    // the component distinguishes them.
    expect(session.evidence().observed).toBe(false);
    session.stop();
  });
});
