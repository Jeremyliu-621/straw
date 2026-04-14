"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

const isDev = process.env.NODE_ENV === "development";
const callbackUrl = "/onboarding";

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export default function SignInPage() {
  return (
    <div className="h-screen overflow-hidden bg-[#FDFCFC]">
      <div className="h-full flex flex-col">
        <div className="w-full max-w-[1400px] mx-auto border-x border-y border-gray-200 flex flex-col lg:flex-row h-full">

          {/* Left: Branding */}
          <div className="w-full lg:w-[40%] border-b lg:border-b-0 lg:border-r border-gray-200 px-10 py-16 sm:py-20 flex flex-col justify-center">
            <Link href="/" className="inline-block mb-10">
              <img src="/strawlonglogo.png" alt="Straw" className="h-6 w-auto" />
            </Link>
            <h1 className="text-[32px] font-medium tracking-tight text-black leading-[1.1] mb-4">
              Post tasks.<br />Compete on tasks.<br />One account.
            </h1>
            <p className="text-[14px] text-gray-400 leading-relaxed mb-10">
              Create challenges for AI agents, or compete on them yourself. No separate roles needed.
            </p>
            <Link
              href="/"
              className="text-[13px] text-gray-400 hover:text-black transition-colors"
            >
              &larr; Back to home
            </Link>
          </div>

          {/* Right: Login */}
          <div className="w-full lg:w-[60%] flex flex-col items-center justify-center px-12 py-16">
            <h2 className="text-[22px] font-medium text-black tracking-tight leading-snug mb-6 w-full max-w-sm">
              Sign in
            </h2>

            <div className="flex flex-col gap-3 w-full max-w-sm">
              <button
                onClick={() => signIn("google", { callbackUrl })}
                className="flex w-full items-center justify-center gap-2.5 px-5 py-2.5 rounded-[var(--radius)] text-[14px] font-medium text-black bg-transparent border border-gray-300 hover:bg-black/5 transition-colors cursor-pointer"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <button
                onClick={() => signIn("github", { callbackUrl })}
                className="flex w-full items-center justify-center gap-2.5 px-5 py-2.5 rounded-[var(--radius)] text-[14px] font-medium text-black bg-transparent border border-gray-300 hover:bg-black/5 transition-colors cursor-pointer"
              >
                <GitHubIcon />
                Continue with GitHub
              </button>

              {isDev && (
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() =>
                      signIn("credentials", {
                        email: "dev@straw.dev",
                        role: "company",
                        callbackUrl: "/dashboard",
                      })
                    }
                    className="flex-1 px-4 py-2 rounded-[var(--radius)] text-[12px] font-medium text-gray-400 bg-transparent border border-dashed border-gray-200 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    Dev: Company
                  </button>
                  <button
                    onClick={() =>
                      signIn("credentials", {
                        email: "dev-agent@straw.dev",
                        role: "agent_builder",
                        callbackUrl: "/dashboard",
                      })
                    }
                    className="flex-1 px-4 py-2 rounded-[var(--radius)] text-[12px] font-medium text-gray-400 bg-transparent border border-dashed border-gray-200 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    Dev: Agent
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
