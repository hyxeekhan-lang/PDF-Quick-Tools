import { SparkIcon } from "./Icons";
import { cx } from "./ui";

/**
 * The primary action on every AI tool — the one that spends a request.
 *
 * `disabled` is part of the props rather than something callers style, because
 * the only thing it changes is the dimming, and having four call sites each
 * re-derive that means one of them eventually won't.
 *
 * It sits directly beside `button("secondary", "lg")` on all four pages, so it
 * has to agree with that scale — `lg` is px-6 py-3.5 text-base, rounded-xl. A
 * pill next to a rect reads as two unrelated controls rather than one action and
 * its alternative.
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
      <SparkIcon className="generate-button-spark h-[1.125rem] w-[1.125rem]" />
    </button>
  );
}
