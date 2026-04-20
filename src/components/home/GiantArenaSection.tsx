"use client";

import dynamic from "next/dynamic";

const GiantArena = dynamic(() => import("@/components/arena-3d/GiantArena"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 720,
        width: "100%",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "#FDFCFC",
      }}
    />
  ),
});

// Kick the arena JS chunk fetch as soon as this module parses on the
// client, same preload trick as PlaygroundWindow. Safe no-op on server.
if (typeof window !== "undefined") {
  (GiantArena as unknown as { preload?: () => void }).preload?.();
}

export default function GiantArenaSection() {
  return (
    <section className="w-full bg-[#FDFCFC] border-b border-gray-200">
      <div className="w-full max-w-[1400px] mx-auto border-x border-gray-200 px-6 sm:px-10 py-12 lg:py-16">
        <GiantArena />
      </div>
    </section>
  );
}
