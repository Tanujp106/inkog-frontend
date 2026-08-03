import type { Metadata } from "next";
import {
  ABOUT_DESCRIPTION,
  ABOUT_TITLE,
  aboutFaqs,
  getAboutJsonLd,
  SITE_IMAGE_PATH,
} from "@/lib/site-seo.mjs";

const title = ABOUT_TITLE;
const description = ABOUT_DESCRIPTION;

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title,
    description,
    url: "/about",
    siteName: "inkog",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: SITE_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "inkog pixel wordmark with the tagline Honest chats. quick votes. no identity trails.",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [SITE_IMAGE_PATH],
  },
};

export default function AboutPage() {
  return (
    <main>
      <article>
        <h1>Private, anonymous chat for temporary conversations</h1>
        <p>
          inkog lets a group create a time-bound room, share a link, and talk under anonymous aliases instead of profiles.
        </p>

        <h2>How inkog works</h2>
        <ol>
          <li>Create a room and choose its duration, participant limit, and optional password.</li>
          <li>Share the room link with the people who should join.</li>
          <li>Chat or run a poll while the room is active.</li>
        </ol>

        <h2>Questions about inkog</h2>
        {aboutFaqs.map(({ question, answer }) => (
          <section key={question}>
            <h3>{question}</h3>
            <p>{answer}</p>
          </section>
        ))}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(getAboutJsonLd()) }}
        />
      </article>
    </main>
  );
}
