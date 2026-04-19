"use client";

import { useState } from "react";
import type { RenderAgentState } from "../useArenaGameLoop";
import {
  ITEM_FOOTPRINT,
  ITEM_METADATA,
  type NavAnchorOverride,
} from "../core/geometry";
import {
  type Cohort,
  type Station,
  type TuningParams,
  type GymTuningParams,
  type MiscTuningParams,
  tunerAgentColor,
  NAV_TUNABLE_TYPES,
  type TunerView,
} from "./TunerScene";

interface TunerPanelProps {
  cohort: Cohort;
  setCohort: (c: Cohort) => void;
  stationIdxByAgent: (number | null)[];
  stations: Station[];
  tuning: TuningParams;
  setTuning: (updater: (prev: TuningParams) => TuningParams) => void;
  gymTuning: GymTuningParams;
  setGymTuning: (updater: (prev: GymTuningParams) => GymTuningParams) => void;
  miscTuning: MiscTuningParams;
  setMiscTuning: (updater: (prev: MiscTuningParams) => MiscTuningParams) => void;
  showPaths: boolean;
  setShowPaths: (v: boolean | ((prev: boolean) => boolean)) => void;
  showNav: boolean;
  setShowNav: (v: boolean | ((prev: boolean) => boolean)) => void;
  view: TunerView;
  setView: (v: TunerView) => void;
  navOverrides: Record<string, NavAnchorOverride>;
  setNavOverrides: (
    updater:
      | Record<string, NavAnchorOverride>
      | ((prev: Record<string, NavAnchorOverride>) => Record<string, NavAnchorOverride>),
  ) => void;
  ambientByAgent: boolean[];
  setAmbientForAgent: (agentIdx: number, on: boolean) => void;
  setAmbientForAll: (on: boolean) => void;
  onGoto: (agentIdx: number, stationIdx: number | null) => void;
  onReset: () => void;
  onDevAction: (
    agentIdx: number,
    action: "dance" | "emoji" | "slump" | "talk"
  ) => void;
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

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix = "",
}: SliderProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>{label}</span>
        <span className="font-mono">
          {value.toFixed(step < 1 ? 2 : 0)}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 accent-black"
      />
    </div>
  );
}

export default function TunerPanel({
  cohort,
  setCohort,
  stationIdxByAgent,
  stations,
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
  view,
  setView,
  navOverrides,
  setNavOverrides,
  ambientByAgent,
  setAmbientForAgent,
  setAmbientForAll,
  onGoto,
  onReset,
  onDevAction,
  agentRef,
}: TunerPanelProps) {
  const [devAgentIdx, setDevAgentIdx] = useState(0);
  const agentCount = ambientByAgent.length;
  const allAmbientOn = ambientByAgent.every(Boolean);
  const anyAmbientOn = ambientByAgent.some(Boolean);

  const setSeatsField = (key: keyof TuningParams, value: number) => {
    setTuning((prev) => ({ ...prev, [key]: value }));
  };
  const setGymField = (key: keyof GymTuningParams, value: number) => {
    setGymTuning((prev) => ({ ...prev, [key]: value }));
  };
  const setMiscField = (key: keyof MiscTuningParams, value: number) => {
    setMiscTuning((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col gap-3 p-4 text-sm font-mono bg-gray-50 rounded-lg min-w-[340px] max-w-[360px] border border-gray-200 max-h-[700px] overflow-y-auto">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
          Cohort
        </p>
        <div className="flex gap-2">
          {(["seats", "gym", "misc", "arena"] as Cohort[]).map((c) => (
            <button
              key={c}
              onClick={() => setCohort(c)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
                cohort === c
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-gray-300 hover:border-black"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">
            Agents ({agentCount})
          </p>
          <button
            onClick={() => setAmbientForAll(!allAmbientOn)}
            className={`px-3 py-1 rounded-full text-[11px] transition-colors border ${
              allAmbientOn
                ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                : anyAmbientOn
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                  : "bg-white text-black border-gray-300 hover:border-black"
            }`}
            title="Toggle ambient mode for every agent at once"
          >
            all ambient: {allAmbientOn ? "on" : anyAmbientOn ? "mixed" : "off"}
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: agentCount }).map((_, agentIdx) => {
            const activeIdx = stationIdxByAgent[agentIdx] ?? null;
            const ambient = ambientByAgent[agentIdx] ?? false;
            const name = String.fromCharCode(65 + agentIdx);
            const color = tunerAgentColor(agentIdx);
            return (
              <div key={agentIdx} className="flex items-center gap-1.5">
                <span
                  className="w-5 text-center text-[11px] font-semibold shrink-0"
                  style={{ color }}
                  title={`Agent ${name}`}
                >
                  {name}
                </span>
                <select
                  value={activeIdx ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (ambient) setAmbientForAgent(agentIdx, false);
                    onGoto(agentIdx, v === "" ? null : Number(v));
                  }}
                  className="flex-1 min-w-0 px-2 py-1 rounded-md text-[11px] bg-white text-black border border-gray-300 hover:border-black focus:outline-none focus:border-black"
                >
                  <option value="">—</option>
                  {stations.map((s, i) => (
                    <option key={s.label} value={i}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (ambient) setAmbientForAgent(agentIdx, false);
                    onGoto(agentIdx, null);
                  }}
                  className="px-2 py-1 rounded-md text-[11px] bg-white text-gray-600 border border-gray-300 hover:bg-gray-100 shrink-0"
                  title="Clear this agent's destination"
                >
                  stop
                </button>
                <button
                  onClick={() => setAmbientForAgent(agentIdx, !ambient)}
                  className={`px-2 py-1 rounded-md text-[11px] border shrink-0 transition-colors ${
                    ambient
                      ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                      : "bg-white text-gray-600 border-gray-300 hover:border-black"
                  }`}
                  title="Ambient: hop between random stations every 6–12s"
                >
                  {ambient ? "amb✓" : "amb"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="border-t border-gray-200 pt-3 flex gap-2 flex-wrap">
        <button
          onClick={() => setShowPaths((v) => !v)}
          className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
            showPaths
              ? "bg-black text-white border-black"
              : "bg-white text-black border-gray-300 hover:border-black"
          }`}
        >
          paths: {showPaths ? "on" : "off"}
        </button>
        <button
          onClick={() => setShowNav((v) => !v)}
          className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
            showNav
              ? "bg-red-600 text-white border-red-600"
              : "bg-white text-black border-gray-300 hover:border-red-600"
          }`}
        >
          nav: {showNav ? "on" : "off"}
        </button>
        <button
          onClick={() => setView(view === "iso" ? "top" : "iso")}
          className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
            view === "top"
              ? "bg-black text-white border-black"
              : "bg-white text-black border-gray-300 hover:border-black"
          }`}
          title="Toggle between isometric and top-down views"
        >
          view: {view}
        </button>
        <button
          onClick={onReset}
          className="px-3 py-1.5 rounded-full text-xs bg-white text-red-600 border border-red-300 hover:bg-red-50"
        >
          reset both
        </button>
      </div>

      {cohort === "arena" ? (
        <div className="border-t border-gray-200 pt-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
            Arena — click to direct
          </p>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            Click anywhere on the floor to send the agent to that spot. Or use
            a station button above. The layout uses the same validated station
            factories as seats/gym — do not fiddle with those values.
          </p>
        </div>
      ) : cohort === "seats" ? (
        <div className="border-t border-gray-200 pt-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
            Tuning (seats)
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Desk</p>
              <Slider label="rotation" value={tuning.deskRotDeg} min={0} max={360} step={1} onChange={(v) => setSeatsField("deskRotDeg", v)} suffix="°" />
              <Slider label="sit back" value={tuning.deskSitBack} min={-0.5} max={1.5} step={0.01} onChange={(v) => setSeatsField("deskSitBack", v)} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Standing desk</p>
              <Slider label="rotation" value={tuning.standingDeskRotDeg} min={0} max={360} step={1} onChange={(v) => setSeatsField("standingDeskRotDeg", v)} suffix="°" />
              <Slider label="distance" value={tuning.standingDeskDist} min={-30} max={80} step={1} onChange={(v) => setSeatsField("standingDeskDist", v)} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Couch</p>
              <Slider label="rotation" value={tuning.couchRotDeg} min={0} max={360} step={1} onChange={(v) => setSeatsField("couchRotDeg", v)} suffix="°" />
              <Slider label="sit back" value={tuning.couchSitBack} min={-0.5} max={1.5} step={0.01} onChange={(v) => setSeatsField("couchSitBack", v)} />
              <Slider label="sink depth" value={tuning.couchSinkDepth} min={-5} max={5} step={0.05} onChange={(v) => setSeatsField("couchSinkDepth", v)} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Couch_v</p>
              <Slider label="rotation" value={tuning.couchVRotDeg} min={0} max={360} step={1} onChange={(v) => setSeatsField("couchVRotDeg", v)} suffix="°" />
              <Slider label="sit back" value={tuning.couchVSitBack} min={-0.5} max={1.5} step={0.01} onChange={(v) => setSeatsField("couchVSitBack", v)} />
              <Slider label="sink depth" value={tuning.couchVSinkDepth} min={-5} max={5} step={0.05} onChange={(v) => setSeatsField("couchVSinkDepth", v)} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Beanbag</p>
              <Slider label="rotation" value={tuning.beanbagRotDeg} min={0} max={360} step={1} onChange={(v) => setSeatsField("beanbagRotDeg", v)} suffix="°" />
              <Slider label="sit back" value={tuning.beanbagSitBack} min={-0.5} max={1.5} step={0.01} onChange={(v) => setSeatsField("beanbagSitBack", v)} />
              <Slider label="sink depth" value={tuning.beanbagSinkDepth} min={-5} max={20} step={0.1} onChange={(v) => setSeatsField("beanbagSinkDepth", v)} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Round table</p>
              <Slider label="rotation" value={tuning.roundTableRotDeg} min={0} max={360} step={1} onChange={(v) => setSeatsField("roundTableRotDeg", v)} suffix="°" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Plant</p>
              <Slider label="rotation" value={tuning.plantRotDeg} min={0} max={360} step={1} onChange={(v) => setSeatsField("plantRotDeg", v)} suffix="°" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Table (rect)</p>
              <Slider label="rotation" value={tuning.tableRectRotDeg} min={0} max={360} step={1} onChange={(v) => setSeatsField("tableRectRotDeg", v)} suffix="°" />
            </div>
          </div>
        </div>
      ) : cohort === "misc" ? (
        <div className="border-t border-gray-200 pt-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
            Tuning (misc)
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Coffee machine</p>
              <Slider label="rotation" value={miscTuning.coffeeMachineRotDeg} min={0} max={360} step={1} onChange={(v) => setMiscField("coffeeMachineRotDeg", v)} suffix="°" />
              <Slider label="distance" value={miscTuning.coffeeMachineDist} min={-100} max={200} step={1} onChange={(v) => setMiscField("coffeeMachineDist", v)} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Phone booth</p>
              <Slider label="rotation" value={miscTuning.phoneBoothRotDeg} min={0} max={360} step={1} onChange={(v) => setMiscField("phoneBoothRotDeg", v)} suffix="°" />
              <Slider label="distance" value={miscTuning.phoneBoothDist} min={-100} max={200} step={1} onChange={(v) => setMiscField("phoneBoothDist", v)} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Fridge</p>
              <Slider label="rotation" value={miscTuning.fridgeRotDeg} min={0} max={360} step={1} onChange={(v) => setMiscField("fridgeRotDeg", v)} suffix="°" />
              <Slider label="distance" value={miscTuning.fridgeDist} min={-100} max={200} step={1} onChange={(v) => setMiscField("fridgeDist", v)} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Vending</p>
              <Slider label="rotation" value={miscTuning.vendingRotDeg} min={0} max={360} step={1} onChange={(v) => setMiscField("vendingRotDeg", v)} suffix="°" />
              <Slider label="distance" value={miscTuning.vendingDist} min={-100} max={200} step={1} onChange={(v) => setMiscField("vendingDist", v)} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Water dispenser</p>
              <Slider label="rotation" value={miscTuning.waterDispenserRotDeg} min={0} max={360} step={1} onChange={(v) => setMiscField("waterDispenserRotDeg", v)} suffix="°" />
              <Slider label="distance" value={miscTuning.waterDispenserDist} min={-100} max={200} step={1} onChange={(v) => setMiscField("waterDispenserDist", v)} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Ping pong</p>
              <Slider label="rotation" value={miscTuning.pingPongRotDeg} min={0} max={360} step={1} onChange={(v) => setMiscField("pingPongRotDeg", v)} suffix="°" />
              <Slider label="distance" value={miscTuning.pingPongDist} min={-100} max={200} step={1} onChange={(v) => setMiscField("pingPongDist", v)} />
              <Slider label="arc height" value={miscTuning.pingPongArcHeight} min={0} max={2} step={0.01} onChange={(v) => setMiscField("pingPongArcHeight", v)} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Printer station</p>
              <Slider label="rotation" value={miscTuning.printerStationRotDeg} min={0} max={360} step={1} onChange={(v) => setMiscField("printerStationRotDeg", v)} suffix="°" />
              <Slider label="distance" value={miscTuning.printerStationDist} min={-100} max={200} step={1} onChange={(v) => setMiscField("printerStationDist", v)} />
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-200 pt-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
            Tuning (gym)
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Whiteboard</p>
              <Slider label="rotation" value={gymTuning.whiteboardRotDeg} min={0} max={360} step={1} onChange={(v) => setGymField("whiteboardRotDeg", v)} suffix="°" />
              <Slider label="distance" value={gymTuning.whiteboardDist} min={-100} max={200} step={1} onChange={(v) => setGymField("whiteboardDist", v)} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Chair</p>
              <Slider label="rotation" value={gymTuning.chairRotDeg} min={0} max={360} step={1} onChange={(v) => setGymField("chairRotDeg", v)} suffix="°" />
              <Slider label="sit back" value={gymTuning.chairSitBack} min={-0.5} max={1.5} step={0.01} onChange={(v) => setGymField("chairSitBack", v)} />
              <Slider label="sink depth" value={gymTuning.chairSinkDepth} min={-5} max={5} step={0.05} onChange={(v) => setGymField("chairSinkDepth", v)} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Squat rack</p>
              <Slider label="rotation" value={gymTuning.squatRackRotDeg} min={0} max={360} step={1} onChange={(v) => setGymField("squatRackRotDeg", v)} suffix="°" />
              <Slider label="distance" value={gymTuning.squatRackDist} min={-100} max={200} step={1} onChange={(v) => setGymField("squatRackDist", v)} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Dumbbells</p>
              <Slider label="rotation" value={gymTuning.dumbbellRackRotDeg} min={0} max={360} step={1} onChange={(v) => setGymField("dumbbellRackRotDeg", v)} suffix="°" />
              <Slider label="distance" value={gymTuning.dumbbellRackDist} min={-100} max={200} step={1} onChange={(v) => setGymField("dumbbellRackDist", v)} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Pull-up tower</p>
              <Slider label="rotation" value={gymTuning.pullUpTowerRotDeg} min={0} max={360} step={1} onChange={(v) => setGymField("pullUpTowerRotDeg", v)} suffix="°" />
              <Slider label="distance" value={gymTuning.pullUpTowerDist} min={-100} max={200} step={1} onChange={(v) => setGymField("pullUpTowerDist", v)} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-1">Punching bag</p>
              <Slider label="rotation" value={gymTuning.punchingBagRotDeg} min={0} max={360} step={1} onChange={(v) => setGymField("punchingBagRotDeg", v)} suffix="°" />
              <Slider label="distance" value={gymTuning.punchingBagDist} min={-100} max={200} step={1} onChange={(v) => setGymField("punchingBagDist", v)} />
            </div>
          </div>
        </div>
      )}

      {showNav && (
        <NavTunePanel
          navOverrides={navOverrides}
          setNavOverrides={setNavOverrides}
        />
      )}

      {agentCount <= 2 ? (
        // Seats / gym / misc: show full per-agent state for careful tuning.
        Array.from({ length: agentCount }).map((_, agentIdx) => {
          const agent = agentRef.current[agentIdx];
          const activeIdx = stationIdxByAgent[agentIdx] ?? null;
          const activeStation = activeIdx !== null ? stations[activeIdx] : null;
          const name = String.fromCharCode(65 + agentIdx);
          return (
            <div key={agentIdx} className="border-t border-gray-200 pt-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
                Agent {name} state
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                <dt className="text-gray-500">position</dt>
                <dd>
                  ({fmt(agent?.x)}, {fmt(agent?.y)})
                </dd>
                <dt className="text-gray-500">facing</dt>
                <dd>{fmtAngle(agent?.facing)}</dd>
                <dt className="text-gray-500">state</dt>
                <dd>{agent?.state ?? "—"}</dd>
                {activeStation ? (
                  <>
                    <dt className="text-gray-500">station</dt>
                    <dd>{activeStation.label}</dd>
                    <dt className="text-gray-500">stand</dt>
                    <dd>
                      ({fmt(activeStation.standX)}, {fmt(activeStation.standY)})
                    </dd>
                  </>
                ) : null}
              </dl>
            </div>
          );
        })
      ) : (
        // Arena cohort (15 agents): compact summary table — one row each.
        <div className="border-t border-gray-200 pt-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
            Agent state
          </p>
          <div className="flex flex-col gap-0.5 text-[11px] font-mono">
            {Array.from({ length: agentCount }).map((_, agentIdx) => {
              const agent = agentRef.current[agentIdx];
              const activeIdx = stationIdxByAgent[agentIdx] ?? null;
              const activeStation =
                activeIdx !== null ? stations[activeIdx] : null;
              const name = String.fromCharCode(65 + agentIdx);
              const color = tunerAgentColor(agentIdx);
              return (
                <div key={agentIdx} className="flex items-center gap-2">
                  <span
                    className="w-4 shrink-0 font-semibold"
                    style={{ color }}
                  >
                    {name}
                  </span>
                  <span className="w-16 shrink-0 text-gray-500">
                    {agent?.state ?? "—"}
                  </span>
                  <span className="flex-1 truncate text-gray-700">
                    {activeStation?.label ?? "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 pt-3">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
          Dev actions
        </p>
        <div className="flex items-center gap-1.5">
          <select
            value={devAgentIdx}
            onChange={(e) => setDevAgentIdx(Number(e.target.value))}
            className="flex-1 min-w-0 px-2 py-1 rounded-md text-[11px] bg-white text-black border border-gray-300 hover:border-black focus:outline-none focus:border-black"
          >
            {Array.from({ length: agentCount }).map((_, i) => (
              <option key={i} value={i}>
                Agent {String.fromCharCode(65 + i)}
              </option>
            ))}
          </select>
          <button
            onClick={() => onDevAction(devAgentIdx, "dance")}
            className="px-2 py-1 rounded-md text-[11px] bg-white border border-gray-300 hover:border-black shrink-0"
            title="Dance hold (5s, 🏆 emoji)"
          >
            💃
          </button>
          <button
            onClick={() => onDevAction(devAgentIdx, "emoji")}
            className="px-2 py-1 rounded-md text-[11px] bg-white border border-gray-300 hover:border-black shrink-0"
            title="Random celebration emoji"
          >
            🎉
          </button>
          <button
            onClick={() => onDevAction(devAgentIdx, "slump")}
            className="px-2 py-1 rounded-md text-[11px] bg-white border border-gray-300 hover:border-black shrink-0"
            title="Failure slump (❌ + 30s couch hold)"
          >
            ❌
          </button>
          <button
            onClick={() => onDevAction(devAgentIdx, "talk")}
            className="px-2 py-1 rounded-md text-[11px] bg-white border border-gray-300 hover:border-black shrink-0"
            title="Talk with nearest agent (≤150px)"
          >
            💬
          </button>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">
          Legend
        </p>
        <p className="text-[11px] text-gray-600 leading-relaxed">
          Each agent renders in its assigned color; the debug marker
          (position + facing + stand point) matches that color.
        </p>
      </div>
    </div>
  );
}

// ── Nav-tune panel ─────────────────────────────────────────────────────────
// Per-type sliders that shift the nav-grid block for the selected type.
// Lets us dial each item type's red-overlay rectangle until it sits on top
// of the visible mesh.
function NavTunePanel({
  navOverrides,
  setNavOverrides,
}: {
  navOverrides: Record<string, NavAnchorOverride>;
  setNavOverrides: (
    updater:
      | Record<string, NavAnchorOverride>
      | ((prev: Record<string, NavAnchorOverride>) => Record<string, NavAnchorOverride>),
  ) => void;
}) {
  const [pickedType, setPickedType] = useState<string>(NAV_TUNABLE_TYPES[0] ?? "");
  const [copied, setCopied] = useState(false);

  if (!pickedType) return null;
  const ov = navOverrides[pickedType] ?? {};
  const baseTypePad = ITEM_METADATA[pickedType]?.navPadding ?? 15;
  const dx = ov.dx ?? 0;
  const dy = ov.dy ?? 0;
  const padX = ov.padX ?? baseTypePad;
  const padY = ov.padY ?? baseTypePad;

  const updateField = (key: keyof NavAnchorOverride, value: number) => {
    setNavOverrides((prev) => ({
      ...prev,
      [pickedType]: { ...(prev[pickedType] ?? {}), [key]: value },
    }));
  };

  const resetType = () => {
    setNavOverrides((prev) => {
      const next = { ...prev };
      delete next[pickedType];
      return next;
    });
  };

  const copyAll = async () => {
    const json = JSON.stringify(navOverrides, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard may not be available — fall back to console.
      // eslint-disable-next-line no-console
      console.log("[nav-tune] overrides:", json);
    }
  };

  const dirtyTypes = Object.keys(navOverrides).length;

  return (
    <div className="border-t border-gray-200 pt-3">
      <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
        Nav tune ({dirtyTypes} edited)
      </p>
      <select
        value={pickedType}
        onChange={(e) => setPickedType(e.target.value)}
        className="w-full px-2 py-1 rounded-md text-[11px] bg-white text-black border border-gray-300 hover:border-black focus:outline-none focus:border-black mb-2"
      >
        {NAV_TUNABLE_TYPES.map((t) => {
          const edited = navOverrides[t];
          return (
            <option key={t} value={t}>
              {edited ? "● " : ""}
              {t}
            </option>
          );
        })}
      </select>
      {(() => {
        // Bounds scale with the picked item's footprint so big items like
        // round_table (120x120) get usable headroom while tiny items don't
        // expose absurd ranges.
        const fp = ITEM_FOOTPRINT[pickedType];
        const maxDim = fp ? Math.max(fp[0], fp[1]) : 40;
        const offsetCap = Math.max(100, Math.round(maxDim * 1.5));
        const padCap = Math.max(80, Math.round(maxDim * 0.6));
        return (
          <div className="flex flex-col gap-1.5">
            <Slider
              label="offset x"
              value={dx}
              min={-offsetCap}
              max={offsetCap}
              step={1}
              onChange={(v) => updateField("dx", v)}
            />
            <Slider
              label="offset y"
              value={dy}
              min={-offsetCap}
              max={offsetCap}
              step={1}
              onChange={(v) => updateField("dy", v)}
            />
            <Slider
              label="pad x"
              value={padX}
              min={-30}
              max={padCap}
              step={1}
              onChange={(v) => updateField("padX", v)}
            />
            <Slider
              label="pad y"
              value={padY}
              min={-30}
              max={padCap}
              step={1}
              onChange={(v) => updateField("padY", v)}
            />
          </div>
        );
      })()}
      <div className="mt-2 flex gap-2">
        <button
          onClick={resetType}
          className="flex-1 px-2 py-1 rounded-md text-[11px] bg-white text-gray-600 border border-gray-300 hover:bg-gray-100"
          title="Drop overrides for this type — falls back to defaults"
        >
          reset {pickedType}
        </button>
        <button
          onClick={copyAll}
          className="flex-1 px-2 py-1 rounded-md text-[11px] bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700"
          title="Copy the full overrides map as JSON for pasting into NAV_ANCHOR_OVERRIDES"
        >
          {copied ? "copied!" : "copy json"}
        </button>
      </div>
    </div>
  );
}
