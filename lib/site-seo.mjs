const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
export const siteUrl = new URL(configuredSiteUrl || "https://inkog-chat.vercel.app");

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
  const url = siteUrl?.toString();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "inkog",
        ...(url ? { url } : {}),
      },
      {
        "@type": "WebSite",
        name: "inkog",
        ...(url ? { url } : {}),
      },
    ],
  };
}

export function getAboutJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "inkog",
        applicationCategory: "CommunicationApplication",
        operatingSystem: "Web",
        ...(siteUrl ? { url: toSiteUrl("/") } : {}),
        description: "Private, anonymous chat for temporary conversations without profiles.",
      },
      {
        "@type": "FAQPage",
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
