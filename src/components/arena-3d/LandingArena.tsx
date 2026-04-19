"use client";

import { useLayoutEffect, useEffect } from "react";
import TunerScene, { useTunerAgent } from "./tuner/TunerScene";

export default function LandingArena({ height }: { height: number }) {
  const {
    cohort,
    stationIdxByAgent,
    tuning,
    gymTuning,
    miscTuning,
    agentRef,
    navOverrides,
    wallBury,
    showPaths,
    setShowPaths,
    showNav,
    setShowNav,
    triggerJoin,
  } = useTunerAgent({ initialCohort: "arena", initialAmbientAll: true });

  // Hide every agent before the first paint so the scene opens on an
  // empty arena (instead of showing 15 agents piled up at the spawn grid).
  useLayoutEffect(() => {
    for (const a of agentRef.current) {
      if (a) a.hidden = true;
    }
  }, [agentRef]);

  // Stagger agents in through the east door. triggerJoin picks the first
  // hidden agent, teleports them just-inside the door, and walks them to
  // the spawn area; once idle the ambient picker takes over normally.
  useEffect(() => {
    const timers: number[] = [];
    for (let i = 0; i < agentRef.current.length; i++) {
      timers.push(window.setTimeout(() => triggerJoin(), 400 + i * 500));
    }
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [agentRef, triggerJoin]);

  return (
    <div style={{ height, width: "100%", position: "relative" }}>
      <TunerScene
        cohort={cohort}
        stationIdxByAgent={stationIdxByAgent}
        tuning={tuning}
        gymTuning={gymTuning}
        miscTuning={miscTuning}
        agentRef={agentRef}
        showPaths={showPaths}
        showNav={showNav}
        navOverrides={navOverrides}
        view="iso"
        wallBury={wallBury}
        zoom={20}
      />
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          display: "flex",
          gap: 6,
          zIndex: 5,
        }}
      >
        <button
          onClick={() => setShowPaths((v) => !v)}
          className={`px-3 py-1.5 rounded-full text-xs transition-colors border font-mono ${
            showPaths
              ? "bg-black text-white border-black"
              : "bg-white text-black border-gray-300 hover:border-black"
          }`}
        >
          paths: {showPaths ? "on" : "off"}
        </button>
        <button
          onClick={() => setShowNav((v) => !v)}
          className={`px-3 py-1.5 rounded-full text-xs transition-colors border font-mono ${
            showNav
              ? "bg-red-600 text-white border-red-600"
              : "bg-white text-black border-gray-300 hover:border-red-600"
          }`}
        >
          nav: {showNav ? "on" : "off"}
        </button>
      </div>
    </div>
  );
}
