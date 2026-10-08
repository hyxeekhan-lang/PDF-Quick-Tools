import { toAcceptedFile, validateFile, type AcceptedFile, type FileKind } from "./files";

/**
 * Hands a file from the homepage dropzone to the tool page it routes to.
 *
 * A `File` cannot travel in a URL, so it is parked here for the length of one
 * navigation and read by the target tool on mount. The alternative — pushing
 * the file into `history.state` — does not survive a reload or a prerendered
 * first paint, and this site prerenders every tool route, so the handoff has to
 * be something the client can reach synchronously after the route changes.
 *
 * Held as a single value rather than a queue: the dropzone picks one tool, so
 * there is only ever one destination. `take` clears it, so a stale file can
 * never be picked up by a later, unrelated visit to a tool page.
 */
let pending: { file: File; tool: string } | null = null;

/** Parks a file for `tool` to pick up on its next mount. */
export function setPendingFile(file: File, tool: string): void {
  pending = { file, tool };
}

/**
 * Returns and clears the parked file, if it was left for `tool`.
 *
 * The `tool` check matters: a visitor can drop a file, change their mind, and
 * open a different tool by hand, and that tool must not silently adopt someone
 * else's file.
 */
export function takePendingFile(tool: string | null): File | null {
  if (!pending || !tool || pending.tool !== tool) return null;
  const { file } = pending;
  pending = null;
  return file;
}

/**
 * Re-validates a parked file on the far side of the navigation.
 *
 * The homepage check and this one are separate because the file crosses a real
 * boundary: it was accepted minutes or a page away, against whatever limit was
 * in force then. Re-checking here means a size limit raised later, or a file
 * that arrived by some other route, cannot slip past.
 *
 * Returns the file on success and `null` when there is nothing to accept — an
 * absent file and a rejected one are the same thing to the caller, which shows
 * its empty uploader either way. A rejected file is reported by `rejectPending`
 * so the visitor is told why rather than met with silence.
 */
export function acceptPending(
  tool: string | null,
  kind: FileKind,
): AcceptedFile | null {
  const file = takePendingFile(tool);
  if (!file) return null;
  const problem = validateFile(file, kind);
  if (problem) {
    lastRejection = problem;
    return null;
  }
  return toAcceptedFile(file);
}

/**
 * Why the last `acceptPending` came back empty, if it was because of the file.
 *
 * Kept beside the handoff rather than returned through it, so the tool's mount
 * effect stays a single call that either has a file or does not.
 */
let lastRejection: string | null = null;

export function rejectPending(): string | null {
  const message = lastRejection;
  lastRejection = null;
  return message;
}