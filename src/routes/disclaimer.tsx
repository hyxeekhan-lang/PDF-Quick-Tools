import { createFileRoute } from "@tanstack/react-router";
import { ArticlePage, Block, Bullets } from "#/components/Prose";
import { pageHead } from "#/lib/seo";
import { SITE_NAME } from "#/lib/site";

export const Route = createFileRoute("/disclaimer")({
  head: () =>
    pageHead({
      title: `Disclaimer | ${SITE_NAME}`,
      description: `General disclaimer and usage notice for ${SITE_NAME}.`,
      path: "/disclaimer",
    }),
  component: DisclaimerPage,
});

function DisclaimerPage() {
  return (
    <ArticlePage
      title="Disclaimer"
      intro={`Please read this before using ${SITE_NAME}. The tools are designed to help, but they are not a substitute for professional judgment or formal document review.`}
      updated="20 September 2026"
    >
      <Block title="General disclaimer">
        <p>
          The services and tools on this website are provided for general use and
          convenience. They are offered on an "as is" basis, without warranty of
          any kind, either express or implied.
        </p>
      </Block>

      <Block title="No professional advice">
        <p>
          The website does not provide legal, accounting, tax, compliance,
          financial, technical, or professional services of any kind. Results
          produced by the site should be reviewed by the user before being relied
          on for any important, legal, contractual, or business purpose.
        </p>
      </Block>

      <Block title="Document accuracy and limitations">
        <Bullets
          items={[
            "PDF files can vary widely in structure, encoding, compression, and metadata.",
            "Some documents may fail to process if they are damaged, password protected, malformed, or unusually large.",
            "The output should always be checked manually before printing, signing, publishing, or submitting it anywhere important.",
            "The tools do not guarantee a specific legal or technical result for every file.",
          ]}
        />
      </Block>

      <Block title="Privacy and data handling">
        <p>
          Most regular PDF tools are designed to run locally in the browser on the
          user's own device. AI features may send extracted text to an AI provider
          when you choose an AI action, and it remains the user's responsibility to
          confirm that no sensitive information is exposed through the browser,
          operating system, or third-party services used by the device.
        </p>
      </Block>

      <Block title="Google policy alignment">
        <p>
          The platform is intended to follow general Google-style standards for
          transparency, safety, and responsible digital service design. This
          includes clear disclosures, privacy-focused handling, no deceptive
          behavior, and a user-first approach to functionality and data usage.
        </p>
        <Bullets
          items={[
            "No hidden or misleading claims about the capabilities of the tools.",
            "No deceptive ad or data-use practices.",
            "A clear explanation of what the site does and does not do.",
            "A commitment to respecting user privacy and document control.",
          ]}
        />
      </Block>

      <Block title="Limitation of liability">
        <p>
          We are not liable for any direct, indirect, incidental, or consequential
          loss or damage arising from the use or inability to use the tools on this
          website, including loss of data, business interruption, or document
          corruption, except to the extent required by law.
        </p>
      </Block>
    </ArticlePage>
  );
}
