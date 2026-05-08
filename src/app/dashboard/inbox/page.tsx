"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Mail, MessageCircle, PenSquare, X, Search } from "lucide-react";
import { EmptyState } from "@/components/dashboard/section";
import { Button } from "@/components/ui/button";

interface AgentDirectoryRow {
  user_id: string;
  display_name: string;
}

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  recipient_id: string;
  sender_name?: string;
  recipient_name?: string;
  task_id: string | null;
  task_title?: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

function getInitials(name: string | undefined, id: string): string {
  if (name && name.length > 0) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return id.slice(0, 2).toUpperCase();
}

function formatMessageDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function InboxPage() {
  const { data: session } = useSession();
  const [threads, setThreads] = useState<Message[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [composing, setComposing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userId = session?.user?.supabaseId;

  function refetchThreads() {
    return fetch("/api/messages")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setThreads(data);
      })
      .catch(() => {});
  }

  // Fetch thread list
  useEffect(() => {
    refetchThreads().finally(() => setLoading(false));
  }, []);

  // Fetch messages for selected thread
  useEffect(() => {
    if (!selectedThread) return;
    setMessagesLoading(true);

    fetch(`/api/messages/${selectedThread}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(() => {})
      .finally(() => setMessagesLoading(false));
  }, [selectedThread]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendReply() {
    if (!newMessage.trim() || !selectedThread || !messages.length) return;
    setSending(true);

    const lastMsg = messages[messages.length - 1];
    const recipientId =
      lastMsg.sender_id === userId ? lastMsg.recipient_id : lastMsg.sender_id;

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId,
          taskId: lastMsg.task_id,
          body: newMessage,
        }),
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setNewMessage("");
      }
    } catch {
      // Error handled silently
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div>
        <InboxHero unreadCount={0} onCompose={() => setComposing(true)} />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: "72px",
                background: "var(--bg-subtle)",
                borderRadius: "var(--radius)",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  const unreadCount = threads.filter(
    (t) => t.recipient_id === userId && !t.read_at
  ).length;

  // Resolve the other party's display info for a thread
  function getThreadParty(thread: Message) {
    const isFromMe = thread.sender_id === userId;
    const name = isFromMe ? thread.recipient_name : thread.sender_name;
    const id = isFromMe ? thread.recipient_id : thread.sender_id;
    return { name, id };
  }

  // Resolve the current conversation partner name
  const selectedThreadData = threads.find(
    (t) => t.thread_id === selectedThread
  );
  const conversationPartner = selectedThreadData
    ? getThreadParty(selectedThreadData)
    : null;

  async function sendCompose(recipientId: string, body: string) {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId, body }),
    });
    if (!res.ok) {
      throw new Error("Failed to send");
    }
    const msg = (await res.json()) as Message;
    await refetchThreads();
    setComposing(false);
    setSelectedThread(msg.thread_id);
  }

  return (
    <div>
      <InboxHero
        unreadCount={unreadCount}
        onCompose={() => setComposing(true)}
      />

      {composing && (
        <ComposePanel
          onClose={() => setComposing(false)}
          onSend={sendCompose}
          currentUserId={userId}
        />
      )}

      {threads.length === 0 ? (
        <EmptyState
          icon={<Mail size={32} strokeWidth={1} style={{ color: "var(--text-faint)" }} />}
          title="No messages yet"
          body="Messages from task participants land here. Start a thread from any task you're competing on or have posted."
        />
      ) : (
        <div
          className="flex"
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            height: "calc(100vh - 220px)",
            minHeight: "400px",
            overflow: "hidden",
          }}
        >
          {/* Thread list */}
          <div
            style={{
              width: "300px",
              borderRight: "1px solid var(--border)",
              overflowY: "auto",
              flexShrink: 0,
            }}
          >
            {threads.map((thread) => {
              const party = getThreadParty(thread);
              const isSelected = selectedThread === thread.thread_id;
              const isUnread =
                thread.recipient_id === userId && !thread.read_at;

              return (
                <button
                  key={thread.thread_id}
                  onClick={() => setSelectedThread(thread.thread_id)}
                  className="w-full text-left font-sans"
                  style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid var(--border)",
                    background: isSelected
                      ? "var(--accent-subtle, var(--bg-subtle))"
                      : "transparent",
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseOver={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.background = "var(--bg-subtle)";
                  }}
                  onMouseOut={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className="flex items-center justify-center font-sans"
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "var(--accent, var(--text))",
                        color: "white",
                        fontSize: "12px",
                        fontWeight: 600,
                        flexShrink: 0,
                        marginTop: "1px",
                      }}
                    >
                      {getInitials(party.name, party.id)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: isUnread ? 600 : 400,
                            color: "var(--text)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {party.name || `User ${party.id.slice(0, 6)}`}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          {isUnread && (
                            <div
                              style={{
                                width: "7px",
                                height: "7px",
                                borderRadius: "50%",
                                background:
                                  "var(--accent, var(--text))",
                              }}
                            />
                          )}
                          <span
                            className="font-mono"
                            style={{
                              fontSize: "11px",
                              color: "var(--text-faint)",
                            }}
                          >
                            {formatMessageDate(thread.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Task context */}
                      {thread.task_title && (
                        <p
                          style={{
                            fontSize: "11px",
                            color: "var(--accent-muted, var(--text-faint))",
                            fontWeight: 500,
                            letterSpacing: "0.02em",
                            marginTop: "1px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Re: {thread.task_title}
                        </p>
                      )}

                      <p
                        style={{
                          fontSize: "13px",
                          color: "var(--text-muted)",
                          marginTop: "2px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {thread.body}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Message area */}
          <div className="flex flex-1 flex-col" style={{ minWidth: 0 }}>
            {!selectedThread ? (
              <div className="flex flex-1 flex-col items-center justify-center" style={{ gap: "12px" }}>
                <MessageCircle
                  size={28}
                  strokeWidth={1.25}
                  style={{ color: "var(--text-faint)" }}
                  aria-hidden="true"
                />
                <p
                  className="font-sans"
                  style={{
                    fontSize: "14px",
                    color: "var(--text-faint)",
                    margin: 0,
                  }}
                >
                  Select a conversation to start messaging
                </p>
              </div>
            ) : (
              <>
                {/* Conversation header */}
                {conversationPartner && (
                  <div
                    className="flex items-center gap-3"
                    style={{
                      padding: "14px 20px",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div
                      className="flex items-center justify-center font-sans"
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "var(--accent, var(--text))",
                        color: "white",
                        fontSize: "11px",
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(
                        conversationPartner.name,
                        conversationPartner.id
                      )}
                    </div>
                    <div>
                      <p
                        className="font-sans"
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "var(--text)",
                        }}
                      >
                        {conversationPartner.name ||
                          `User ${conversationPartner.id.slice(0, 6)}`}
                      </p>
                      {selectedThreadData?.task_title && (
                        <p
                          className="font-sans"
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                          }}
                        >
                          Re: {selectedThreadData.task_title}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div
                  className="flex-1 overflow-y-auto"
                  style={{ padding: "20px" }}
                >
                  {messagesLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            justifyContent:
                              i % 2 === 0 ? "flex-end" : "flex-start",
                          }}
                        >
                          <div
                            className="animate-pulse"
                            style={{
                              width: `${40 + i * 10}%`,
                              height: "48px",
                              background: "var(--bg-subtle)",
                              borderRadius: "var(--radius)",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.sender_id === userId;
                      return (
                        <div
                          key={msg.id}
                          style={{
                            marginBottom: "8px",
                            display: "flex",
                            justifyContent: isMine
                              ? "flex-end"
                              : "flex-start",
                          }}
                        >
                          <div
                            style={{
                              maxWidth: "70%",
                              padding: "10px 14px",
                              borderRadius: "var(--radius)",
                              background: isMine
                                ? "var(--accent, var(--text))"
                                : "var(--bg-subtle)",
                              color: isMine
                                ? "white"
                                : "var(--text)",
                            }}
                          >
                            <p
                              className="font-sans"
                              style={{
                                fontSize: "14px",
                                lineHeight: 1.5,
                              }}
                            >
                              {msg.body}
                            </p>
                            <p
                              className="font-mono"
                              style={{
                                fontSize: "11px",
                                marginTop: "4px",
                                opacity: 0.6,
                              }}
                            >
                              {new Date(msg.created_at).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply input */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    gap: "8px",
                  }}
                >
                  <label htmlFor="reply-input" className="sr-only">Reply message</label>
                  <input
                    id="reply-input"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                    placeholder="Type a message..."
                    className="font-sans flex-1"
                    style={{
                      border: "1px solid var(--border)",
                      padding: "10px 14px",
                      borderRadius: "var(--radius)",
                      fontSize: "14px",
                      color: "var(--text)",
                      background: "var(--bg)",
                      outline: "none",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--accent, var(--text))";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                    }}
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !newMessage.trim()}
                    className="font-sans transition-colors disabled:opacity-40"
                    style={{
                      padding: "10px 20px",
                      borderRadius: "var(--radius)",
                      fontSize: "14px",
                      fontWeight: 500,
                      background: "var(--accent, var(--text))",
                      color: "white",
                    }}
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InboxHero({
  unreadCount,
  onCompose,
}: {
  unreadCount: number;
  onCompose: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: "24px",
        paddingBottom: "20px",
        borderBottom: "1px solid var(--border)",
        marginBottom: "20px",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1
          className="font-sans"
          style={{
            fontSize: "26px",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          Inbox
        </h1>
        <p
          className="mt-2 font-sans"
          style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
        >
          Conversations with task participants — companies and agents.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        {unreadCount > 0 && (
          <span
            className="font-sans"
            style={{
              fontSize: "12px",
              color: "var(--text)",
              background: "var(--bg-strong)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "4px 10px",
              whiteSpace: "nowrap",
            }}
          >
            {unreadCount} unread
          </span>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={onCompose}
          leadingIcon={<PenSquare size={13} strokeWidth={2} />}
        >
          Compose
        </Button>
      </div>
    </div>
  );
}

function ComposePanel({
  onClose,
  onSend,
  currentUserId,
}: {
  onClose: () => void;
  onSend: (recipientId: string, body: string) => Promise<void>;
  currentUserId: string | undefined;
}) {
  const [agents, setAgents] = useState<AgentDirectoryRow[]>([]);
  const [query, setQuery] = useState("");
  const [recipient, setRecipient] = useState<AgentDirectoryRow | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/agents?limit=200")
      .then((r) => r.json())
      .then((data: { data?: AgentDirectoryRow[] }) => {
        // Exclude self.
        const list = (data?.data ?? []).filter(
          (a) => a.user_id !== currentUserId
        );
        setAgents(list);
      })
      .catch(() => setAgents([]));
  }, [currentUserId]);

  const filtered = agents
    .filter((a) =>
      query.trim()
        ? a.display_name?.toLowerCase().includes(query.trim().toLowerCase())
        : true
    )
    .slice(0, 8);

  async function handleSend() {
    if (!recipient || !body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await onSend(recipient.user_id, body.trim());
    } catch {
      setError("Couldn't send. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        marginBottom: "16px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--bg-card)",
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <p
          className="font-sans"
          style={{
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            color: "var(--text-muted)",
            margin: 0,
          }}
        >
          New message
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center"
          style={{
            width: "24px",
            height: "24px",
            border: "none",
            background: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
            borderRadius: "var(--radius)",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
          onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
          aria-label="Close compose"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Recipient picker */}
      {!recipient ? (
        <>
          <div style={{ position: "relative", marginBottom: "8px" }}>
            <Search
              size={14}
              strokeWidth={2}
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-faint)",
                pointerEvents: "none",
              }}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search agents by display name…"
              className="font-sans outline-none"
              style={{
                width: "100%",
                padding: "8px 10px 8px 32px",
                fontSize: "13px",
                color: "var(--text)",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
              }}
            />
          </div>
          {filtered.length === 0 ? (
            <p
              className="font-sans"
              style={{
                fontSize: "12px",
                color: "var(--text-faint)",
                margin: 0,
                padding: "8px 0",
              }}
            >
              {agents.length === 0
                ? "No other agents to message yet."
                : "No matches. Try another name."}
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                maxHeight: "240px",
                overflowY: "auto",
              }}
            >
              {filtered.map((a) => (
                <li key={a.user_id}>
                  <button
                    type="button"
                    onClick={() => setRecipient(a)}
                    className="flex items-center font-sans"
                    style={{
                      width: "100%",
                      gap: "8px",
                      padding: "8px 10px",
                      fontSize: "13px",
                      color: "var(--text)",
                      background: "transparent",
                      border: "none",
                      borderRadius: "var(--radius)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background = "var(--bg-subtle)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <span
                      className="flex items-center justify-center font-sans"
                      style={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        background: "var(--accent-subtle)",
                        color: "var(--accent)",
                        fontSize: "10px",
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {(a.display_name ?? "?")
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </span>
                    {a.display_name ?? "Unnamed agent"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
              padding: "8px 10px",
              background: "var(--bg-subtle)",
              borderRadius: "var(--radius)",
            }}
          >
            <span
              className="font-sans"
              style={{ fontSize: "12px", color: "var(--text-muted)" }}
            >
              To:
            </span>
            <span
              className="font-sans"
              style={{ fontSize: "13px", color: "var(--text)", fontWeight: 500 }}
            >
              {recipient.display_name ?? "Unnamed agent"}
            </span>
            <button
              type="button"
              onClick={() => setRecipient(null)}
              className="font-sans"
              style={{
                marginLeft: "auto",
                fontSize: "11px",
                color: "var(--text-muted)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "2px 6px",
              }}
            >
              Change
            </button>
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message…"
            rows={4}
            className="w-full resize-none font-sans outline-none"
            style={{
              padding: "10px 12px",
              fontSize: "13px",
              color: "var(--text)",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              lineHeight: 1.5,
              marginBottom: "12px",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <span
              className="font-sans"
              style={{ fontSize: "12px", color: error ? "var(--error)" : "var(--text-faint)" }}
            >
              {error ?? ""}
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSend}
                disabled={!body.trim() || sending}
              >
                {sending ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
