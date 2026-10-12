import { useEffect, useState } from "react";
import type { AcceptedFile, ResultFile } from "#/lib/files";
import { closeRender, openForRender, renderPage } from "#/lib/pdf";
import { formatBytes } from "#/lib/files";
import { muted } from "./ui";

export function CompressionComparison({
  files,
  results,
}: {
  files: AcceptedFile[];
  results: ResultFile[];
}) {
  const [index, setIndex] = useState(0);
  const [previews, setPreviews] = useState<[string, string] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentIndex = Math.min(index, files.length - 1, results.length - 1);
  const original = files[currentIndex];
  const compressed = results[currentIndex];

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    setPreviews(null);
    setError(null);

    async function makePreview(file: File): Promise<string> {
      const document = await openForRender(file);
      try {
        const canvas = await renderPage(document, 1, { scale: 1, maxWidth: 640 });
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((value) => {
            if (value) resolve(value);
            else reject(new Error("Could not create the preview image."));
          }, "image/jpeg", 0.82);
        });
        canvas.width = 0;
        canvas.height = 0;
        const url = URL.createObjectURL(blob);
        urls.push(url);
        return url;
      } finally {
        await closeRender(document);
      }
    }

    async function load() {
      if (!original || !compressed) return;
      try {
        const before = await makePreview(original.file);
        const blob = await fetch(compressed.url).then((response) => {
          if (!response.ok) throw new Error("The compressed preview could not be loaded.");
          return response.blob();
        });
        const after = await makePreview(new File([blob], compressed.filename, { type: "application/pdf" }));
        if (!cancelled) setPreviews([before, after]);
      } catch {
        if (!cancelled) setError("Page preview is unavailable for this PDF. The size comparison and downloads are still ready.");
      }
    }

    void load();
    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [compressed, original]);

  if (!original || !compressed) return null;

  return (
    <section aria-labelledby="compression-preview-heading" className="mt-5 rounded-2xl bg-white p-5 ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="compression-preview-heading" className="text-base font-semibold text-ink-900 dark:text-white">
            Before and after preview
          </h2>
          <p className={`mt-1 text-xs ${muted}`}>First page preview. Compare the result before downloading.</p>
        </div>
        {files.length > 1 && (
          <label className="text-sm font-medium text-ink-700 dark:text-ink-300">
            Compare file
            <select
              value={currentIndex}
              onChange={(event) => setIndex(Number(event.target.value))}
              className="ml-2 rounded-lg bg-white px-2 py-1.5 ring-1 ring-ink-200 dark:bg-ink-950 dark:ring-ink-700"
            >
              {files.map((file, fileIndex) => (
                <option key={file.id} value={fileIndex}>{file.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {previews ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[
            { label: "Original", url: previews[0], size: original.size },
            { label: "Compressed", url: previews[1], size: compressed.size },
          ].map((preview) => (
            <figure key={preview.label} className="min-w-0">
              <figcaption className="mb-2 flex justify-between text-sm font-medium text-ink-700 dark:text-ink-300">
                <span>{preview.label}</span>
                <span>{formatBytes(preview.size)}</span>
              </figcaption>
              <img src={preview.url} alt={`${preview.label} first page of ${original.name}`} className="h-64 w-full rounded-xl bg-ink-100 object-contain dark:bg-ink-950" />
            </figure>
          ))}
        </div>
      ) : error ? (
        <p role="status" className={`mt-4 text-sm ${muted}`}>{error}</p>
      ) : (
        <p role="status" className={`mt-4 text-sm ${muted}`}>Preparing page previews…</p>
      )}
    </section>
  );
}
