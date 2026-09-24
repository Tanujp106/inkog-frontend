import { NotFoundBreakout } from "@/components/not-found-breakout";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div className="not-found-shell">
        <h1 className="sr-only">Oops, page not found (404).</h1>
        <NotFoundBreakout />
      </div>
    </main>
  );
}
