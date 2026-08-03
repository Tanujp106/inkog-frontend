import { DirectionTwoShell } from "@/components/direction-two-shell";
import { getHomeJsonLd } from "@/lib/site-seo.mjs";

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(getHomeJsonLd()) }}
      />
      <DirectionTwoShell />
      <nav aria-label="Site navigation" className="sr-only">
        <a href="/about">About inkog</a>
      </nav>
    </>
  );
}
