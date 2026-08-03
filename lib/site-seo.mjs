const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const SITE_NAME = "inkog";
export const SITE_TITLE = "Inkog | Private & Anonymous Temporary Chat";
export const SITE_DESCRIPTION =
  "Create a private, time-bound room for anonymous group chat, quick polls, and honest conversations. No sign in required.";
export const ABOUT_TITLE = "About Inkog";
export const ABOUT_DESCRIPTION = SITE_DESCRIPTION;
export const SITE_IMAGE_PATH = "/og-image.png";

export const siteUrl = new URL(configuredSiteUrl || "https://inkog.chat");

export const indexablePathnames = Object.freeze(["/", "/about"]);

export const aboutFaqs = Object.freeze([
  {
    question: "Does inkog require an account?",
    answer: "No. inkog is built for anonymous participation without profiles.",
  },
  {
    question: "Are rooms permanent?",
    answer: "No. Rooms are time-bound and focused on the current conversation.",
  },
  {
    question: "Can a room use a password?",
    answer: "Yes. Room creators can choose an optional password.",
  },
  {
    question: "Can groups make polls?",
    answer: "Yes. Active rooms can create polls with a question and at least two options.",
  },
]);

export function toSiteUrl(pathname) {
  return siteUrl ? new URL(pathname, siteUrl).toString() : pathname;
}

export function getSiteEntityJsonLd() {
  const url = siteUrl.toString();
  const organizationId = `${url}#organization`;
  const websiteId = `${url}#website`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: SITE_NAME,
        url,
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: SITE_NAME,
        url,
        description: SITE_DESCRIPTION,
        publisher: { "@id": organizationId },
        inLanguage: "en-US",
      },
    ],
  };
}

export function getHomeJsonLd() {
  const url = siteUrl.toString();

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: SITE_TITLE,
    description: SITE_DESCRIPTION,
    isPartOf: { "@id": `${url}#website` },
    about: { "@id": `${url}#organization` },
    inLanguage: "en-US",
  };
}

export function getAboutJsonLd() {
  const aboutUrl = toSiteUrl("/about");
  const siteRootUrl = siteUrl.toString();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${aboutUrl}#webpage`,
        url: aboutUrl,
        name: ABOUT_TITLE,
        description: ABOUT_DESCRIPTION,
        isPartOf: { "@id": `${siteRootUrl}#website` },
        about: { "@id": `${siteRootUrl}#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteRootUrl}#software`,
        name: SITE_NAME,
        applicationCategory: "CommunicationApplication",
        operatingSystem: "Web",
        url: siteRootUrl,
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "FAQPage",
        "@id": `${aboutUrl}#faq`,
        url: aboutUrl,
        mainEntity: aboutFaqs.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer,
          },
        })),
      },
    ],
  };
}
