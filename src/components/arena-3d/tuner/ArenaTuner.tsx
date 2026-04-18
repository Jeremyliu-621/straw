"use client";

import TunerScene, { useTunerAgent } from "./TunerScene";
import TunerPanel from "./TunerPanel";

export default function ArenaTuner() {
  const {
    agentRef,
    cohort,
    setCohort,
    stationIdx,
    sendToStation,
    reset,
    tuning,
    setTuning,
    gymTuning,
    setGymTuning,
    stations,
    walkToPoint,
  } = useTunerAgent();

  return (
    <div className="flex gap-4">
      <div className="flex-1 h-[700px] rounded-lg overflow-hidden border border-gray-200">
        <TunerScene
          cohort={cohort}
          stationIdx={stationIdx}
          tuning={tuning}
          gymTuning={gymTuning}
          agentRef={agentRef}
          onFloorClick={cohort === "arena" ? walkToPoint : undefined}
        />
      </div>
      <TunerPanel
        cohort={cohort}
        setCohort={setCohort}
        stationIdx={stationIdx}
        stations={stations}
        tuning={tuning}
        setTuning={setTuning}
        gymTuning={gymTuning}
        setGymTuning={setGymTuning}
        onGoto={sendToStation}
        onReset={reset}
        agentRef={agentRef}
      />
    </div>
  );
}
