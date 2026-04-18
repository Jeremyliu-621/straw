"use client";

import ArenaTuner from "@/components/arena-3d/tuner";

export default function ArenaTunerPage() {
  return (
    <main className="min-h-screen bg-white p-6">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-4">
          <h1 className="text-2xl font-medium tracking-tight text-black">
            Arena tuner
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Isolated dev scene. <b>seats</b> / <b>gym</b> cohorts have locked,
            hand-tuned values — don&apos;t fiddle (see LOCKED_VALUES.md).
            <b> arena</b> cohort renders the full main-arena layout; click any
            station button or anywhere on the floor to direct the agent.
          </p>
        </header>
        <ArenaTuner />
      </div>
    </main>
  );
}
