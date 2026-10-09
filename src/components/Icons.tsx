import type { ToolIconName } from "#/lib/tools";

interface IconProps {
  className?: string;
}

const base = "h-5 w-5";

function Svg({
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? base}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function CompressIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9V6a2 2 0 0 1 2-2h3" />
      <path d="M20 9V6a2 2 0 0 0-2-2h-3" />
      <path d="M4 15v3a2 2 0 0 0 2 2h3" />
      <path d="M20 15v3a2 2 0 0 1-2 2h-3" />
      <path d="M8 12h8" />
      <path d="m10 9.5 2-2 2 2" />
      <path d="m10 14.5 2 2 2-2" />
    </Svg>
  );
}

export function MergeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="9" height="11" rx="2" />
      <rect x="12" y="10" width="9" height="11" rx="2" />
      <path d="M7.5 18h3" />
    </Svg>
  );
}

export function SplitIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3v6" />
      <path d="M12 15v6" />
      <path d="M4 12h16" strokeDasharray="3 3" />
      <path d="m9 6 3-3 3 3" />
      <path d="m9 18 3 3 3-3" />
    </Svg>
  );
}

export function ToJpgIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <rect x="13" y="12" width="8" height="8" rx="1.5" />
      <circle cx="15.5" cy="14.5" r=".8" />
      <path d="m13 18 2.5-2.5L21 20" />
    </Svg>
  );
}

export function ToPdfIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="9" height="9" rx="1.5" />
      <circle cx="5.8" cy="6.8" r=".8" />
      <path d="m3 11 2.5-2.5L12 13" />
      <path d="M17 21h-6a2 2 0 0 1-2-2v-2" />
      <path d="M14 8h3a2 2 0 0 1 2 2v8" />
      <path d="m16 16 3 3 3-3" />
    </Svg>
  );
}

export function RotateIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 11a8 8 0 1 0-2.6 5.9" />
      <path d="M20 5v6h-6" />
    </Svg>
  );
}

export function ReorderIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="11" height="7" rx="1.5" />
      <rect x="9" y="13" width="11" height="7" rx="1.5" />
      <path d="M18 7h2" />
      <path d="m18 5 2 2-2 2" />
    </Svg>
  );
}

export function DeleteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </Svg>
  );
}

export function ExtractIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 16H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6l4 4v2" />
      <rect x="10" y="10" width="10" height="11" rx="2" />
      <path d="M13 15h4" />
      <path d="M13 18h4" />
    </Svg>
  );
}

export function PageNumbersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M8 12h8" />
      <path d="M8 16h3" />
      <path d="M16 16h.01" />
    </Svg>
  );
}

export function WatermarkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 5h16v14H4z" />
      <path d="m7 16 10-8" />
      <path d="M7 9h.01M17 15h.01" />
    </Svg>
  );
}

export function SignIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 19c3-5 4-9 6-9s-1 6 1 6 3-5 5-5 0 4 4 4" />
      <path d="M4 21h16" />
    </Svg>
  );
}

export function PdfFileIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M8.5 17v-4h1.2a1.2 1.2 0 0 1 0 2.4H8.5" />
      <path d="M13 17v-4h1a2 2 0 0 1 0 4z" />
    </Svg>
  );
}

export function ImageFileIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4 17 5-5 4.5 4.5L17 13l3 3" />
    </Svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </Svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m4.5 12.5 5 5 10-11" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </Svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.2v.3" />
    </Svg>
  );
}

/**
 * The favourite star.
 *
 * Takes `filled` because the outline/filled pair carries the whole state, and a
 * component that hardcoded one of them would mean two icons for one meaning.
 */
export function StarIcon({ filled = false, className }: IconProps & { filled?: boolean }) {
  return (
    <Svg className={className}>
      <path
        fill={filled ? "currentColor" : "none"}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.5 3.5a1 1 0 0 1 1.9 0l2.3 5.2 5.6.6a1 1 0 0 1 .6 1.8l-4.2 3.7 1.2 5.5a1 1 0 0 1-1.5 1.1L12 18.6l-4.9 2.8a1 1 0 0 1-1.5-1.1l1.2-5.5L2.6 11a1 1 0 0 1 .6-1.8l5.6-.6 2.3-5.2z"
      />
    </Svg>
  );
}

/** Used only for the "clear this list" controls. */
export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12" />
    </Svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Svg>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13 3 5 13h6l-1 8 8-10h-6z" />
    </Svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4v4" />
      <path d="M12 16v4" />
      <path d="M4 12h4" />
      <path d="M16 12h4" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function LeafIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 19c0-7 5-12 15-13 0 10-5 14-11 14H5z" />
      <path d="M5 19c3-4 6-6 10-8" />
    </Svg>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </Svg>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4.5A2.5 2.5 0 0 0 7 10.5" />
      <path d="M17 6h2.5A2.5 2.5 0 0 1 17 10.5" />
      <path d="M12 14v4" />
      <path d="M9 20h6" />
      <path d="M10 18h4l.6 2H9.4z" />
    </Svg>
  );
}

export function HandIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M11 12V4.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M14 12V6.5a1.5 1.5 0 0 1 3 0V13" />
      <path d="M8 12.5 6.6 11a1.6 1.6 0 0 0-2.4 2.1l3.3 5A4 4 0 0 0 10.9 20H14a4 4 0 0 0 4-4v-3.5" />
    </Svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </Svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3.5v-5h3v5H17a1 1 0 0 0 1-1v-9" />
    </Svg>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </Svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </Svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </Svg>
  );
}

export function BotIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="8" width="14" height="12" rx="3" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      <circle cx="9.5" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="14" r="1" fill="currentColor" stroke="none" />
      <path d="M10 17h4" />
    </Svg>
  );
}

export function SummarizeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6h16" />
      <path d="M4 10h12" />
      <path d="M4 14h14" />
      <path d="M4 18h10" />
      <path d="M20 14v6" />
      <path d="M17 17h6" />
    </Svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </Svg>
  );
}

export function QuizIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5c0 1.03-1.27 1.5-1.75 2.25-.37.58-.25 1.25-.25 1.75" />
      <circle cx="12" cy="17" r=".8" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function NotesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M8 13h3" />
      <path d="M8 17h6" />
      <path d="M8 9h1" />
    </Svg>
  );
}

export function LightbulbIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
    </Svg>
  );
}

export function WandIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 4V2" />
      <path d="M15 16v-2" />
      <path d="M8 9h2" />
      <path d="M20 9h2" />
      <path d="M17.8 11.8 19 13" />
      <path d="M15 9h0" />
      <path d="M17.8 6.2 19 5" />
      <path d="m3 21 9-9" />
      <path d="M12.2 6.2 11 5" />
    </Svg>
  );
}

export function BrainIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M12 5v13" />
    </Svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </Svg>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.3 9.3" />
      <path d="m17 6 4-4" />
      <path d="m21 6-4-4" />
    </Svg>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <circle cx="3.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="18" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m22 2-7 20-4-9-9-4z" />
      <path d="M22 2 11 13" />
    </Svg>
  );
}

export function CropIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.5 2v15.5H22" />
      <path d="M2 6.5h15.5V22" />
    </Svg>
  );
}

export function ResizeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 8h8v8H8z" />
    </Svg>
  );
}

export function FlattenIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3v11" />
      <path d="m8 10 4 4 4-4" />
      <path d="M4 18h16" />
      <path d="M4 21h16" />
    </Svg>
  );
}

export function GrayscaleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function MetadataIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9h6" />
      <path d="M7 13h4" />
      <circle cx="16" cy="16" r="2.5" />
    </Svg>
  );
}

export function TextIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6h16" />
      <path d="M4 11h16" />
      <path d="M4 16h10" />
    </Svg>
  );
}

export function DocumentFileIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </Svg>
  );
}

export function BlankPageIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M12 11v6" />
      <path d="M9.5 14.5 12 17l2.5-2.5" />
    </Svg>
  );
}

export function HeaderIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M7 14h7" />
    </Svg>
  );
}

export function EmbedIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 19h16" />
    </Svg>
  );
}

export function FormIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h4" />
    </Svg>
  );
}

export function RedactIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 10h10M7 14h6" />
      <rect x="4" y="12" width="16" height="5" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function HighlightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20h16" />
      <path d="M6 16 15 7l3 3-9 9H6z" />
      <path d="M13 9l3 3" />
    </Svg>
  );
}

export function BookmarkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 4h12v16l-6-4-6 4z" />
    </Svg>
  );
}

export function MarkdownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M6 15v-6l2.5 3L11 9v6" />
      <path d="M15 9v6M13 13.5 15 15.5 17 13.5" />
    </Svg>
  );
}

export function CompareIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3v18" />
      <path d="M7 7 3 12l4 5" />
      <path d="m17 7 4 5-4 5" />
    </Svg>
  );
}

export function EditTextIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20h16" />
      <path d="M6 16 15 7l3 3-9 9H6z" />
      <path d="M14 5h6v6" />
    </Svg>
  );
}

export function RepairIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14.7 6.3a4 4 0 0 0 5 5L21 21H3l9.7-9.7a4 4 0 0 1 2-5z" />
      <path d="m16 8 2 2" />
    </Svg>
  );
}

export function UnlockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </Svg>
  );
}

export function ScanIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3" />
      <path d="M3 12h18" />
    </Svg>
  );
}

const TOOL_ICONS: Record<ToolIconName, (props: IconProps) => React.ReactElement> = {
  compress: CompressIcon,
  merge: MergeIcon,
  split: SplitIcon,
  toJpg: ToJpgIcon,
  toPdf: ToPdfIcon,
  rotate: RotateIcon,
  reorder: ReorderIcon,
  delete: DeleteIcon,
  extract: ExtractIcon,
  pageNumbers: PageNumbersIcon,
  watermark: WatermarkIcon,
  sign: SignIcon,
  summarize: SummarizeIcon,
  chat: ChatIcon,
  quiz: QuizIcon,
  notes: NotesIcon,
  brain: BrainIcon,
  wand: WandIcon,
  translate: BrainIcon,
  rewrite: WandIcon,
  ask: ChatIcon,
  presentation: NotesIcon,
  flashcard: QuizIcon,
  citation: NotesIcon,
  grammar: WandIcon,
  analyze: BrainIcon,
  resume: NotesIcon,
  questions: QuizIcon,
  crop: CropIcon,
  resize: ResizeIcon,
  flatten: FlattenIcon,
  grayscale: GrayscaleIcon,
  metadata: MetadataIcon,
  text: TextIcon,
  blank: BlankPageIcon,
  header: HeaderIcon,
  embed: EmbedIcon,
  form: FormIcon,
  redact: RedactIcon,
  highlight: HighlightIcon,
  bookmark: BookmarkIcon,
  markdown: MarkdownIcon,
  compare: CompareIcon,
  editText: EditTextIcon,
  repair: RepairIcon,
  lock: LockIcon,
  unlock: UnlockIcon,
  scan: ScanIcon,
  grid: GridIcon,
};

export function ToolIcon({
  name,
  className,
}: {
  name: ToolIconName;
  className?: string;
}) {
  const Component = TOOL_ICONS[name];
  return <Component className={className} />;
}
