import { OCR_LANGUAGES, type OcrLanguage } from "#/lib/operations-ocr";

export function OcrLanguageSelect({
  value,
  onChange,
  disabled,
  id,
}: {
  value: OcrLanguage;
  onChange: (language: OcrLanguage) => void;
  disabled?: boolean;
  id: string;
}) {
  return (
    <label className="block text-sm font-medium text-ink-700 dark:text-ink-300" htmlFor={id}>
      Recognition language
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const selected = OCR_LANGUAGES.find(
            (language) => language.code === event.target.value,
          );
          if (selected) onChange(selected.code);
        }}
        className="mt-1.5 block w-full rounded-xl bg-white px-3 py-2.5 text-sm text-ink-900 ring-1 ring-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 dark:bg-ink-900 dark:text-white dark:ring-ink-700"
      >
        {OCR_LANGUAGES.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs font-normal text-ink-500 dark:text-ink-400">
        Language models load from this site and stay on your device.
      </span>
    </label>
  );
}
