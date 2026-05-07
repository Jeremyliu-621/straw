"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Mail, MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/dashboard/section";

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
      <div>
        <InboxHero unreadCount={0} />
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

  return (
    <div>
      <InboxHero unreadCount={unreadCount} />

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

function InboxHero({ unreadCount }: { unreadCount: number }) {
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
      {unreadCount > 0 && (
        <span
          className="font-sans"
          style={{
            fontSize: "12px",
            color: "var(--accent)",
            background: "var(--accent-subtle)",
            border: "1px solid var(--accent-border)",
            borderRadius: "var(--radius)",
            padding: "4px 10px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {unreadCount} unread
        </span>
      )}
    </div>
  );
}
