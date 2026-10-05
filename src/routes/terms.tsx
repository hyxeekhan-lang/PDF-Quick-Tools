import { Link, createFileRoute } from "@tanstack/react-router";
import { ArticlePage, Block, Bullets } from "#/components/Prose";
import { pageHead } from "#/lib/seo";
import { MAX_FILE_LABEL, SITE_NAME } from "#/lib/site";

export const Route = createFileRoute("/terms")({
  head: () =>
    pageHead({
      title: `Terms of Use | ${SITE_NAME}`,
      description: `The terms that apply when you use the free PDF tools on ${SITE_NAME}.`,
      path: "/terms",
    }),
  component: Terms,
});

function Terms() {
  return (
    <ArticlePage
      title="Terms of Use"
      intro={`The plain version of what you can expect from ${SITE_NAME}, and what we expect from you.`}
      updated="14 September 2026"
    >
      <Block title="Using the tools">
        <p>
          The tools on this site are free to use for personal and commercial
          work. No account is required. You keep every right you already had in
          the documents you process, and we gain none of them.
        </p>
      </Block>

      <Block title="Your files are your responsibility">
        <p>
          Most regular PDF tools process on your device, so the original file stays
          in the browser and is not stored by us. If you use an AI feature, extracted
          text may be sent to the AI provider for the request. Keep your original.
          Download your result before closing the tab, because the processed file is
          held in browser memory and is gone once the tab closes.
        </p>
      </Block>

      <Block title="Fair use">
        <Bullets
          items={[
            "Do not use these tools on documents you have no right to modify.",
            `Files are limited to ${MAX_FILE_LABEL} each, and very large documents also depend on your device's available memory.`,
            "Do not attempt to disrupt the site or the experience of other people using it.",
          ]}
        />
      </Block>

      <Block title="No warranty">
        <p>
          The tools are provided as they are, without warranty of any kind. PDF
          is a large and inconsistent format, and some files, particularly
          damaged ones, unusual exports and password protected documents, will
          not process correctly. Check every result before you rely on it.
        </p>
        <p>
          To the extent the law allows, we are not liable for any loss arising
          from the use of this site, including lost or altered documents.
        </p>
      </Block>

      <Block title="AI-generated results">
        <p>
          AI tools use extracted document text to produce summaries, answers,
          translations, rewrites, citations, analyses, study materials, and
          other suggestions. AI output is not professional, legal, medical,
          financial, academic, or hiring advice. Check every result against the
          original document before relying on it.
        </p>
      </Block>

      <Block title="Availability and changes">
        <p>
          Tools may be added, changed or withdrawn. We may update these terms;
          the date at the top of this page shows when they last changed.
        </p>
      </Block>

      <Block title="Contact">
        <p>
          {SITE_NAME} is operated by Muhammad Hamid from Faisalabad, Pakistan.
          Questions belong on the{" "}
          <Link to="/contact" className="font-semibold text-brand-700 dark:text-brand-300">
            contact page
          </Link>
          .
        </p>
      </Block>
    </ArticlePage>
  );
}
