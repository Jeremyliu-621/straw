"use client";

import { STATIONS } from "./TunerScene";
import type { RenderAgentState } from "../useArenaGameLoop";

interface TunerPanelProps {
  stationIdx: number | null;
  onGoto: (idx: number | null) => void;
  onReset: () => void;
  agentRef: React.RefObject<RenderAgentState[]>;
}

function fmt(n: number | undefined): string {
  if (n === undefined) return "—";
  return n.toFixed(1);
}

function fmtAngle(rad: number | undefined): string {
  if (rad === undefined) return "—";
  const deg = (rad * 180) / Math.PI;
  return `${rad.toFixed(2)} rad (${deg.toFixed(0)}°)`;
}

export default function TunerPanel({
  stationIdx,
  onGoto,
  onReset,
  agentRef,
}: TunerPanelProps) {
  const agent = agentRef.current[0];
  const activeStation = stationIdx !== null ? STATIONS[stationIdx] : null;

  return (
    <div className="flex flex-col gap-3 p-4 text-sm font-mono bg-gray-50 rounded-lg min-w-[320px] border border-gray-200">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
          Send agent to…
        </p>
        <div className="flex flex-wrap gap-2">
          {STATIONS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => onGoto(i)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
                stationIdx === i
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-gray-300 hover:border-black"
              }`}
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={() => onGoto(null)}
            className="px-3 py-1.5 rounded-full text-xs bg-white text-gray-600 border border-gray-300 hover:bg-gray-100"
          >
            stop
          </button>
          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded-full text-xs bg-white text-red-600 border border-red-300 hover:bg-red-50"
          >
            reset
          </button>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
          Agent state
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          <dt className="text-gray-500">position</dt>
          <dd>
            ({fmt(agent?.x)}, {fmt(agent?.y)})
          </dd>
          <dt className="text-gray-500">target</dt>
          <dd>
            ({fmt(agent?.targetX)}, {fmt(agent?.targetY)})
          </dd>
          <dt className="text-gray-500">facing</dt>
          <dd>{fmtAngle(agent?.facing)}</dd>
          <dt className="text-gray-500">state</dt>
          <dd>{agent?.state ?? "—"}</dd>
          <dt className="text-gray-500">status</dt>
          <dd>{agent?.status ?? "—"}</dd>
          <dt className="text-gray-500">socialSpotType</dt>
          <dd>{agent?.socialSpotType ?? "—"}</dd>
          <dt className="text-gray-500">path len</dt>
          <dd>{agent?.path.length ?? 0}</dd>
        </dl>
      </div>

      {activeStation && (
        <div className="border-t border-gray-200 pt-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
            Target station
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
            <dt className="text-gray-500">label</dt>
            <dd>{activeStation.label}</dd>
            <dt className="text-gray-500">stand point</dt>
            <dd>
              ({fmt(activeStation.standX)}, {fmt(activeStation.standY)})
            </dd>
            <dt className="text-gray-500">facing</dt>
            <dd>{fmtAngle(activeStation.facing)}</dd>
            <dt className="text-gray-500">state</dt>
            <dd>{activeStation.state}</dd>
          </dl>
        </div>
      )}

      <div className="border-t border-gray-200 pt-3">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">
          Legend
        </p>
        <ul className="text-[11px] text-gray-600 leading-relaxed">
          <li>
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />
            red — agent position + facing arrow
          </li>
          <li>
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5" />
            green — station stand point + target facing arrow
          </li>
        </ul>
      </div>
    </div>
  );
}
