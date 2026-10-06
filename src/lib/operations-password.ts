/**
 * Password protection and removal for the protect and unlock tools.
 *
 * pdf-lib cannot encrypt, so both directions run through the real qpdf
 * binary compiled to WebAssembly. It works entirely in the browser tab and
 * the password is never sent anywhere.
 */

import type { Report } from "#/hooks/useToolRun";
import { friendly, makeResult, sanitizeFilename, type ResultFile } from "./files";
import { runQpdf } from "./qpdf";

const PDF_MIME = "application/pdf";

/** Bit flags qpdf understands; 3 is the "no printing, no modifying" preset. */
export const PERMISSIONS = [
  { value: 0, label: "Allow everything", hint: "Anyone can print, copy and edit" },
  { value: 1, label: "Allow printing", hint: "Printing yes, copying and editing no" },
  { value: 2, label: "Allow copying", hint: "Copying text yes, printing and editing no" },
  { value: 3, label: "Allow neither", hint: "Printing, copying and editing all blocked" },
] as const;

/**
 * Adds an AES-256 password to a PDF.
 *
 * The user password is what someone types to open the file; the owner password
 * is what bypasses the permission flags. Offering both matters because a file
 * protected against copying but with no owner password can be unlocked by
 * anyone with a PDF tool.
 */
export async function protectPdf(
  file: File,
  userPassword: string,
  ownerPassword: string,
  permissions: number,
  report: Report,
): Promise<ResultFile> {
  if (userPassword.length === 0) {
    return friendly("Set a password before protecting the file.");
  }
  if (userPassword === ownerPassword) {
    return friendly(
      "The open password and the owner password need to be different. If they match, the owner password does nothing extra.",
    );
  }

  report(20, "Reading your PDF");
  const input = new Uint8Array(await file.arrayBuffer());

  report(55, "Encrypting with AES-256");
  let result: { bytes: Uint8Array };
  try {
    result = await runQpdf(input, [
      "--encrypt",
      userPassword,
      ownerPassword,
      "256",
      "--",
      permissionString(permissions),
    ]);
  } catch (caught) {
    return friendly(cleanQpdfError(caught));
  }

  report(92, "Writing your protected PDF");
  const name = sanitizeFilename(file.name, "document");
  return makeResult(
    result.bytes.slice().buffer,
    `${name}-protected.pdf`,
    PDF_MIME,
  );
}

/**
 * Builds qpdf's permission string from the chosen preset.
 *
 * qpdf takes an allow-list, so anything the user did not pick has to be
 * spelled out as blocked. Leaving a permission off the list entirely would
 * mean "use the default", which is not the same thing.
 */
function permissionString(permissions: number): string {
  const allow = (bit: number) => (permissions & bit ? "y" : "none");
  return (
    `print=${allow(1 << 3)},modify=${allow(1 << 4)},copy=${allow(1 << 5)},` +
    `annotate=${allow(1 << 6)},form=${allow(1 << 9)},extract=${allow(1 << 10)},` +
    `assemble=${allow(1 << 11)},print-highres=${allow(1 << 12)}`
  );
}

/**
 * Removes the password from a PDF, if it has one.
 *
 * A PDF can be encrypted against opening, against permissions, or both, and
 * they are unlocked with different passwords. Trying the open password first
 * and falling back to the owner password covers both without asking the user
 * which kind of protection they are dealing with.
 */
export async function unlockPdf(
  file: File,
  password: string,
  report: Report,
): Promise<ResultFile> {
  const input = new Uint8Array(await file.arrayBuffer());

  report(30, "Trying to unlock your PDF");
  let result: { bytes: Uint8Array } | null = null;
  let lastError = "";

  for (const ownerPassword of [false, true]) {
    try {
      const flag = ownerPassword ? "--password-is-owner-password" : "";
      const attempt = await runQpdf(input, [
        `--password=${password}`,
        flag,
        "--decrypt",
        "--",
      ]);
      // A wrong password exits non-zero without writing a usable file; a
      // file that was never encrypted succeeds on the first try and comes
      // back as the same bytes. Either way the download below is correct.
      result = attempt;
      break;
    } catch (caught) {
      lastError = cleanQpdfError(caught);
    }
  }

  if (!result) {
    return friendly(
      lastError.includes("password") || lastError.includes("invalid")
        ? "That password did not open this PDF. Passwords are case-sensitive — check for a capital letter, a number, or a symbol that may have been left out."
        : lastError,
    );
  }

  report(92, "Writing your unlocked PDF");
  const name = sanitizeFilename(file.name, "document");
  return makeResult(
    result.bytes.slice().buffer,
    `${name}-unlocked.pdf`,
    PDF_MIME,
  );
}

/**
 * Turns qpdf's stderr into something worth showing a user.
 *
 * The raw messages name qpdf's own flags, which means nothing to someone who
 * just wants their password back, so the common cases are translated.
 */
function cleanQpdfError(caught: unknown): string {
  const raw = caught instanceof Error ? caught.message : String(caught);
  const first = raw.split("\n").find((line) => line.trim().length > 0) ?? "";

  if (/password/i.test(first)) {
    return "That password is not correct for this file.";
  }
  if (/encrypt/i.test(first)) {
    return "This PDF cannot be encrypted in the browser. It may already use a protection scheme this tool cannot add to.";
  }
  return first || "This file could not be processed.";
}