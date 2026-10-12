import { useState } from "react";
import { saveToGoogleDrive } from "#/lib/google-drive";
import type { ResultFile } from "#/lib/files";
import { button } from "./ui";

export function GoogleDriveSaveButton({ result }: { result: ResultFile }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(result.url);
      if (!response.ok) throw new Error("Could not read the finished file from this tab.");
      await saveToGoogleDrive(await response.blob(), result.filename);
      setMessage("Saved to Google Drive.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save to Google Drive.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" disabled={busy} onClick={() => void save()} className={button("secondary", "sm")}>
        {busy ? "Saving to Drive…" : "Save to Google Drive"}
      </button>
      {message && <span role="status" className="text-xs text-emerald-700 dark:text-emerald-300">{message}</span>}
      {error && <span role="alert" className="max-w-56 text-xs text-red-700 dark:text-red-300">{error}</span>}
    </div>
  );
}
