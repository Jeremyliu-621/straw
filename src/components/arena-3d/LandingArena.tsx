"use client";

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
  } = useTunerAgent({ initialCohort: "arena", initialAmbientAll: true });

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
