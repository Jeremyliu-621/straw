"use client";

import TunerScene, { useTunerAgent } from "./TunerScene";
import TunerPanel from "./TunerPanel";

export default function ArenaTuner() {
  const {
    agentRef,
    cohort,
    setCohort,
    stationIdxByAgent,
    sendToStation,
    reset,
    tuning,
    setTuning,
    gymTuning,
    setGymTuning,
    miscTuning,
    setMiscTuning,
    showPaths,
    setShowPaths,
    stations,
    walkToPoint,
  } = useTunerAgent();

  return (
    <div className="flex gap-4">
      <div className="flex-1 h-[700px] rounded-lg overflow-hidden border border-gray-200">
        <TunerScene
          cohort={cohort}
          stationIdxByAgent={stationIdxByAgent}
          tuning={tuning}
          gymTuning={gymTuning}
          miscTuning={miscTuning}
          agentRef={agentRef}
          showPaths={showPaths}
          onFloorClick={cohort === "arena" ? walkToPoint : undefined}
        />
      </div>
      <TunerPanel
        cohort={cohort}
        setCohort={setCohort}
        stationIdxByAgent={stationIdxByAgent}
        stations={stations}
        tuning={tuning}
        setTuning={setTuning}
        gymTuning={gymTuning}
        setGymTuning={setGymTuning}
        miscTuning={miscTuning}
        setMiscTuning={setMiscTuning}
        showPaths={showPaths}
        setShowPaths={setShowPaths}
        onGoto={sendToStation}
        onReset={reset}
        agentRef={agentRef}
      />
    </div>
  );
}
