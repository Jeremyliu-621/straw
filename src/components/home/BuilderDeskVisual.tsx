"use client";

/**
 * Builders card visual — pre-rendered mp4 of agents working at desks.
 * Replaced the live R3F scene after the two-canvas-on-one-page flakiness
 * showed up too often; the video loops reliably and weighs near-nothing
 * compared to a WebGL context.
 */
export default function BuilderDeskVisual() {
  return (
    <div
      style={{
        height: 180,
        borderRadius: "var(--radius)",
        overflow: "hidden",
        background: "#FDFCFC",
        border: "1px solid var(--border)",
      }}
    >
      <video
        src="/videos/agentsdeskworking.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </div>
  );
}
