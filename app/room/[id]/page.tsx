"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

const API = "https://inkog-backend.onrender.com/api";
const SOCKET_URL = "https://inkog-backend.onrender.com";

interface Message {
  id: string;
  alias: string;
  content: string;
  createdAt: string;
  isSystem?: boolean;
}

interface PollVote {
  alias: string;
  optionIndex: number;
}

interface Poll {
  pollId: string;
  question: string;
  options: string[];
  votesByMember: PollVote[];
  createdAt: string;
}

type Stage = "loading" | "password" | "joined" | "expired" | "error";

function formatTime(seconds: number) {
  if (seconds <= 0) return "expired";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [stage, setStage] = useState<Stage>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  // Room info
  const [topic, setTopic] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [roomUsers, setRoomUsers] = useState<string[]>([]);

  // Session
  const [alias, setAlias] = useState("");
  const [isCreator, setIsCreator] = useState(false);
  const anonTokenRef = useRef<string>("");

  // Password gate
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Polls
  const [polls, setPolls] = useState<Poll[]>([]);
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  // Share toast
  const [copied, setCopied] = useState(false);
  const [socketError, setSocketError] = useState("");

  const socketRef = useRef<Socket | null>(null);

  // Countdown timer
  useEffect(() => {
    if (stage !== "joined" || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { setStage("expired"); clearInterval(interval); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, secondsLeft]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const connectSocket = (token: string, myAlias: string, onReady: () => void) => {
    // Disconnect any existing socket before creating a new one
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_room", { roomId, anonToken: token });
    });

    socket.on("join_room_success", ({ onlineCount, roomUsers }: { onlineCount: number; roomUsers: string[] }) => {
      setOnlineCount(onlineCount);
      setRoomUsers(roomUsers ?? []);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        alias: "system",
        content: `You joined as ${myAlias}`,
        createdAt: new Date().toISOString(),
        isSystem: true,
      }]);
      onReady();
    });

    socket.on("user_joined", ({ alias, onlineCount, roomUsers }: { alias: string; onlineCount: number; roomUsers: string[] }) => {
      setOnlineCount(onlineCount);
      setRoomUsers(roomUsers ?? []);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        alias: "system",
        content: `${alias} joined the room`,
        createdAt: new Date().toISOString(),
        isSystem: true,
      }]);
    });

    socket.on("user_left", ({ alias, onlineCount, roomUsers }: { alias: string; onlineCount: number; roomUsers: string[] }) => {
      setOnlineCount(onlineCount);
      setRoomUsers(roomUsers ?? []);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        alias: "system",
        content: `${alias} left the room`,
        createdAt: new Date().toISOString(),
        isSystem: true,
      }]);
    });

    socket.on("new_message", (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on("message_deleted", ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    socket.on("poll_created", (poll: Poll) => {
      setPolls(prev => [...prev, poll]);
    });

    socket.on("poll_updated", ({ pollId, votesByMember }: { pollId: string; votesByMember: PollVote[] }) => {
      setPolls(prev => prev.map(p => p.pollId === pollId ? { ...p, votesByMember } : p));
    });

    socket.on("poll_closed", ({ pollId, votesByMember }: { pollId: string; votesByMember: PollVote[] }) => {
      setPolls(prev => prev.map(p => p.pollId === pollId ? { ...p, votesByMember } : p));
    });

    socket.on("room_closed", () => {
      setStage("expired");
    });

    socket.on("error", ({ message }: { message: string }) => {
      console.error("Socket error:", message);
      setSocketError(message);
      setTimeout(() => setSocketError(""), 3000);
    });

    return socket;
  };

  const doJoin = async (password?: string) => {
    const storedToken = localStorage.getItem(`token_${roomId}`) || undefined;
    const body: Record<string, unknown> = {};
    if (storedToken) body.anonToken = storedToken;
    if (password) body.password = password;

    const res = await fetch(`${API}/rooms/${roomId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.message };
    return data;
  };

  // Fetch messages & polls after join
  const fetchHistory = async (token: string) => {
    const [msgRes, pollRes] = await Promise.all([
      fetch(`${API}/rooms/${roomId}/messages?anonToken=${encodeURIComponent(token)}`),
      fetch(`${API}/rooms/${roomId}/polls?anonToken=${encodeURIComponent(token)}`),
    ]);
    if (msgRes.ok) {
      const d = await msgRes.json();
      setMessages(d.messages || []);
    }
    if (pollRes.ok) {
      const d = await pollRes.json();
      setPolls(d.polls || []);
    }
  };

  // Initial load — runs once per roomId, cancelled flag prevents acting on stale async results
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const roomRes = await fetch(`${API}/rooms/${roomId}`);
        if (cancelled) return;
        if (!roomRes.ok) {
          if (roomRes.status === 404) { setErrorMsg("Room not found."); setStage("error"); return; }
          setErrorMsg("Failed to load room."); setStage("error"); return;
        }
        const roomData = await roomRes.json();
        if (cancelled) return;
        setTopic(roomData.topic);
        setSecondsLeft(roomData.secondsLeft);

        if (roomData.secondsLeft <= 0) { setStage("expired"); return; }

        if (roomData.hasPassword) {
          setNeedsPassword(true);
          setStage("password");
        } else {
          try {
            const joinData = await doJoin();
            if (cancelled) return;
            anonTokenRef.current = joinData.anonToken;
            localStorage.setItem(`token_${roomId}`, joinData.anonToken);
            setAlias(joinData.alias);
            setIsCreator(joinData.isCreator);
            await fetchHistory(joinData.anonToken);
            if (cancelled) return;
            connectSocket(joinData.anonToken, joinData.alias, () => setStage("joined"));
          } catch (err: unknown) {
            if (cancelled) return;
            const e = err as { status?: number; message?: string };
            if (e.status === 410) { setStage("expired"); return; }
            setErrorMsg(e.message || "Failed to join room."); setStage("error");
          }
        }
      } catch {
        if (cancelled) return;
        setErrorMsg("Could not reach server."); setStage("error");
      }
    };

    run();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  // roomId is the only real dependency; functions are defined in component scope
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handlePasswordSubmit = async () => {
    setPasswordError("");
    try {
      const joinData = await doJoin(passwordInput);
      anonTokenRef.current = joinData.anonToken;
      localStorage.setItem(`token_${roomId}`, joinData.anonToken);
      setAlias(joinData.alias);
      setIsCreator(joinData.isCreator);
      await fetchHistory(joinData.anonToken);
      connectSocket(joinData.anonToken, joinData.alias, () => setStage("joined"));
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 410) setStage("expired");
      else setPasswordError(e.message || "Failed to join.");
    }
  };

  const sendMessage = () => {
    if (!msgInput.trim() || !socketRef.current) return;
    socketRef.current.emit("send_message", { message : msgInput.trim() });
    setMsgInput("");
  };

  const deleteMessage = (messageId: string) => {
    socketRef.current?.emit("delete_message", { messageId });
  };

  const closeRoom = () => {
    socketRef.current?.emit("close_room", {});
  };

  const createPoll = () => {
    const validOptions = pollOptions.filter(o => o.trim());
    if (!pollQuestion.trim() || validOptions.length < 2) return;
    socketRef.current?.emit("create_poll", { question: pollQuestion.trim(), options: validOptions });
    setPollQuestion(""); setPollOptions(["", ""]); setShowPollForm(false);
  };

  const votePoll = (pollId: string, optionIndex: number) => {
    socketRef.current?.emit("vote_poll", { pollId, optionIndex });
  };

  const handleLeave = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    localStorage.removeItem(`token_${roomId}`);
    router.push("/");
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(`${window.location.href}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // My alias color for chat
  const isMe = (msgAlias: string) => msgAlias === alias;

  // Expired / error states
  if (stage === "expired") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>💨</div>
        <h1 style={{ fontSize: "32px", marginBottom: "12px" }}>Room Expired</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "32px", fontSize: "14px" }}>This room has self-destructed. All messages are gone forever.</p>
        <button className="btn-accent" onClick={() => router.push("/")} style={{ padding: "12px 28px", borderRadius: "6px" }}>← Back to Home</button>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>⚠</div>
        <h1 style={{ fontSize: "28px", marginBottom: "12px" }}>Something went wrong</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "32px", fontSize: "14px" }}>{errorMsg}</p>
        <button className="btn-accent" onClick={() => router.push("/")} style={{ padding: "12px 28px", borderRadius: "6px" }}>← Back to Home</button>
      </div>
    );
  }

  if (stage === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "20px", letterSpacing: "-0.04em", marginBottom: "16px" }}>inkog</div>
          <p style={{ color: "var(--text-dim)", fontSize: "12px", letterSpacing: "0.1em" }}>loading room<span className="blink">_</span></p>
        </div>
      </div>
    );
  }

  if (stage === "password") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: "400px", width: "100%" }}>
          <div style={{ marginBottom: "32px", textAlign: "center" }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "20px", marginBottom: "20px" }}>inkog</div>
            <p style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Private Room</p>
            <h2 style={{ fontSize: "20px", color: "var(--text)", margin: "0 0 6px" }}>{topic}</h2>
          </div>
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "28px" }}>
            <label>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Password</div>
              <input value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handlePasswordSubmit()}
                type="password" placeholder="Enter room password" style={{ width: "100%", padding: "11px 14px", borderRadius: "6px", marginBottom: "12px" }} autoFocus />
            </label>
            {passwordError && <div style={{ color: "var(--red)", fontSize: "13px", marginBottom: "12px" }}>{passwordError}</div>}
            <button className="btn-accent" onClick={handlePasswordSubmit} style={{ width: "100%", padding: "13px", borderRadius: "6px" }}>
              Enter Room →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Joined — main room UI
  const totalVotes = (poll: Poll) => poll.votesByMember.length;
  const votesFor = (poll: Poll, idx: number) => poll.votesByMember.filter(v => v.optionIndex === idx).length;
  const myVote = (poll: Poll) => poll.votesByMember.find(v => v.alias === alias)?.optionIndex ?? -1;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <header style={{ borderBottom: "1px solid var(--border)", padding: "12px 20px", display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "16px", letterSpacing: "-0.04em", marginRight: "4px" }}>inkog</span>
        <span style={{ color: "var(--border-light)", fontSize: "14px" }}>·</span>

        {/* Topic */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{topic}</p>
        </div>

        {/* Meta */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "5px" }} className="online-users-wrapper">
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: onlineCount > 0 ? "var(--accent)" : "var(--text-dim)", display: "inline-block" }} />
            <span style={{ fontSize: "12px", color: "var(--text-muted)", cursor: "default" }}>{onlineCount} online</span>
            {roomUsers.length > 0 && (
              <div className="online-users-tooltip" style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0, background: "var(--bg-2)",
                border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 0",
                minWidth: "160px", zIndex: 50, boxShadow: "0 4px 16px rgba(0,0,0,0.3)"
              }}>
                {roomUsers.map((u) => (
                  <div key={u} style={{ padding: "5px 14px", fontSize: "12px", color: u === alias ? "var(--accent)" : "var(--text-muted)", fontFamily: "DM Mono, monospace" }}>
                    {u}{u === alias ? " (you)" : ""}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ fontSize: "12px", color: secondsLeft < 300 ? "var(--red)" : "var(--text-muted)", fontFamily: "DM Mono, monospace" }}>
            ⏱ {formatTime(secondsLeft)}
          </div>
          <button className="btn-ghost" onClick={copyShareLink} style={{ padding: "5px 12px", borderRadius: "4px", fontSize: "11px", letterSpacing: "0.05em" }}>
            {copied ? "✓ Copied" : "Share"}
          </button>
          <button className="btn-ghost" onClick={handleLeave} style={{ padding: "5px 12px", borderRadius: "4px", fontSize: "11px", letterSpacing: "0.05em", color: "var(--red)" }}>
            Leave
          </button>
        </div>
      </header>

      {/* Socket error toast */}
      {socketError && (
        <div style={{ background: "var(--red)", color: "#fff", fontSize: "12px", padding: "8px 20px", textAlign: "center", letterSpacing: "0.03em" }}>
          ⚠ {socketError}
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Chat column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-dim)", fontSize: "13px" }}>
                <p style={{ fontSize: "28px", marginBottom: "12px" }}>👻</p>
                <p>No messages yet. Break the ice.</p>
                <p style={{ marginTop: "8px", fontSize: "12px" }}>You are <span style={{ color: "var(--accent)", fontWeight: 600 }}>{alias}</span>{isCreator ? " (creator)" : ""}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {messages.map((msg, i) => {
                  if (msg.isSystem) {
                    return (
                      <div key={msg.id} style={{ textAlign: "center", padding: "6px 0", margin: "4px 0" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "DM Mono, monospace", background: "var(--bg-3)", padding: "3px 12px", borderRadius: "20px" }}>
                          {msg.content}
                        </span>
                      </div>
                    );
                  }
                  const mine = isMe(msg.alias);
                  const prevAlias = i > 0 ? messages[i - 1].alias : null;
                  const showAlias = msg.alias !== prevAlias;
                  return (
                    <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", marginTop: showAlias ? "14px" : "2px" }}>
                      {showAlias && (
                        <span style={{ fontSize: "11px", color: mine ? "var(--accent)" : "var(--text-muted)", marginBottom: "4px", letterSpacing: "0.05em" }}>
                          {mine ? `${msg.alias} (you)` : msg.alias}
                        </span>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {/* {!mine && isCreator && (
                          <button className="btn-danger" onClick={() => deleteMessage(msg.id)} title="Delete">✕</button>
                        )} */}
                        <div style={{
                          background: mine ? "var(--accent)" : "var(--bg-3)",
                          color: mine ? "#0c0c0e" : "var(--text)",
                          padding: "8px 14px",
                          borderRadius: mine ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                          fontSize: "14px",
                          maxWidth: "420px",
                          wordBreak: "break-word",
                          lineHeight: 1.5,
                        }}>
                          {msg.content}
                        </div>
                        {/* {mine && isCreator && (
                          <button className="btn-danger" onClick={() => deleteMessage(msg.id)} title="Delete">✕</button>
                        )} */}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ borderTop: "1px solid var(--border)", padding: "14px 20px", display: "flex", gap: "10px", flexShrink: 0 }}>
            <input
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={`Message as ${alias}...`}
              style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", fontSize: "14px" }}
            />
            <button className="btn-accent" onClick={sendMessage} disabled={!msgInput.trim()} style={{ padding: "10px 20px", borderRadius: "8px", whiteSpace: "nowrap" }}>
              Send
            </button>
          </div>
        </div>

        {/* Right sidebar — Polls + Creator controls */}
        <div style={{ width: "300px", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Polls</span>
            {isCreator && (
              <button className="btn-ghost" onClick={() => setShowPollForm(f => !f)} style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "11px" }}>
                {showPollForm ? "Cancel" : "+ Poll"}
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
            {/* Poll creation form */}
            {showPollForm && isCreator && (
              <div className="animate-fadeIn" style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>New Poll</p>
                <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                  placeholder="Question..." style={{ width: "100%", padding: "8px 10px", borderRadius: "5px", marginBottom: "8px", fontSize: "13px" }} />
                {pollOptions.map((opt, i) => (
                  <input key={i} value={opt} onChange={e => { const o = [...pollOptions]; o[i] = e.target.value; setPollOptions(o); }}
                    placeholder={`Option ${i + 1}`} style={{ width: "100%", padding: "8px 10px", borderRadius: "5px", marginBottom: "6px", fontSize: "13px" }} />
                ))}
                {pollOptions.length < 4 && (
                  <button className="btn-ghost" onClick={() => setPollOptions([...pollOptions, ""])} style={{ padding: "5px 10px", borderRadius: "4px", fontSize: "11px", marginBottom: "8px" }}>
                    + Add option
                  </button>
                )}
                <button className="btn-accent" onClick={createPoll} style={{ width: "100%", padding: "9px", borderRadius: "5px", marginTop: "4px" }}>
                  Create Poll
                </button>
              </div>
            )}

            {/* Poll list */}
            {polls.length === 0 && !showPollForm && (
              <div style={{ textAlign: "center", padding: "32px 12px", color: "var(--text-dim)", fontSize: "12px" }}>
                No polls yet
              </div>
            )}

            {polls.map(poll => {
              const total = totalVotes(poll);
              const myVoteIdx = myVote(poll);
              return (
                <div key={poll.pollId} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: "8px", padding: "14px", marginBottom: "12px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, marginBottom: "12px", lineHeight: 1.4, color: "var(--text)" }}>{poll.question}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {poll.options.map((opt, idx) => {
                      const count = votesFor(poll, idx);
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      const isMyVote = myVoteIdx === idx;
                      return (
                        <button key={idx} onClick={() => votePoll(poll.pollId, idx)}
                          style={{
                            background: "transparent",
                            border: `1px solid ${isMyVote ? "var(--accent)" : "var(--border)"}`,
                            borderRadius: "5px",
                            padding: "8px 10px",
                            cursor: "pointer",
                            textAlign: "left",
                            position: "relative",
                            overflow: "hidden",
                            transition: "border-color 0.15s",
                          }}>
                          {/* Progress bar */}
                          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: isMyVote ? "rgba(200,255,87,0.12)" : "rgba(255,255,255,0.04)", transition: "width 0.3s ease" }} />
                          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", color: isMyVote ? "var(--accent)" : "var(--text)", fontFamily: "DM Mono, monospace" }}>{opt}</span>
                            <span style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0, marginLeft: "8px" }}>{count} · {pct}%</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "8px", marginBottom: 0 }}>{total} vote{total !== 1 ? "s" : ""}</p>
                </div>
              );
            })}
          </div>

          {/* Creator controls */}
          {isCreator && (
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Creator</p>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--accent)", fontFamily: "DM Mono, monospace" }}>{alias}</span>
                <button
                  className="btn-danger"
                  onClick={() => { if (confirm("Close room for everyone? This cannot be undone.")) closeRoom(); }}
                  style={{ marginLeft: "auto", padding: "5px 12px", fontSize: "11px" }}
                >
                  Close Room
                </button>
              </div>
            </div>
          )}

          {/* Alias display for non-creator */}
          {!isCreator && (
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Your alias</p>
              <span style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "DM Mono, monospace" }}>{alias}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}