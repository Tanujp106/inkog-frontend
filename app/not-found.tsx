import { NotFoundBreakout } from "@/components/not-found-breakout";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div className="not-found-shell">
        <h1 className="sr-only">404 page not found</h1>
        <NotFoundBreakout />
      </div>
    </main>
  );
}
