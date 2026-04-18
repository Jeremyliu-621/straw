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
    showNav,
    setShowNav,
    obb,
    setObb,
    navOverrides,
    setNavOverrides,
    ambientByAgent,
    setAmbientForAgent,
    setAmbientForAll,
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
          showNav={showNav}
          obb={obb}
          navOverrides={navOverrides}
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
        showNav={showNav}
        setShowNav={setShowNav}
        obb={obb}
        setObb={setObb}
        navOverrides={navOverrides}
        setNavOverrides={setNavOverrides}
        ambientByAgent={ambientByAgent}
        setAmbientForAgent={setAmbientForAgent}
        setAmbientForAll={setAmbientForAll}
        onGoto={sendToStation}
        onReset={reset}
        agentRef={agentRef}
      />
    </div>
  );
}
