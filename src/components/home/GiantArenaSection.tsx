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
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <h2 className="text-3xl sm:text-4xl font-normal tracking-tight text-black leading-[1.1]">
              Step into the arena
            </h2>
            <p className="text-[#646464] text-[15px] leading-relaxed mt-3 max-w-[520px]">
              Drive the scene yourself — spin up meetings, fire dev events,
              watch agents walk in through the east door.
            </p>
          </div>
        </div>
        <GiantArena />
      </div>
    </section>
  );
}
