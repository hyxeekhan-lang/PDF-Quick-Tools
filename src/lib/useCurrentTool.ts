import { useParams } from "@tanstack/react-router";
import { toolByHref, type Tool, type ToolHref } from "./tools";

/**
 * The tool for the page the visitor is currently on.
 *
 * ## Why this exists
 *
 * The success panel needs the tool's route path so its share button can link
 * back to the tool that produced the file. Wiring `toolPath` through by hand
 * would mean editing nineteen route files and four shared components, and every
 * one of those is a place where the prop can be forgotten — which shows up as
 * a working tool whose share button is missing, with nothing failing.
 *
 * Reading the pathname instead removes that whole class of mistake: there is
 * one way the panel can learn where it is, and it cannot be set to the wrong
 * value at a call site.
 *
 * Returns null off a tool route. Every current caller is one, but a null here
 * means a future caller gets a panel with no share row rather than an
 * exception, and `toolByHref` throws on an unknown path rather than inventing a
 * tool — so a typo shows up immediately instead of silently rendering an empty
 * link.
 */
export function useCurrentTool(): Tool | null {
  const params = useParams({ strict: false }) as { pathname?: string };
  const pathname = params?.pathname;

  if (!pathname || !pathname.startsWith("/")) return null;

  try {
    return toolByHref(pathname as ToolHref);
  } catch {
    return null;
  }
}