import type { ToolIconName } from "#/lib/tools";
import { ToolIcon } from "./Icons";

/**
 * The colourful tool tile: a rounded square with a vivid gradient and the
 * tool's glyph knocked out in white on top.
 *
 * This is a house style, not a copy of any app store's icons. The reference
 * was the familiar "flat tile, bright gradient, white glyph" look; every
 * gradient and every glyph here is drawn for this project, which is what
 * keeps it safe to use commercially.
 *
 * The tiles are decorative and the tool name always sits next to them, so the
 * gradient carries no meaning on its own. They are hidden from assistive tech
 * and, on the plain and dark surfaces where a full-colour tile would be loud,
 * `plain` drops the background and falls back to the monochrome glyph.
 */

type Gradient = readonly [string, string];

const PALETTE: Record<ToolIconName, Gradient> = {
  compress: ["#f97316", "#ef4444"],
  merge: ["#6366f1", "#8b5cf6"],
  split: ["#0ea5e9", "#6366f1"],
  toJpg: ["#10b981", "#84cc16"],
  toPdf: ["#14b8a6", "#0ea5e9"],
  rotate: ["#f59e0b", "#f97316"],
  reorder: ["#8b5cf6", "#d946ef"],
  delete: ["#ef4444", "#f43f5e"],
  extract: ["#06b6d4", "#3b82f6"],
  pageNumbers: ["#3b82f6", "#6366f1"],
  watermark: ["#a855f7", "#ec4899"],
  sign: ["#22c55e", "#14b8a6"],
  summarize: ["#6366f1", "#a855f7"],
  chat: ["#0ea5e9", "#8b5cf6"],
  quiz: ["#f59e0b", "#f43f5e"],
  notes: ["#eab308", "#f97316"],
  brain: ["#7c3aed", "#4f46e5"],
  wand: ["#d946ef", "#8b5cf6"],
  translate: ["#0d9488", "#0ea5e9"],
  rewrite: ["#8b5cf6", "#ec4899"],
  ask: ["#2563eb", "#06b6d4"],
  presentation: ["#ea580c", "#f59e0b"],
  flashcard: ["#0891b2", "#4f46e5"],
  citation: ["#4f46e5", "#0ea5e9"],
  grammar: ["#db2777", "#9333ea"],
  analyze: ["#059669", "#0891b2"],
  resume: ["#ca8a04", "#ea580c"],
  questions: ["#7c3aed", "#2563eb"],
  crop: ["#16a34a", "#65a30d"],
  resize: ["#0284c7", "#4f46e5"],
  flatten: ["#0891b2", "#4f46e5"],
  grayscale: ["#475569", "#94a3b8"],
  metadata: ["#64748b", "#a78bfa"],
  text: ["#0ea5e9", "#22d3ee"],
  blank: ["#94a3b8", "#cbd5e1"],
  header: ["#e11d48", "#f59e0b"],
  form: ["#0ea5e9", "#2563eb"],
  redact: ["#111827", "#4b5563"],
  highlight: ["#facc15", "#fb923c"],
  embed: ["#8b5cf6", "#6366f1"],
  bookmark: ["#f59e0b", "#eab308"],
  markdown: ["#0ea5e9", "#6366f1"],
  compare: ["#14b8a6", "#0ea5e9"],
  editText: ["#8b5cf6", "#ec4899"],
  repair: ["#64748b", "#0ea5e9"],
lock: ["#dc2626", "#f97316"],
unlock: ["#10b981", "#84cc16"],
scan: ["#6366f1", "#a855f7"],
  grid: ["#22c55e", "#14b8a6"],
};

/** Rounded-square radius that reads as a squircle rather than a sharp box. */
const TILE =
  "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[22%]";

export interface ToolIconTileProps {
  name: ToolIconName;
  /** Tile size. The glyph scales off this so they stay in proportion. */
  size?: "sm" | "md" | "lg";
  /** Drop the gradient and render the plain glyph in the inherited colour. */
  plain?: boolean;
  className?: string;
}

const SIZES = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-14 w-14",
} as const;

const GLYPH = {
  sm: "h-[18px] w-[18px]",
  md: "h-[22px] w-[22px]",
  lg: "h-[28px] w-[28px]",
} as const;

export function ToolIconTile({
  name,
  size = "md",
  plain = false,
  className = "",
}: ToolIconTileProps) {
  if (plain) {
    return (
      <span className={`${TILE} ${SIZES[size]} ${className}`}>
        <ToolIcon name={name} className={GLYPH[size]} />
      </span>
    );
  }

  const [from, to] = PALETTE[name];

  return (
    <span
      aria-hidden="true"
      className={`${TILE} ${SIZES[size]} shadow-sm ${className}`}
      style={{ backgroundImage: `linear-gradient(140deg, ${from} 0%, ${to} 100%)` }}
    >
      {/* A soft highlight in the top-left corner. Without it the flat gradient
          reads as a plain block; this is what gives the tiles their depth. */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 22% 8%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 60%)",
        }}
      />
      {/* stroke="currentColor" on the shared glyph, forced to white so it reads
          against every gradient in the palette. */}
      <ToolIcon name={name} className={`${GLYPH[size]} relative text-white`} />
    </span>
  );
}
