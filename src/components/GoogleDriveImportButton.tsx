import { useState } from "react";
import { pickGoogleDrivePdf } from "#/lib/google-drive";
import { toAcceptedFile, validateFile } from "#/lib/files";
import { button } from "./ui";

export function GoogleDriveImportButton({
  onFile,
  onError,
}: {
  onFile: (file: File) => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function pick() {
    if (busy) return;
    setBusy(true);
    try {
      const file = await pickGoogleDrivePdf();
      if (!file) return;
      const problem = validateFile(file, "pdf");
      if (problem) {
        onError(problem);
        return;
      }
      onFile(file);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not open Google Drive.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" disabled={busy} onClick={() => void pick()} className={button("secondary", "sm")}>
      {busy ? "Opening Google Drive…" : "Choose from Google Drive"}
    </button>
  );
}

export function asAcceptedDriveFile(file: File) {
  return toAcceptedFile(file);
}
