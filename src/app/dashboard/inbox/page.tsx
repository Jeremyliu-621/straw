"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  recipient_id: string;
  task_id: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
}

export default function InboxPage() {
  const { data: session } = useSession();
  const [threads, setThreads] = useState<Message[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
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

    fetch(`/api/messages/${selectedThread}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(() => {});
  }, [selectedThread]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendReply() {
    if (!newMessage.trim() || !selectedThread || !messages.length) return;
    setSending(true);

    // Find the other participant
    const lastMsg = messages[messages.length - 1];
    const recipientId = lastMsg.sender_id === userId ? lastMsg.recipient_id : lastMsg.sender_id;

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
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ height: "48px", background: "var(--bg-subtle)", borderRadius: "6px" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px" }}>
      <h1
        className="font-sans"
        style={{ fontSize: "36px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)" }}
      >
        Inbox
      </h1>

      {threads.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
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
            style={{ color: "var(--text-faint)", margin: "0 auto 12px" }}
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          <p className="font-sans" style={{ fontSize: "15px", fontWeight: 500, color: "var(--text)" }}>
            No messages yet
          </p>
          <p className="font-sans" style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            Messages from task winners will appear here
          </p>
        </div>
      ) : (
        <div className="mt-8 flex gap-0" style={{ border: "1px solid var(--border)", borderRadius: "6px", height: "500px" }}>
          {/* Thread list */}
          <div
            style={{
              width: "280px",
              borderRight: "1px solid var(--border)",
              overflowY: "auto",
            }}
          >
            {threads.map((thread) => {
              const otherParty = thread.sender_id === userId ? thread.recipient_id : thread.sender_id;
              const isSelected = selectedThread === thread.thread_id;
              const isUnread = thread.recipient_id === userId && !thread.read_at;

              return (
                <button
                  key={thread.thread_id}
                  onClick={() => setSelectedThread(thread.thread_id)}
                  className="w-full text-left font-sans transition-colors"
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    background: isSelected ? "var(--bg-subtle)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: isUnread ? 500 : 400,
                      color: "var(--text)",
                    }}
                  >
                    {otherParty.slice(0, 8)}...
                  </p>
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
                  <p
                    className="font-mono"
                    style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "2px" }}
                  >
                    {new Date(thread.created_at).toLocaleDateString()}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Message area */}
          <div className="flex flex-1 flex-col">
            {!selectedThread ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="font-sans" style={{ fontSize: "13px", color: "var(--text-faint)" }}>
                  Select a conversation
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto" style={{ padding: "16px" }}>
                  {messages.map((msg) => {
                    const isMine = msg.sender_id === userId;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          marginBottom: "12px",
                          display: "flex",
                          justifyContent: isMine ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "70%",
                            padding: "10px 12px",
                            borderRadius: "6px",
                            background: isMine ? "var(--text)" : "var(--bg-subtle)",
                            color: isMine ? "var(--inverse-text)" : "var(--text)",
                          }}
                        >
                          <p className="font-sans" style={{ fontSize: "14px", lineHeight: 1.5 }}>
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
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
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
                  <input
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
                      padding: "10px 12px",
                      borderRadius: "6px",
                      fontSize: "14px",
                      color: "var(--text)",
                      background: "var(--bg)",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !newMessage.trim()}
                    className="font-sans transition-colors disabled:opacity-40"
                    style={{
                      padding: "10px 16px",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 500,
                      background: "var(--text)",
                      color: "var(--inverse-text)",
                    }}
                  >
                    Send
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
