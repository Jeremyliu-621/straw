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
  } = useTunerAgent({ initialCohort: "arena", initialAmbientAll: true });

  return (
    <div style={{ height, width: "100%" }}>
      <TunerScene
        cohort={cohort}
        stationIdxByAgent={stationIdxByAgent}
        tuning={tuning}
        gymTuning={gymTuning}
        miscTuning={miscTuning}
        agentRef={agentRef}
        showPaths={false}
        showNav={false}
        navOverrides={navOverrides}
        view="iso"
        wallBury={wallBury}
      />
    </div>
  );
}
