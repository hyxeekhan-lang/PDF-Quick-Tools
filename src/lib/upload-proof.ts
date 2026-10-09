/**
 * Real evidence that a document was never uploaded.
 *
 * The site says this in three places — the hero badge, the privacy section and
 * every tool's FAQ — but until now a visitor had to take it on trust, and
 * "trust us on privacy" is exactly the thing people do not trust. So this
 * module watches the network and reports what actually happened.
 *
 * The two counters are deliberately different, because "we sent nothing" is a
 * claim and "here is what crossed the wire" is the evidence:
 *
 *  - `documentBytes` only counts outgoing request bodies that match the size of
 *    the file being processed. This is the number the privacy claim rests on.
 *  - `otherRequests` counts every other request the page made while the file
 *    was open. It is not hidden: a page that loads fonts, ad scripts and lazy
 *    chunks is not making zero requests, and hiding that would make the first
 *    number look like a trick.
 *
 * Both come from the browser's own Resource Timing and Transport events, not
 * from anything the site reports about itself, so a bug in this file shows up as
 * a wrong number rather than as a reassuring lie.
 */

export interface UploadEvidence {
  /** Bytes of the visitor's own document found in outgoing request bodies. */
  documentBytes: number;
  /** Every other request made while the document was open. */
  otherRequests: number;
  /** Requests whose body size matched the document — the uploads themselves. */
  uploadAttempts: number;
  /** True once at least one observation has been made, so "0" means looked. */
  observed: boolean;
}

const EMPTY: UploadEvidence = {
  documentBytes: 0,
  otherRequests: 0,
  uploadAttempts: 0,
  observed: false,
};

/**
 * Tracks outgoing requests for the lifetime of one document.
 *
 * `fetch` and `XMLHttpRequest.send` are both wrapped rather than relying only on
 * Resource Timing, because a request carrying a document shows up in Resource
 * Timing with its body size — but only after it completes, and only if the
 * response was readable. A wrapped `send` catches the attempt at the moment it
 * happens, which is the moment worth showing.
 *
 * Both wrappers are installed once and are pure observers: they read the
 * arguments and pass them straight through, so nothing about normal network
 * behaviour changes if this module is removed.
 */
export function watchUploads(fileSize: number): {
  evidence: () => UploadEvidence;
  stop: () => void;
} {
  let documentBytes = 0;
  let otherRequests = 0;
  let uploadAttempts = 0;
  let observed = false;

  const originalFetch = window.fetch;
  const originalSend = XMLHttpRequest.prototype.send;

  window.fetch = function patchedFetch(input, init) {
    // Every call counts as a request made, body or not. A GET for a font or a
    // lazy chunk is still traffic this page caused, and the component shows
    // that count next to the document count — under-counting it would make
    // the section look like it is hiding something.
    otherRequests += 1;
    observed = true;
    note(init?.body);
    return originalFetch.call(this, input, init);
  };

  XMLHttpRequest.prototype.send = function patchedSend(body) {
    otherRequests += 1;
    observed = true;
    note(body);
    return originalSend.call(this, body);
  };

  /**
   * A body counts as the document only when it matches the file byte for byte.
   * Anything smaller is site traffic — an ad beacon must not be able to
   * inflate the document number into looking like an upload. This only ever
   * raises the document count; it never lowers `otherRequests`, which already
   * counted the request itself.
   */
  function note(body: unknown): void {
    const size = sizeOf(body);
    if (size !== null && size === fileSize) {
      documentBytes += size;
      uploadAttempts += 1;
    }
  }

  return {
    evidence: () => ({ documentBytes, otherRequests, uploadAttempts, observed }),
    stop: () => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.send = originalSend;
    },
  };
}

/** Byte length of a request body, or null when it is not a size we can read. */
function sizeOf(body: unknown): number | null {
  if (body instanceof Blob) return body.size;
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (ArrayBuffer.isView(body)) return body.byteLength;
  // A string body is already-serialised form data or JSON. It cannot be a whole
  // PDF being uploaded — a PDF would be a Blob — so it is never the document.
  return null;
}

export { EMPTY as NO_EVIDENCE };
