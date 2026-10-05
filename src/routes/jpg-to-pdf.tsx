import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileList } from "#/components/FileList";
import { FileUploader } from "#/components/FileUploader";
import { OptionCards } from "#/components/OptionCards";
import { EmptyState, ErrorMessage, ProgressBar, SuccessPanel } from "#/components/ToolFeedback";
import { OptionGroup, ToolPanel, ToolShell } from "#/components/ToolShell";
import { button } from "#/components/ui";
import { useToolRun } from "#/hooks/useToolRun";
import { formatBytes, type AcceptedFile } from "#/lib/files";
import { imagesToPdf, type PageOrientation, type PageSize } from "#/lib/operations";
import { pageHead } from "#/lib/seo";
import { toolByHref } from "#/lib/tools";

const tool = toolByHref("/jpg-to-pdf");

export const Route = createFileRoute("/jpg-to-pdf")({
  head: () =>
    pageHead({
      title: tool.title,
      description: tool.description,
      path: tool.href,
    }),
  component: JpgToPdfPage,
});

const SIZES = [
  { value: "a4" as const, label: "A4", description: "The standard almost everywhere" },
  { value: "letter" as const, label: "US Letter", description: "Standard in the US and Canada" },
  { value: "fit" as const, label: "Fit to image", description: "Each page matches its image" },
];

const ORIENTATIONS = [
  { value: "portrait" as const, label: "Portrait", description: "Taller than it is wide" },
  { value: "landscape" as const, label: "Landscape", description: "Wider than it is tall" },
];

const FAQ = [
  {
    question: "Which image formats can I use?",
    answer:
      "JPG, PNG and WebP, up to 50 MB each. PNG transparency is placed on a white background, because PDF pages do not have a transparent backing.",
  },
  {
    question: "Can I change the order of the images?",
    answer:
      "Yes. Every image in the list has an up and a down arrow, and the PDF is built in the order shown on screen.",
  },
  {
    question: "What does fit to image do?",
    answer:
      "It gives each page exactly the dimensions of its own image, so nothing is padded or cropped. It is the right choice for screenshots and receipts. Choose A4 or Letter when the document is going to be printed.",
  },
  {
    question: "Do I need an account?",
    answer: "No. No signup, no email, no subscription.",
  },
  {
    question: "Are my photos uploaded anywhere?",
    answer:
      "Most regular image-to-PDF work happens in this browser tab on your own device, so the images are not uploaded to a server as part of the standard workflow.",
  },
];

function JpgToPdfPage() {
  const [files, setFiles] = useState<AcceptedFile[]>([]);
  const [size, setSize] = useState<PageSize>("a4");
  const [orientation, setOrientation] = useState<PageOrientation>("portrait");
  const [margin, setMargin] = useState(true);
  const run = useToolRun(tool.name);
  const busy = run.status === "working";

  function add(incoming: AcceptedFile[]) {
    setFiles((current) => [...current, ...incoming]);
    if (run.status !== "idle") run.reset();
  }

  function remove(id: string) {
    setFiles((current) => current.filter((item) => item.id !== id));
    if (run.status !== "idle") run.reset();
  }

  function move(id: string, direction: -1 | 1) {
    setFiles((current) => {
      const index = current.findIndex((item) => item.id === id);
      const next = index + direction;
      if (index === -1 || next < 0 || next >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  }

  function startOver() {
    setFiles([]);
    run.reset();
  }

  async function convert() {
    await run.run(async (report) => [
      await imagesToPdf(files, { size, orientation, margin }, report),
    ]);
  }

  return (
    <ToolShell tool={tool} faq={FAQ} about={<About />}>
      <ToolPanel>
        {run.status !== "done" && (
          <FileUploader
            kind="image"
            multiple
            toolName={tool.name}
            onFiles={add}
            onRejected={run.fail}
            compact={files.length > 0}
            label={files.length > 0 ? "Add more images" : "Upload images"}
            hint="JPG, PNG or WebP · Maximum size: 50 MB per file"
          />
        )}

        {/* A rejected file is reported even when nothing has been added yet. */}
        {run.status === "error" && files.length === 0 && run.error && (
          <ErrorMessage message={run.error} />
        )}

        {run.status !== "done" &&
          (files.length === 0 ? (
            <EmptyState
              title="No images selected"
              body="Add JPG, PNG or WebP images and they become pages in the order you arrange them."
            />
          ) : (
            <>
              <p className="text-sm font-semibold text-ink-900 dark:text-white">
                {files.length} image{files.length === 1 ? "" : "s"} ·{" "}
                <span className="font-normal text-ink-500">
                  {formatBytes(files.reduce((sum, item) => sum + item.size, 0))}
                </span>
              </p>

              <FileList
                files={files}
                kind="image"
                disabled={busy}
                onRemove={remove}
                onMove={move}
              />

              <OptionGroup legend="Page size">
                <OptionCards
                  name="size"
                  options={SIZES}
                  value={size}
                  onChange={setSize}
                  disabled={busy}
                />
              </OptionGroup>

              {size !== "fit" && (
                <>
                  <OptionGroup legend="Orientation">
                    <OptionCards
                      name="orientation"
                      options={ORIENTATIONS}
                      value={orientation}
                      onChange={setOrientation}
                      disabled={busy}
                      columns={2}
                    />
                  </OptionGroup>

                  <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-medium text-ink-700 dark:text-ink-300">
                    <input
                      type="checkbox"
                      checked={margin}
                      disabled={busy}
                      onChange={(event) => setMargin(event.target.checked)}
                      className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500 dark:border-ink-600 dark:bg-ink-800"
                    />
                    Leave a small margin around each image
                  </label>
                </>
              )}

              {busy && <ProgressBar progress={run.progress} />}

              {run.status === "error" && run.error && (
                <ErrorMessage
                  message={run.error}
                  onRetry={files.length > 0 ? convert : undefined}
                  onStartOver={startOver}
                />
              )}

              {!busy && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={convert} className={button("primary", "lg")}>
                    Convert to PDF
                  </button>
                  <button
                    type="button"
                    onClick={startOver}
                    className={button("secondary", "lg")}
                  >
                    Clear Images
                  </button>
                </div>
              )}
            </>
          ))}

        {run.status === "done" && run.results.length > 0 && (
          <SuccessPanel
            title="PDF created successfully"
            stats={[
              { label: "Pages", value: String(files.length), highlight: true },
              { label: "File size", value: formatBytes(run.results[0].size) },
            ]}
            results={run.results}
            toolName={tool.name}
            onStartOver={startOver}
            startOverLabel="Convert More Images"
          />
        )}
      </ToolPanel>
    </ToolShell>
  );
}

function About() {
  return (
    <>
      <p>
        Photos of a document are easy to take and awkward to send. Turning them
        into a single PDF gives you one file, in a fixed order, that opens the
        same way on every device and can be printed without anyone guessing
        which picture came first.
      </p>
      <p>
        This is the usual route for scanned receipts photographed on a phone,
        signed forms, ID copies and homework. Put the images in order, pick A4 or
        Letter if it is going to be printed, and you have a document rather than
        a camera roll.
      </p>
      <p>
        Images are read and embedded in your own browser, and the process is kept
        local to the current tab. For regular file conversion, the source images are
        not uploaded to a server as part of the normal workflow.
      </p>
    </>
  );
}
