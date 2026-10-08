declare global {
  interface Window {
    whop?: {
      track: (event: string, data?: Record<string, unknown>) => void;
    };
  }
}

/**
 * Anonymous product events only after the visitor allows analytics. No
 * filenames, file contents, document text, or contact details are sent.
 */
export function track(event: string, data?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem("pqt-cookie-consent") !== "accepted") return;
  } catch {
    return;
  }
  window.whop?.track(event, data);
}

export const toolEvents = {
  opened: (tool: string) => track("tool_opened", { tool }),
  fileSelected: (tool: string, count: number, bytes: number) =>
    track("file_selected", { tool, count, bytes }),
  started: (tool: string) => track("processing_started", { tool }),
  completed: (tool: string, ms: number) =>
    track("processing_completed", { tool, ms }),
  failed: (tool: string, reason: string) =>
    track("processing_failed", { tool, reason }),
  downloaded: (tool: string) => track("download_clicked", { tool }),
};

/**
 * Events for the journey that happens *before* a tool opens.
 *
 * Every `toolEvents` entry fires from inside a tool, so the funnel had a name
 * but no top: nothing recorded that a visitor arrived, which hero button they
 * pressed, or whether they left for a competitor instead. Without these, the
 * only way to tell the hero dropzone from the "Explore Tools" button apart was
 * to guess, and changes to either one were unmeasurable.
 *
 * No filenames, file contents, or document text — only which link was pressed.
 */
export const navEvents = {
  landing: () => track("landing_viewed"),
  cta: (where: string, label: string) => track("cta_clicked", { where, label }),
  heroDrop: (bytes: number) => track("hero_drop_started", { bytes }),
  toolsSearch: (query: string) =>
    // The query itself can be a company name or a document title, so only the
    // fact that a search happened, and how long it was, is sent.
    track("tools_searched", { length: query.length }),
  extension: (place: string) => track("extension_clicked", { place }),
  outbound: (target: string) => track("outbound_clicked", { target }),
};
