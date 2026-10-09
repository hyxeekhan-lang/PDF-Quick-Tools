import { SparkIcon } from "./Icons";
import { cx } from "./ui";

/**
 * The primary action on every AI tool — the one that spends a request.
 *
 * `disabled` is part of the props rather than something callers style, because
 * the only thing it changes is the dimming, and having four call sites each
 * re-derive that means one of them eventually won't.
 */
export function GenerateButton({
  children,
  onClick,
  className,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx("generate-button", className)}
    >
      <span className="generate-button-glow" aria-hidden="true" />
      <span>{children}</span>
      <SparkIcon className="generate-button-spark h-[1.05rem] w-[1.05rem]" />
    </button>
  );
}
