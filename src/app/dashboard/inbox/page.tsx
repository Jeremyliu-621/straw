"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userId = session?.user?.supabaseId;

  // Fetch thread list
  useEffect(() => {
    fetch("/api/messages")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setThreads(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
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
      <div style={{ padding: "32px" }}>
        <div
          className="animate-pulse"
          style={{
            height: "28px",
            width: "80px",
            background: "var(--bg-subtle)",
            borderRadius: "var(--radius)",
            marginBottom: "32px",
          }}
        />
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

  return (
    <div style={{ padding: "32px" }}>
      <h1
        className="font-sans"
        style={{
          fontSize: "28px",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--text)",
        }}
      >
        Inbox
      </h1>

      {threads.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "var(--bg-subtle)",
              margin: "0 auto 16px",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--text-faint)" }}
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <p
            className="font-sans"
            style={{
              fontSize: "16px",
              fontWeight: 500,
              color: "var(--text)",
            }}
          >
            No messages yet
          </p>
          <p
            className="font-sans"
            style={{
              fontSize: "14px",
              color: "var(--text-muted)",
              marginTop: "6px",
              maxWidth: "280px",
              margin: "6px auto 0",
              lineHeight: 1.5,
            }}
          >
            Messages from task participants will appear here after a competition
            closes.
          </p>
        </div>
      ) : (
        <div
          className="mt-6 flex"
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            height: "calc(100vh - 180px)",
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
              <div className="flex flex-1 flex-col items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    color: "var(--text-faint)",
                    marginBottom: "12px",
                  }}
                >
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                </svg>
                <p
                  className="font-sans"
                  style={{
                    fontSize: "14px",
                    color: "var(--text-faint)",
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
