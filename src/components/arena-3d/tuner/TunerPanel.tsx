"use client";

import type { RenderAgentState } from "../useArenaGameLoop";
import type {
  Cohort,
  Station,
  TuningParams,
  GymTuningParams,
} from "./TunerScene";

interface TunerPanelProps {
  cohort: Cohort;
  setCohort: (c: Cohort) => void;
  stationIdx: number | null;
  stations: Station[];
  tuning: TuningParams;
  setTuning: (updater: (prev: TuningParams) => TuningParams) => void;
  gymTuning: GymTuningParams;
  setGymTuning: (updater: (prev: GymTuningParams) => GymTuningParams) => void;
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
  stationIdx,
  stations,
  tuning,
  setTuning,
  gymTuning,
  setGymTuning,
  onGoto,
  onReset,
  agentRef,
}: TunerPanelProps) {
  const agent = agentRef.current[0];
  const activeStation = stationIdx !== null ? stations[stationIdx] : null;

  const setSeatsField = (key: keyof TuningParams, value: number) => {
    setTuning((prev) => ({ ...prev, [key]: value }));
  };
  const setGymField = (key: keyof GymTuningParams, value: number) => {
    setGymTuning((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col gap-3 p-4 text-sm font-mono bg-gray-50 rounded-lg min-w-[340px] max-w-[360px] border border-gray-200 max-h-[700px] overflow-y-auto">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
          Cohort
        </p>
        <div className="flex gap-2">
          {(["seats", "gym", "arena"] as Cohort[]).map((c) => (
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
        <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
          Send agent to…
        </p>
        <div className="flex flex-wrap gap-2">
          {stations.map((s, i) => (
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
          <dt className="text-gray-500">workoutStyle</dt>
          <dd>{agent?.workoutStyle ?? "—"}</dd>
          <dt className="text-gray-500">sitBack</dt>
          <dd>{fmt(agent?.sitBackOverride)}</dd>
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
            <dt className="text-gray-500">sit back</dt>
            <dd>{activeStation.sitBack.toFixed(2)}</dd>
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
