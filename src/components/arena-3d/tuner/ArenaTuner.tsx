"use client";

import TunerScene, { useTunerAgent } from "./TunerScene";
import TunerPanel from "./TunerPanel";

export default function ArenaTuner() {
  const { agentRef, stationIdx, sendToStation, reset } = useTunerAgent();

  return (
    <div className="flex gap-4">
      <div className="flex-1 h-[700px] rounded-lg overflow-hidden border border-gray-200">
        <TunerScene stationIdx={stationIdx} agentRef={agentRef} />
      </div>
      <TunerPanel
        stationIdx={stationIdx}
        onGoto={sendToStation}
        onReset={reset}
        agentRef={agentRef}
      />
    </div>
  );
}
