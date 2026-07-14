import Link from "next/link";

import { NotFoundBreakout } from "@/components/not-found-breakout";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div className="not-found-shell">
        <header className="not-found-header" aria-label="inkog">
          <Link className="not-found-brand" href="/">
            inkog
            <span aria-hidden="true" />
          </Link>
        </header>

        <h1 className="sr-only">404 page not found</h1>
        <NotFoundBreakout />
      </div>
    </main>
  );
}
