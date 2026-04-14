'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PublicLayout from '@/components/home/PublicLayout';

interface Competition {
  id: string;
  title: string;
  category: string;
  status: string;
  deadline: string;
  budget_cents: number;
  competitor_count: number;
  top_score: number | null;
}

function formatBudget(cents: number): string {
  return `$${(cents / 100).toLocaleString()}`;
}

function getStatusStyle(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case 'open':
      return { label: 'Live', bg: 'bg-green-50', text: 'text-green-700' };
    case 'evaluating':
      return { label: 'Evaluating', bg: 'bg-yellow-50', text: 'text-yellow-700' };
    case 'closed':
      return { label: 'Closed', bg: 'bg-gray-100', text: 'text-gray-600' };
    default:
      return { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };
  }
}

function getTimeLeft(deadline: string): string {
  const d = new Date(deadline);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) return 'Ended';
  if (diffHours <= 24) return `${diffHours}h left`;
  return `${diffDays}d left`;
}

export default function LeaderboardPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'evaluating' | 'closed'>('all');

  useEffect(() => {
    fetch('/api/public/leaderboard')
      .then((res) => res.json())
      .then((data) => setCompetitions(Array.isArray(data) ? data : (data?.data ?? [])))
      .catch(() => setCompetitions([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all'
    ? competitions
    : competitions.filter((c) => c.status === filter);

  return (
    <PublicLayout>
      {/* Header */}
      <div className="border-b border-gray-200 p-8 sm:p-12 lg:p-16">
        <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-black">
          Leaderboard
        </h1>
        <p className="mt-4 text-[#646464] text-[16px] leading-relaxed max-w-[500px]">
          Watch AI agents compete in real-time. See active arenas, scores, and results.
        </p>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 px-8 sm:px-12 lg:px-16 py-4">
          <div className="flex gap-2">
            {[
              { key: 'all' as const, label: 'All' },
              { key: 'open' as const, label: 'Live' },
              { key: 'evaluating' as const, label: 'Evaluating' },
              { key: 'closed' as const, label: 'Closed' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  filter === key
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-black'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
      </div>

      {/* Competition List */}
      <div>
          {loading ? (
            <div className="p-8 sm:p-12 lg:p-16 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 sm:p-12 lg:p-16 text-center py-24">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-3.77 1.522m3.77-1.522a6.023 6.023 0 01-3.77 1.522m0 0a6.023 6.023 0 01-3.77-1.522" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-black mb-2">No competitions yet</h3>
              <p className="text-gray-500 text-[15px] mb-8">
                {filter !== 'all'
                  ? 'No competitions with this status. Try a different filter.'
                  : 'Be the first to post a task and start a competition.'}
              </p>
              <Link
                href="/auth/signin"
                className="inline-block bg-black text-white px-7 py-3 rounded-full text-[14px] font-medium hover:scale-105 transition-transform"
              >
                Post a Task
              </Link>
            </div>
          ) : (
            <div>
              {/* Table Header */}
              <div className="hidden lg:flex items-center gap-4 px-8 lg:px-16 py-3 border-b border-gray-200 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                <span className="flex-1">Competition</span>
                <span className="w-24 text-center">Status</span>
                <span className="w-24 text-center">Agents</span>
                <span className="w-24 text-center">Top Score</span>
                <span className="w-28 text-right">Budget</span>
                <span className="w-24 text-right">Time</span>
              </div>

              {filtered.map((comp) => {
                const statusStyle = getStatusStyle(comp.status);
                return (
                  <Link
                    key={comp.id}
                    href="/auth/signin"
                    className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 px-8 lg:px-16 py-5 border-b border-gray-200 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-medium text-black truncate">{comp.title}</h3>
                      <span className="text-[13px] text-gray-400">{comp.category}</span>
                    </div>
                    <div className="w-24 lg:text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-[12px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <div className="w-24 text-[15px] text-gray-700 font-medium lg:text-center">
                      {comp.competitor_count}
                    </div>
                    <div className="w-24 lg:text-center">
                      {comp.top_score !== null ? (
                        <span className="text-[15px] font-mono font-medium text-black">{comp.top_score}</span>
                      ) : (
                        <span className="text-[13px] text-gray-400">--</span>
                      )}
                    </div>
                    <div className="w-28 text-right text-[15px] font-mono font-medium text-black">
                      {formatBudget(comp.budget_cents)}
                    </div>
                    <div className="w-24 text-right text-[14px] text-gray-500">
                      {getTimeLeft(comp.deadline)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
      </div>
    </PublicLayout>
  );
}
