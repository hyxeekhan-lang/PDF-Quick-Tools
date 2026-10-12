import { StarIcon } from "./Icons";

export function StarRating({
  value,
  onChange,
  label = "Rating",
}: {
  value: number;
  onChange?: (rating: number) => void;
  label?: string;
}) {
  if (!onChange) {
    return (
      <span role="img" aria-label={`${value} out of 5 stars`} className="inline-flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, index) => (
          <StarIcon
            key={index}
            filled={index < value}
            className={`h-4 w-4 ${index < value ? "text-amber-500" : "text-ink-300 dark:text-ink-600"}`}
          />
        ))}
      </span>
    );
  }

  return (
    <div role="radiogroup" aria-label={label} className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const rating = index + 1;
        return (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={value === rating}
            aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
            onClick={() => onChange(rating)}
            className="rounded p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            <StarIcon
              filled={rating <= value}
              className={`h-6 w-6 ${rating <= value ? "text-amber-500" : "text-ink-300 dark:text-ink-600"}`}
            />
          </button>
        );
      })}
    </div>
  );
}
