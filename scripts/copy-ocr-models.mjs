import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const languages = ["ara", "hin", "urd"];
const destination = join(root, "public", "ocr", "lang");

await mkdir(destination, { recursive: true });

for (const language of languages) {
  await copyFile(
    join(
      root,
      "node_modules",
      "@tesseract.js-data",
      language,
      "4.0.0_best_int",
      `${language}.traineddata.gz`,
    ),
    join(destination, `${language}.traineddata.gz`),
  );
}
