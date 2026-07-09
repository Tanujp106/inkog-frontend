import Link from "next/link";

function BrokenSocketIllustration() {
  return (
    <div className="not-found-pixel-socket" aria-label="Pixelated broken socket and wire illustration" role="img" tabIndex={0}>
      <div className="not-found-wire not-found-wire-left">
        <span className="not-found-wire-bit not-found-wire-bit-a" />
        <span className="not-found-wire-bit not-found-wire-bit-b" />
      </div>
      <div className="not-found-wire not-found-wire-right">
        <span className="not-found-wire-bit not-found-wire-bit-c" />
        <span className="not-found-wire-bit not-found-wire-bit-d" />
      </div>
      <span className="not-found-spark not-found-spark-one" />
      <span className="not-found-spark not-found-spark-two" />
      <span className="not-found-spark not-found-spark-three" />
      <div className="not-found-socket-face">
        <span className="not-found-socket-hole not-found-socket-hole-left" />
        <span className="not-found-socket-hole not-found-socket-hole-right" />
        <span className="not-found-socket-mouth" />
      </div>
    </div>
  );
}

export default function NotFound() {
  return (
    <main className="not-found-page">
      <header className="not-found-header" aria-label="inkog">
        <Link className="not-found-brand" href="/">
          inkog
          <span aria-hidden="true" />
        </Link>
      </header>

      <section className="not-found-content" aria-labelledby="not-found-title">
        <BrokenSocketIllustration />

        <div className="not-found-copy">
          <p className="not-found-kicker">error 404 / cable gossip</p>
          <h1 id="not-found-title">This socket has left the chat.</h1>
          <p>
            The wire snapped, the room wandered off, and the server is pretending it never knew this page.
          </p>
          <Link className="btn-accent not-found-home-link" href="/">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
