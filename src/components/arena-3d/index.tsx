"use client";

import dynamic from "next/dynamic";

const ArenaCanvas = dynamic(() => import("./ArenaCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[16/10] bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-sans">Loading arena...</p>
      </div>
    </div>
  ),
});

export default ArenaCanvas;
