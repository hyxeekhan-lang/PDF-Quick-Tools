import { Link, createFileRoute } from "@tanstack/react-router";
import { ArticlePage, Block, Bullets } from "#/components/Prose";
import { pageHead } from "#/lib/seo";
import { MAX_FILE_LABEL, SITE_NAME } from "#/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () =>
    pageHead({
      title: `Privacy Policy | ${SITE_NAME}`,
      description: `How ${SITE_NAME} handles your files, AI-extracted text, analytics, and privacy choices.`,
      path: "/privacy",
    }),
  component: Privacy,
});

function Privacy() {
  return (
    <ArticlePage
      title="Privacy Policy"
      intro={`How ${SITE_NAME} handles your files, and what we do and do not collect.`}
      updated="2 October 2026"
    >
      <Block title="Your files are not uploaded">
        <p>
          Every tool on this site runs inside your own web browser, using your
          device's own processor and memory. When you choose a PDF or an image,
          the browser reads it locally. For non-AI PDF tools, the original file
          is not transmitted to us or stored on our servers.
        </p>
        <p>
          The finished document lives in your browser's memory until you close or
          reload the tab. There is no server copy of the original file to store,
          delete, or retain.
        </p>
      </Block>

      <Block title="AI tools and extracted text">
        <p>
          When you choose an AI tool, text extracted from your PDF is sent to our
          server-side AI endpoint to generate the requested response. The
          original PDF remains in your browser, but the extracted text is
          processed by our AI provider for that request. Do not use an AI tool
          with information you are not permitted to share with an AI service.
        </p>
        <p>
          The request reaches third-party AI providers, currently Google Gemini
          and, as a fallback, Groq. If the first provider returns a quota or
          rate-limit error, the same prompt is retried against the second
          provider so the tool keeps working. Both providers process the request
          under their own privacy policies and terms, and may retain content
          according to those policies. We do not send your files to either
          provider, only the text or page image needed for the action you
          requested.
        </p>
        <p>
          Only part of a long document is sent. Depending on the tool, extracted
          text is truncated to roughly 12,000&ndash;32,000 characters, and the
          rest is marked as truncated. If a PDF has no extractable text and
          looks scanned, the first few pages are rendered to an image in your
          browser and that image is sent instead of text.
        </p>
        <p>
          AI responses can be incomplete or incorrect. We do not use uploaded
          documents or extracted text to build a user profile, and we do not
          store document text in this site's application storage.
        </p>
      </Block>

      <Block title="Server logs">
        <p>
          Like any web server, our hosting provider records technical request
          logs such as IP address, timestamp, and requested URL. These are used
          for security and diagnosing failures.
        </p>
        <p>
          When an AI request fails, our server also writes the error status and
          the AI provider's error response to its server console log. These
          diagnostics are not linked to your document contents and are not used
          for analytics or advertising. Do not send an AI tool any text you
          would not want recorded in an error log.
        </p>
      </Block>

      <Block title="What this means in practice">
        <Bullets
          items={[
            "For regular PDF tools, we cannot read your document contents because the original file stays in your browser.",
            "We do not know the names of your files.",
            "AI tools send extracted text to the AI service only when you explicitly run an AI action.",
            `The ${MAX_FILE_LABEL} limit exists because the work happens on your device, not because of a storage quota.`,
            "Closing the tab removes the processed file from memory.",
          ]}
        />
      </Block>

      <Block title="What we do collect">
        <p>
          We collect anonymous usage measurements so we know which tools are
          worth improving. These are counts of actions, not contents. For
          example: a tool page was opened, a file was selected, processing
          started, processing finished, processing failed, a download was
          clicked.
        </p>
        <p>
          These events include the name of the tool and basic technical details
          such as file count and size. They do not include filenames, file
          contents, page text, email addresses, or anything extracted from your
          documents. Analytics events are sent only after you choose to allow
          analytics in the consent notice.
        </p>
      </Block>

      <Block title="Cookies and local storage">
        <p>
          We store small preferences in your browser for theme and consent
          choices. If you allow analytics, an anonymous consent preference lets
          us measure tool usage. No advertising tracking cookies are used by the
          site.
        </p>
      </Block>

      <Block title="No advertising">
        <p>
          This site serves no third-party display ads. Nothing is loaded from an
          ad network, and there are no pop-unders, pop-ups, or scripts that open
          a new tab on their own.
        </p>
        <p>
          We do not sell personal information or use document contents for
          advertising of any kind.
        </p>
      </Block>

      <Block title="Accounts">
        <p>
          The tools on this site do not require an account. We do not ask for
          your email address, your phone number, or a password, so there is no
          account record to secure, export, or delete.
        </p>
      </Block>

      <Block title="Children">
        <p>
          These tools are general-purpose utilities and are not directed at
          children. We do not knowingly collect personal information from
          anyone, of any age, because we do not collect personal information at
          all.
        </p>
      </Block>

      <Block title="Changes to this policy">
        <p>
          If how the site works changes, this page changes with it, and the date
          at the top is updated. We will not quietly start uploading files and
          leave this page as it is.
        </p>
      </Block>

      <Block title="Getting in touch">
        <p>
          Questions about this policy are welcome on the{" "}
          <Link to="/contact" className="font-semibold text-brand-700 dark:text-brand-300">
            contact page
          </Link>
          .
        </p>
      </Block>
    </ArticlePage>
  );
}
