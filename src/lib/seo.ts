import { CONTACT_EMAIL, SITE_CARD, SITE_NAME, SITE_URL } from "./site";

interface HeadInput {
  title: string;
  description: string;
  /** Absolute path, e.g. "/compress-pdf". */
  path: string;
  image?: string;
}

/**
 * Builds the meta + canonical link pair every route's `head()` returns, so
 * title, description, canonical and the share card never drift apart.
 */
export function pageHead({ title, description, path, image }: HeadInput) {
  const url = `${SITE_URL}${path === "/" ? "" : path}`;
  const card = image ?? SITE_CARD;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: card },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: card },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Organization structured data, emitted once in the root document.
 *
 * The site previously declared only a bare `WebSite` node with a name and a
 * URL, which tells a search engine almost nothing about who publishes it. An
 * `Organization` node is what backs the logo and the brand knowledge panel,
 * and `sameAs` is what ties this site to the accounts a visitor can verify it
 * from — without it the site's identity rests entirely on self-asserted text.
 *
 * `logo` is declared as `ImageObject` rather than a bare URL because Google's
 * rich-result validator accepts both, but only the object form reliably
 * produces the logo in search results.
 */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/favicon-32.png`,
      width: 32,
      height: 32,
    },
    description:
      "Free browser-based PDF tools and a suite of AI document tools. Most regular PDF tools process files entirely on the visitor's device.",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: CONTACT_EMAIL,
      url: `${SITE_URL}/contact`,
    },
  };
}

/** FAQPage structured data for a tool or landing page. */
export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function softwareJsonLd(input: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: input.name,
    url: `${SITE_URL}${input.path}`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires a modern web browser with JavaScript.",
    description: input.description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

/**
 * HowTo structured data, matching the visible numbered walkthrough.
 *
 * Google retired the HowTo rich result from desktop/mobile displays, but the
 * markup still carries the page structure and costs nothing. Kept accurate to
 * what is on screen: the steps here are the same array the <ol> renders.
 */
export function howToJsonLd(input: {
  name: string;
  description: string;
  path: string;
  steps: { title: string; body: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: input.name,
    description: input.description,
    step: input.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.body,
    })),
  };
}

/** BreadcrumbList structured data, matching the visible breadcrumb trail. */
export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
