"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { askInkogHelp } from "@/lib/inkog-help-api";
import { extractInkogHelpQuestion } from "@/lib/inkog-help.mjs";
import { setStoredRoomPassword } from "@/lib/room-password-command.mjs";
import { useSystemSound } from "@/lib/system-sound-provider";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001/api";

function setStoredToken(roomId: string, token: string) {
  if (typeof window === "undefined" || typeof window.localStorage?.setItem !== "function") return;
  window.localStorage.setItem(`token_${roomId}`, token);
}

export default function Home() {
  const router = useRouter();
  const sound = useSystemSound();
  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");

  const [topic, setTopic] = useState("");
  const [expiry, setExpiry] = useState(60);
  const [password, setPassword] = useState("");
  const [roomLimit, setRoomLimit] = useState(10);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [joinId, setJoinId] = useState("");
  const [joinError, setJoinError] = useState("");
  const [helpQuestion, setHelpQuestion] = useState("");
  const [helpAnswer, setHelpAnswer] = useState("");
  const [helpLoading, setHelpLoading] = useState(false);

  const handleCreate = async () => {
    if (!topic.trim()) {
      sound.play("error");
      setCreateError("Topic is required.");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const body: Record<string, unknown> = { topic: topic.trim(), expiry, roomLimit };
      if (password.trim()) body.password = password.trim();
      const res = await fetch(`${API}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        sound.play("error");
        setCreateError(data.message || "Failed to create room.");
        return;
      }
      setStoredToken(data.id, data.creatorToken);
      setStoredRoomPassword(data.id, password);
      sound.play("success");
      router.push(`/room/${data.id}`);
    } catch {
      sound.play("error");
      setCreateError("Could not reach server. Is the backend running?");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = () => {
    const trimmed = joinId.trim();
    if (!trimmed) {
      sound.play("error");
      setJoinError("Enter a room ID or link.");
      return;
    }
    const match = trimmed.match(/([a-z0-9]{6})$/i);
    const id = match ? match[1] : trimmed;
    sound.play("success");
    router.push(`/room/${id}`);
  };

  const handleHelp = async () => {
    const question = extractInkogHelpQuestion(helpQuestion) ?? helpQuestion.trim();
    if (!question) {
      sound.play("error");
      setHelpAnswer("Ask me something about inkog.");
      return;
    }

    setHelpLoading(true);
    setHelpAnswer("");
    try {
      const result = await askInkogHelp(API, question);
      sound.play("notify");
      setHelpAnswer(result.answer);
    } catch {
      sound.play("error");
      setHelpAnswer("I could not reach the inkog help brain right now.");
    } finally {
      setHelpLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "28px 40px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "20px", letterSpacing: "-0.04em" }}>inkog</span>
          <span aria-hidden="true" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px" }}>
        <div style={{ maxWidth: "540px", width: "100%" }}>
          <div className="animate-fadeUp" style={{ textAlign: "center", marginBottom: "48px" }}>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "20px" }}>
              anonymous group chat
            </p>
            <h1 style={{ fontSize: "clamp(44px, 8vw, 76px)", lineHeight: 0.95, marginBottom: "22px", letterSpacing: "-0.04em" }}>
              Say what you{" "}
              <span className="serif" style={{ fontStyle: "italic", color: "var(--accent)" }}>actually</span>
              {" "}think
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.8, fontFamily: "DM Mono, monospace" }}>
              Create a room, share the link, everyone gets an anonymous alias.<br />
              No accounts. No traces. The room self-destructs.
            </p>
          </div>

          {mode === "idle" && (
            <div className="animate-fadeUp" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                <button className="btn-accent" onClick={() => { sound.play("press"); setMode("create"); }} onMouseEnter={() => sound.play("hover")} style={{ padding: "14px 32px", borderRadius: "6px" }}>
                  Create a Room
                </button>
                <button className="btn-ghost" onClick={() => { sound.play("press"); setMode("join"); }} onMouseEnter={() => sound.play("hover")} style={{ padding: "14px 32px", borderRadius: "6px" }}>
                  Join via Link →
                </button>
                <button className="btn-ghost" onClick={() => { sound.play("press"); router.push("/playground"); }} onMouseEnter={() => sound.play("hover")} style={{ padding: "14px 32px", borderRadius: "6px" }}>
                  Playground
                </button>
              </div>
              <div aria-busy={helpLoading} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <label htmlFor="landing-help" style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  ask inkog
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    id="landing-help"
                    value={helpQuestion}
                    onChange={event => setHelpQuestion(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === "Enter") {
                        void handleHelp();
                      }
                    }}
                    placeholder="/help who made inkog?"
                    style={{ flex: 1, minWidth: 0, padding: "11px 14px", borderRadius: "6px" }}
                  />
                  <button className="btn-ghost" onClick={() => { sound.play("press"); void handleHelp(); }} onMouseEnter={() => sound.play("hover")} disabled={helpLoading} style={{ padding: "0 14px", borderRadius: "6px", whiteSpace: "nowrap" }}>
                    {helpLoading ? "..." : "ask"}
                  </button>
                </div>
                {helpAnswer && (
                  <p role="status" aria-live="polite" style={{ color: "var(--text-muted)", fontFamily: "DM Mono, monospace", fontSize: "13px", lineHeight: 1.7, margin: 0 }}>
                    {helpAnswer}
                  </p>
                )}
              </div>
            </div>
          )}

          {mode === "create" && (
            <div className="animate-fadeUp" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
                <h2 style={{ fontSize: "17px", margin: 0 }}>New Room</h2>
                <button aria-label="Close new room form" className="btn-ghost" onClick={() => { sound.play("close"); setMode("idle"); setCreateError(""); }} onMouseEnter={() => sound.play("hover")} style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "12px" }} type="button">✕</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <label>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Topic *</div>
                  <input
                    value={topic}
                    onChange={event => setTopic(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === "Enter") {
                        void handleCreate();
                      }
                    }}
                    placeholder="Should we go to Goa this December?"
                    style={{ width: "100%", padding: "11px 14px", borderRadius: "6px" }}
                  />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <label>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Expires in (minutes)</div>
                    <input
                      type="number"
                      value={expiry === 0 ? "" : expiry}
                      onChange={event => setExpiry(event.target.value === "" ? 0 : Number(event.target.value))}
                      onBlur={event => { if (Number(event.target.value) < 15) setExpiry(15); }}
                      min={15}
                      placeholder="e.g. 60"
                      style={{ width: "100%", padding: "11px 14px", borderRadius: "6px" }}
                    />
                  </label>
                  <label>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Max members</div>
                    <input
                      type="number"
                      value={roomLimit}
                      onChange={event => setRoomLimit(Math.min(30, Math.max(1, Number(event.target.value))))}
                      min={1}
                      max={30}
                      style={{ width: "100%", padding: "11px 14px", borderRadius: "6px" }}
                    />
                  </label>
                </div>
                <label>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
                    Password <span style={{ color: "var(--text-dim)" }}>(optional)</span>
                  </div>
                  <input
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    type="password"
                    placeholder="Leave blank for open room"
                    style={{ width: "100%", padding: "11px 14px", borderRadius: "6px" }}
                  />
                </label>
                {createError && (
                  <div style={{ background: "rgba(255,87,87,0.08)", border: "1px solid rgba(255,87,87,0.2)", borderRadius: "6px", padding: "10px 14px", color: "var(--red)", fontSize: "13px" }}>
                    {createError}
                  </div>
                )}
                <button className="btn-accent" onClick={() => { sound.play("press"); void handleCreate(); }} onMouseEnter={() => sound.play("hover")} disabled={creating} style={{ padding: "14px", borderRadius: "6px", marginTop: "4px" }}>
                  {creating ? "Creating..." : "Create Room →"}
                </button>
              </div>
            </div>
          )}

          {mode === "join" && (
            <div className="animate-fadeUp" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
                <h2 style={{ fontSize: "17px", margin: 0 }}>Join a Room</h2>
                <button aria-label="Close join room form" className="btn-ghost" onClick={() => { sound.play("close"); setMode("idle"); setJoinError(""); }} onMouseEnter={() => sound.play("hover")} style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "12px" }} type="button">✕</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <label>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Room ID or Link</div>
                  <input
                    value={joinId}
                    onChange={event => setJoinId(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === "Enter") {
                        handleJoin();
                      }
                    }}
                    placeholder="abc123  or  https://inkog-backend.onrender.com/rooms/abc123"
                    style={{ width: "100%", padding: "11px 14px", borderRadius: "6px" }}
                  />
                </label>
                {joinError && <div style={{ color: "var(--red)", fontSize: "13px" }}>{joinError}</div>}
                <button className="btn-accent" onClick={() => { sound.play("press"); handleJoin(); }} onMouseEnter={() => sound.play("hover")} style={{ padding: "14px", borderRadius: "6px" }}>
                  Go to Room →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer style={{ padding: "18px 40px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "center" }}>
        <p style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.08em", margin: 0 }}>
          rooms expire and vanish forever — no logs, no accounts
        </p>
      </footer>
    </div>
  );
}
