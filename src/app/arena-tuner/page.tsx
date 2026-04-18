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
            Isolated dev scene for tuning seat / couch / station alignment math.
            One agent, a few stations. Click a station button to send the agent
            there; observe position, facing, and the resulting pose.
          </p>
        </header>
        <ArenaTuner />
      </div>
    </main>
  );
}
