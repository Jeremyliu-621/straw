"use client";

import { useLayoutEffect, useEffect, useCallback } from "react";
import TunerScene, { useTunerAgent } from "./tuner/TunerScene";

export default function GiantArena({ height = 720 }: { height?: number }) {
  const {
    cohort,
    stationIdxByAgent,
    tuning,
    gymTuning,
    miscTuning,
    agentRef,
    navOverrides,
    wallBury,
    setWallBury,
    showPaths,
    setShowPaths,
    showNav,
    setShowNav,
    view,
    setView,
    triggerJoin,
    triggerLeave,
    triggerStandup,
    triggerCluster,
    triggerDevAction,
    reset,
    sendToStation,
    stations,
  } = useTunerAgent({ initialCohort: "arena", initialAmbientAll: true });

  // Hide every agent pre-paint so the opener shows an empty arena.
  useLayoutEffect(() => {
    for (const a of agentRef.current) {
      if (a) a.hidden = true;
    }
  }, [agentRef]);

  // Stagger agents in through the east door.
  useEffect(() => {
    const timers: number[] = [];
    for (let i = 0; i < agentRef.current.length; i++) {
      timers.push(window.setTimeout(() => triggerJoin(), 400 + i * 700));
    }
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [agentRef, triggerJoin]);

  const pickRandomVisibleIdx = useCallback((): number | null => {
    const visible: number[] = [];
    for (let i = 0; i < agentRef.current.length; i++) {
      const a = agentRef.current[i];
      if (a && !a.hidden) visible.push(i);
    }
    if (visible.length === 0) return null;
    return visible[Math.floor(Math.random() * visible.length)];
  }, [agentRef]);

  const onDevAction = useCallback(
    (action: "dance" | "emoji" | "slump" | "talk") => {
      const idx = pickRandomVisibleIdx();
      if (idx === null) return;
      triggerDevAction(idx, action);
    },
    [pickRandomVisibleIdx, triggerDevAction],
  );

  const onPingPong = useCallback(() => {
    const agents = agentRef.current;
    const now = Date.now();
    const ppStationIdxs: number[] = [];
    for (let i = 0; i < stations.length; i++) {
      if (stations[i]?.pingPongTableUid) ppStationIdxs.push(i);
    }
    if (ppStationIdxs.length < 2) return;
    const eligible: number[] = [];
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      if (!a || a.hidden) continue;
      if (a.state === "walking" || a.state === "working_out") continue;
      if ((a.pingPongUntil ?? 0) > now) continue;
      if (a.pingPongTableUid) continue;
      if ((a.standupUntil ?? 0) > now) continue;
      if ((a.couchUntil ?? 0) > now) continue;
      if ((a.danceUntil ?? 0) > now) continue;
      eligible.push(i);
      if (eligible.length === 2) break;
    }
    if (eligible.length < 2) return;
    sendToStation(eligible[0], ppStationIdxs[0]);
    sendToStation(eligible[1], ppStationIdxs[1]);
  }, [agentRef, stations, sendToStation]);

  const pill =
    "px-3 py-1.5 rounded-full text-xs font-sans bg-white border border-gray-300 hover:border-black transition-colors";
  const pillActive =
    "px-3 py-1.5 rounded-full text-xs font-sans bg-black text-white border border-black hover:bg-black/80 transition-colors";
  const pillActiveRed =
    "px-3 py-1.5 rounded-full text-xs font-sans bg-red-600 text-white border border-red-600 hover:bg-red-700 transition-colors";
  const groupLabel =
    "font-sans text-[10px] text-gray-500 shrink-0 uppercase tracking-wider";

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
      <div
        style={{
          flex: "1 1 88%",
          minWidth: 0,
          height,
          position: "relative",
          overflow: "hidden",
        }}
      >
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
          view={view}
          wallBury={wallBury}
          zoom={38}
        />
      </div>

      {/* Admin panel — narrow right column, with its own bordered container
          so the controls feel like a standalone toolkit. */}
      <div
        style={{
          flex: "1 1 12%",
          minWidth: 140,
          height,
          padding: 12,
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          overflowY: "auto",
        }}
      >
        <div className="flex flex-col gap-2">
          <span className={groupLabel}>Standup</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => triggerStandup("conference")} className={pill}>
              conference
            </button>
            <button onClick={() => triggerStandup("round_table")} className={pill}>
              round table
            </button>
            <button onClick={() => triggerStandup("random")} className={pill}>
              random
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={groupLabel}>Gather</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => triggerCluster()} className={pill}>
              cluster
            </button>
            <button onClick={onPingPong} className={pill}>
              ping pong
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={groupLabel}>Door</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => triggerJoin()} className={pill}>
              + join
            </button>
            <button onClick={() => triggerLeave()} className={pill}>
              − leave
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={groupLabel}>Per-agent</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onDevAction("dance")} className={pill} title="Random visible agent dances 5s">
              💃 dance
            </button>
            <button onClick={() => onDevAction("emoji")} className={pill} title="Random visible agent pops an emoji">
              🎉 emoji
            </button>
            <button onClick={() => onDevAction("slump")} className={pill} title="Random visible agent slumps (❌)">
              ❌ slump
            </button>
            <button onClick={() => onDevAction("talk")} className={pill} title="Random visible agent talks to nearest neighbour">
              💬 talk
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={groupLabel}>View</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setView(view === "iso" ? "top" : "iso")}
              className={view === "top" ? pillActive : pill}
            >
              view: {view}
            </button>
            <button
              onClick={() => setShowPaths((v) => !v)}
              className={showPaths ? pillActive : pill}
            >
              paths: {showPaths ? "on" : "off"}
            </button>
            <button
              onClick={() => setShowNav((v) => !v)}
              className={showNav ? pillActiveRed : pill}
            >
              nav: {showNav ? "on" : "off"}
            </button>
            <button
              onClick={() => setWallBury((v) => !v)}
              className={wallBury ? pillActive : pill}
            >
              bury walls: {wallBury ? "on" : "off"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={groupLabel}>Reset</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => reset()} className={pill}>
              reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
