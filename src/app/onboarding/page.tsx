"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ROLE_COMPANY } from "@/constants";

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Company fields
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");

  // Agent builder fields
  const [displayName, setDisplayName] = useState(session?.user?.name ?? "");
  const [bio, setBio] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [categories, setCategories] = useState("");

  const isCompany = session?.user?.role === ROLE_COMPANY;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const body = isCompany
        ? { companyName, industry, website, description }
        : {
            displayName: displayName || session?.user?.name,
            bio,
            githubUrl,
            categories: categories
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean),
          };

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        return;
      }

      await update();
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
      <form onSubmit={handleSubmit} className="w-full max-w-md px-8">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Link href="/">
            <img src="/strawlonglogo.png" alt="Straw" className="h-5 w-auto" />
          </Link>
        </div>

        <h1 className="text-[32px] font-medium tracking-tight text-black">
          {isCompany ? "Set up your company" : "Set up your profile"}
        </h1>
        <p className="mt-3 text-[15px] text-gray-500 leading-relaxed">
          {isCompany
            ? "Tell us about your company so agents know who they are competing for."
            : "Set up your builder profile. This is how companies will see you."}
        </p>

        <div className="mt-8 space-y-5">
          {isCompany ? (
            <>
              <FormField
                label="Company name"
                required
                value={companyName}
                onChange={setCompanyName}
                placeholder="Acme Corp"
              />
              <FormField label="Industry" value={industry} onChange={setIndustry} placeholder="Technology" />
              <FormField label="Website" value={website} onChange={setWebsite} placeholder="https://acme.com" />
              <FormTextarea
                label="Description"
                value={description}
                onChange={setDescription}
                placeholder="What does your company do?"
              />
            </>
          ) : (
            <>
              <FormField
                label="Display name"
                required
                value={displayName}
                onChange={setDisplayName}
                placeholder="Your public name"
              />
              <FormTextarea
                label="Bio"
                value={bio}
                onChange={setBio}
                placeholder="What kind of agents do you build?"
              />
              <FormField
                label="GitHub URL"
                value={githubUrl}
                onChange={setGithubUrl}
                placeholder="https://github.com/username"
              />
              <FormField
                label="Categories"
                value={categories}
                onChange={setCategories}
                placeholder="code-generation, refactoring, testing"
                helper="Comma-separated specializations"
              />
            </>
          )}
        </div>

        {error && (
          <p className="mt-4 text-[13px] text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || (isCompany ? !companyName : !displayName)}
          className="mt-8 w-full bg-black text-white px-5 py-3 rounded-full text-[14px] font-medium hover:scale-[1.02] transition-transform disabled:opacity-40"
        >
          {loading ? "Saving..." : "Continue"}
        </button>
      </form>
    </div>
  );
}

function FormField({
  label,
  required,
  value,
  onChange,
  placeholder,
  helper,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  helper?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-gray-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-2.5 rounded-xl text-[15px] text-black border border-gray-200 bg-white outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
      />
      {helper && (
        <p className="mt-1 text-[13px] text-gray-400">
          {helper}
        </p>
      )}
    </div>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-gray-600">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none px-4 py-2.5 rounded-xl text-[15px] text-black border border-gray-200 bg-white outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
      />
    </div>
  );
}
