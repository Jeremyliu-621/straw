"use client";

import { useState } from "react";
import { MOCK_THREADS, type MockThread } from "../data";

export default function InboxPage() {
  const [activeThread, setActiveThread] = useState<MockThread>(MOCK_THREADS[0]);

  return (
    <div style={{ margin: -32, display: "flex", height: "calc(680px)" }}>
      {/* Thread list */}
      <div
        style={{
          width: 300,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          overflowY: "auto",
          scrollbarWidth: "none",
        } as React.CSSProperties}
      >
        <div style={{ padding: "20px 16px 12px" }}>
          <h2 className="font-sans" style={{ fontSize: 18, fontWeight: 500, color: "var(--text)", margin: 0 }}>
            Inbox
          </h2>
        </div>
        {MOCK_THREADS.map((thread) => {
          const isActive = activeThread.id === thread.id;
          return (
            <div
              key={thread.id}
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
                background: isActive ? "var(--accent-subtle, var(--bg-subtle))" : "transparent",
                transition: "background-color 0.15s ease",
              }}
              onClick={() => setActiveThread(thread)}
              onMouseOver={(e) => { if (!isActive) e.currentTarget.style.background = "var(--bg-subtle)"; }}
              onMouseOut={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Avatar */}
                <div
                  className="flex items-center justify-center font-sans"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "var(--accent, var(--text))",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {thread.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center justify-between">
                    <span className="font-sans truncate" style={{ fontSize: 14, fontWeight: thread.unread ? 600 : 400, color: "var(--text)" }}>
                      {thread.name}
                    </span>
                    <span className="font-sans" style={{ fontSize: 11, color: "var(--text-faint)", flexShrink: 0, marginLeft: 8 }}>
                      {thread.timestamp}
                    </span>
                  </div>
                  <p className="font-sans" style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.02em", color: "var(--text-faint)", marginTop: 1, margin: 0 }}>
                    Re: {thread.taskTitle}
                  </p>
                  <p className="font-sans truncate" style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, marginTop: 2 }}>
                    {thread.lastMessage}
                  </p>
                </div>
                {thread.unread && (
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Message area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Conversation header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
          <p className="font-sans" style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", margin: 0 }}>
            {activeThread.name}
          </p>
          <p className="font-sans" style={{ fontSize: 12, color: "var(--text-faint)", margin: 0, marginTop: 2 }}>
            Re: {activeThread.taskTitle}
          </p>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", scrollbarWidth: "none" } as React.CSSProperties}>
          {activeThread.messages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", justifyContent: msg.mine ? "flex-end" : "flex-start", marginBottom: 12 }}>
              <div>
                <div
                  className="font-sans"
                  style={{
                    maxWidth: 320,
                    padding: "10px 14px",
                    borderRadius: "var(--radius)",
                    fontSize: 14,
                    lineHeight: 1.5,
                    background: msg.mine ? "var(--accent, var(--text))" : "var(--bg-subtle)",
                    color: msg.mine ? "white" : "var(--text)",
                  }}
                >
                  {msg.body}
                </div>
                <p className="font-mono" style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4, textAlign: msg.mine ? "right" : "left", opacity: 0.6 }}>
                  {msg.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Reply input */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
          <input
            className="font-sans"
            placeholder="Type a message..."
            readOnly
            style={{
              flex: 1,
              padding: "10px 14px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: 14,
              color: "var(--text)",
              background: "var(--bg)",
              outline: "none",
            }}
          />
          <button
            className="font-sans"
            style={{
              padding: "10px 20px",
              borderRadius: "var(--radius)",
              fontSize: 14,
              fontWeight: 500,
              background: "var(--accent)",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
