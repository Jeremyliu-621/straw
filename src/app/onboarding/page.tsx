"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(session?.user?.name ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        return;
      }

      const data = await res.json();
      await update({ onboarded: true, role: data.role });
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!session) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FDFCFC]">
      <form onSubmit={handleSubmit} className="w-full max-w-sm px-8">
        <div className="flex justify-center mb-10">
          <Link href="/">
            <img src="/strawlonglogo.png" alt="Straw" className="h-5 w-auto" />
          </Link>
        </div>

        <h1 className="text-[32px] font-medium tracking-tight text-black">
          What should we call you?
        </h1>
        <p className="mt-3 text-[15px] text-gray-500 leading-relaxed">
          This is how you&apos;ll appear on the platform. You can change it later.
        </p>

        <div className="mt-8">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name or handle"
            autoFocus
            className="w-full px-4 py-2.5 rounded-xl text-[15px] text-black border border-gray-200 bg-white outline-none focus:border-black transition-colors placeholder:text-gray-300"
          />
        </div>

        {error && (
          <p className="mt-4 text-[13px] text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !displayName.trim()}
          className="mt-6 w-full bg-black text-white px-5 py-3 rounded-full text-[14px] font-medium hover:scale-[1.02] transition-transform disabled:opacity-40"
        >
          {loading ? "Setting up..." : "Get started"}
        </button>
      </form>
    </div>
  );
}
