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
      updated="11 October 2026"
    >
      <Block title="Your files stay on your device">
        <p>
          Every tool on this site runs inside your own web browser, using your
          device's own processor and memory. When you choose a PDF or an image,
          the browser reads it locally. For non-AI PDF tools, the original file
          is not transmitted to us or stored on our servers.
        </p>
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          The AI tools are the exception. Your original file still never leaves
          your device, but the text extracted from it — and, for scanned pages,
          an image of each page — is sent to an AI provider when you start an
          AI action. See the next section for exactly what is sent and to whom.
        </p>
        <p>
          The finished document lives in your browser's memory until you close or
          reload the tab. There is no server copy of the original file to store,
          delete, or retain.
        </p>
      </Block>

      <Block title="Optional Google Drive and signature features">
        <p>
          Google Drive import and export are optional. Only after you choose
          Google Drive do we ask Google for permission to access files created
          or opened by this site (the <code>drive.file</code> scope). A PDF you
          select is downloaded directly into your browser for the chosen tool;
          a result is uploaded to your Drive only when you press “Save to Google
          Drive”. Google OAuth access tokens remain in browser memory and are
          not sent to our application server.
        </p>
        <p>
          The separate “Request PDF Signature” workflow uploads the PDF and
          signer name and email to Dropbox Sign only after you confirm that
          sharing in the form. Dropbox Sign emails the signer and processes the
          signing workflow under its own terms and privacy policy. We retain
          only the provider request identifier and a hash of the private status
          token, for up to 30 days; we do not store the PDF or signer email in
          our application database. The existing “Sign PDF” tool remains
          browser-only.
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
          AI tools process extracted text in consecutive parts so they can work
          with long text-based PDFs, then combine the results. A single AI run
          supports up to 14 parts; exceptionally long documents may need to be
          split into smaller PDFs.
          If a PDF has scanned pages, up to 20 scanned pages per AI run are
          rendered to images and sent instead of text, including scans mixed
          into text-based documents. Any additional scanned pages are identified
          in the AI input; use the local OCR PDF tool to process the full file.
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
        <p>
          Separately, opening a tool page writes one row to a database we
          control: the tool's name and the time. This is what the owner&rsquo;s
          dashboard is built from, and it is why this site can show which tools
          are being used without holding any record of the people using them.
          That row has no IP address, no device, no browser, no cookie and no
          identifier attached to it, and there is no way to tell one visit from
          the same person visiting twice. Your IP address is read only to rate
          limit the write, and is not stored. If you have not accepted the
          consent notice, this row is never written and the request is never
          made.
        </p>
        <p>
          If you choose to answer the question at the bottom of a tool page, a
          second row is written with the tool&rsquo;s name, whether you said it
          worked, any comment you typed (up to 500 characters), and the time.
          That comment is the only free text this site stores from anyone, so it
          is worth being precise about it: it is kept as plain text with markup
          stripped out, it is shown only to the site owner, and it is stored
          with no identifier, email address, or device information attached.
          There is deliberately no way for us to reply to you or to connect a
          comment back to a person &mdash; the trade-off is that we can see what
          went wrong, but not who it went wrong for.
        </p>
      </Block>

      <Block title="Cookies and local storage">
        <p>
          We store small preferences in your browser for theme and consent
          choices. If you allow analytics, an anonymous consent preference lets
          us measure tool usage.
        </p>
      </Block>

      <Block title="Advertising and Google AdSense">
        <p>
          This site is supported by advertising through Google AdSense. Google
          and its partners may use cookies or similar technologies to serve and
          measure ads based on your prior visits to this and other websites.
        </p>
        <p>
          Google's use of advertising cookies enables it and its partners to
          serve ads to you based on that activity. You may opt out of
          personalised advertising by visiting{" "}
          <a
            href="https://adssettings.google.com"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-300"
          >
            Google Ads Settings
          </a>
          . You can also opt out of a third-party vendor's use of cookies for
          personalised advertising at{" "}
          <a
            href="https://optout.aboutads.info"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-300"
          >
            aboutads.info
          </a>
          .
        </p>
        <p>
          Google AdSense ads are loaded only after you allow them in the consent
          notice. If you decline, Google ads and analytics remain off.
        </p>
      </Block>

      <Block title="What we do not do with your documents">
        <p>
          We do not sell personal information, and we never use the contents of
          a document you open or process for advertising of any kind. The PDFs
          you work with here are not sent to any ad network.
        </p>
        <p>
          There are no pop-unders, pop-ups, or scripts that open a new tab on
          their own.
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
