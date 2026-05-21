"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API = "https://inkog-backend.onrender.com/api";

const EXPIRY_OPTIONS = [
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
  { label: "12 hours", value: 720 },
  { label: "24 hours", value: 1440 },
  { label: "48 hours", value: 2880 },
];

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");

  const [topic, setTopic] = useState("");
  const [expiry, setExpiry] = useState(60);
  const [password, setPassword] = useState("");
  const [roomLimit, setRoomLimit] = useState(10);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [joinId, setJoinId] = useState("");
  const [joinError, setJoinError] = useState("");

  const handleCreate = async () => {
    if (!topic.trim()) { setCreateError("Topic is required."); return; }
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
      if (!res.ok) { setCreateError(data.message || "Failed to create room."); return; }
      localStorage.setItem(`token_${data.id}`, data.creatorToken);
      router.push(`/room/${data.id}`);
    } catch {
      setCreateError("Could not reach server. Is the backend running?");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = () => {
    const trimmed = joinId.trim();
    if (!trimmed) { setJoinError("Enter a room ID or link."); return; }
    const match = trimmed.match(/([a-z0-9]{6})$/i);
    const id = match ? match[1] : trimmed;
    router.push(`/room/${id}`);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "28px 40px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "20px", letterSpacing: "-0.04em" }}>inkog</span>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
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
            <div className="animate-fadeUp" style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-accent" onClick={() => setMode("create")} style={{ padding: "14px 32px", borderRadius: "6px" }}>
                Create a Room
              </button>
              <button className="btn-ghost" onClick={() => setMode("join")} style={{ padding: "14px 32px", borderRadius: "6px" }}>
                Join via Link →
              </button>
            </div>
          )}

          {mode === "create" && (
            <div className="animate-fadeUp" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
                <h2 style={{ fontSize: "17px", margin: 0 }}>New Room</h2>
                <button className="btn-ghost" onClick={() => { setMode("idle"); setCreateError(""); }} style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "12px" }}>✕</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <label>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Topic *</div>
                  <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreate()}
                    placeholder="Should we go to Goa this December?" style={{ width: "100%", padding: "11px 14px", borderRadius: "6px" }} />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <label>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Expires in</div>
                    <select value={expiry} onChange={e => setExpiry(Number(e.target.value))}
                    style={{ width: "100%", padding: "11px 14px", borderRadius: "6px", background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "DM Mono, monospace", fontSize: "13px", cursor: "pointer", outline: "none", appearance: "auto" }}>
                    {EXPIRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                  <label>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Max members</div>
                    <input type="number" value={roomLimit} onChange={e => setRoomLimit(Math.min(30, Math.max(1, Number(e.target.value))))}
                      min={1} max={30} style={{ width: "100%", padding: "11px 14px", borderRadius: "6px" }} />
                  </label>
                </div>
                <label>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
                    Password <span style={{ color: "var(--text-dim)" }}>(optional)</span>
                  </div>
                  <input value={password} onChange={e => setPassword(e.target.value)} type="password"
                    placeholder="Leave blank for open room" style={{ width: "100%", padding: "11px 14px", borderRadius: "6px" }} />
                </label>
                {createError && (
                  <div style={{ background: "rgba(255,87,87,0.08)", border: "1px solid rgba(255,87,87,0.2)", borderRadius: "6px", padding: "10px 14px", color: "var(--red)", fontSize: "13px" }}>
                    {createError}
                  </div>
                )}
                <button className="btn-accent" onClick={handleCreate} disabled={creating} style={{ padding: "14px", borderRadius: "6px", marginTop: "4px" }}>
                  {creating ? "Creating..." : "Create Room →"}
                </button>
              </div>
            </div>
          )}

          {mode === "join" && (
            <div className="animate-fadeUp" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
                <h2 style={{ fontSize: "17px", margin: 0 }}>Join a Room</h2>
                <button className="btn-ghost" onClick={() => { setMode("idle"); setJoinError(""); }} style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "12px" }}>✕</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <label>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Room ID or Link</div>
                  <input value={joinId} onChange={e => setJoinId(e.target.value)} onKeyDown={e => e.key === "Enter" && handleJoin()}
                    placeholder="abc123  or  https://inkog-backend.onrender.com/rooms/abc123" style={{ width: "100%", padding: "11px 14px", borderRadius: "6px" }} />
                </label>
                {joinError && <div style={{ color: "var(--red)", fontSize: "13px" }}>{joinError}</div>}
                <button className="btn-accent" onClick={handleJoin} style={{ padding: "14px", borderRadius: "6px" }}>
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
