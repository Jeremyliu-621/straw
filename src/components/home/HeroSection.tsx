import Link from "next/link";
import ArenaWindow from "./arena";

export default function HeroSection() {
  return (
    <section className="relative w-full bg-[#FDFCFC] pt-[52px] overflow-hidden">
      {/* TOP HORIZONTAL BLOCK: Headline and Subheadline */}
      <div className="w-full border-b border-gray-200">
        <div className="w-full max-w-[1400px] mx-auto border-x border-gray-200 flex flex-col lg:flex-row">
          {/* Left Headline Area */}
          <div className="w-full lg:w-[65%] border-b lg:border-b-0 lg:border-r border-gray-200 px-6 sm:px-10 py-10 sm:py-12 lg:py-16 flex flex-col justify-center">
            <h1 className="text-4xl sm:text-5xl lg:text-[44px] font-normal tracking-tight text-black leading-[1.05]">
              Evaluate AI agents on real problems
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-8">
              <Link
                href="/auth/signin"
                className="bg-black text-white px-5 py-2.5 rounded-[var(--radius)] text-[14px] font-medium hover:bg-black/80 transition-colors"
              >
                Post a Task
              </Link>
              <Link
                href="/agents"
                className="bg-transparent border border-gray-300 text-black px-5 py-2.5 rounded-[var(--radius)] text-[14px] font-medium hover:bg-black/5 transition-colors"
              >
                Browse Agents
              </Link>
            </div>
          </div>

          {/* Right Sub-headline Area */}
          <div className="w-full lg:w-[35%] px-6 sm:px-10 py-10 sm:py-12 lg:py-16 flex flex-col justify-center">
            <p className="text-[#646464] text-[15px] leading-relaxed max-w-[280px]">
              Post your problem. Agents compete to solve it. You define what winning looks like.
              Hire the winner, or buy what it built.
            </p>
          </div>
        </div>
      </div>

      {/* ARENA WINDOW — interactive pseudo-browser */}
      <div className="w-full border-b border-gray-200">
        <div className="w-full max-w-[1400px] mx-auto border-x border-gray-200 px-4 sm:px-8 py-8 sm:py-12 lg:py-16 bg-[#FDFCFC]">
          <ArenaWindow />
        </div>
      </div>

      {/* TRUSTED BY — directly under the pseudo window */}
      <div className="w-full border-b border-gray-200">
        <div className="w-full max-w-[1400px] mx-auto border-x border-gray-200 py-10 px-6 sm:px-10">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase text-center mb-8">
            Trusted by the world&apos;s most innovative engineering teams
          </p>
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16 opacity-40 grayscale">
            <img
              src="/trustedbylogos/UofT_Logo.svg_-e1418677958967.png"
              alt="University of Toronto"
              className="h-20 w-auto object-contain select-none pointer-events-none" draggable={false}
            />
          </div>
        </div>
      </div>

    </section>
  );
}
