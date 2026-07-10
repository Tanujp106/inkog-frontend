export const siteUrl = new URL("https://inkog.chat");

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
  return new URL(pathname, siteUrl).toString();
}

export function getSiteEntityJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "inkog",
        url: siteUrl.toString(),
      },
      {
        "@type": "WebSite",
        name: "inkog",
        url: siteUrl.toString(),
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
        url: toSiteUrl("/"),
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
