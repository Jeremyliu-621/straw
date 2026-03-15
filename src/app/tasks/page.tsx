'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PublicLayout from '@/components/home/PublicLayout';

interface PublicTask {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_cents: number;
  deadline: string;
  status: string;
  competitor_count: number;
}

function formatBudget(cents: number): string {
  return `$${(cents / 100).toLocaleString()}`;
}

function formatDeadline(deadline: string): string {
  const d = new Date(deadline);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Closed';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day left';
  return `${diffDays} days left`;
}

const CATEGORIES = ['All', 'Code Generation', 'Data Analysis', 'Web Scraping', 'Automation', 'ML Models', 'Testing', 'Refactoring'];

export default function TasksPage() {
  const [tasks, setTasks] = useState<PublicTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    fetch('/api/public/tasks')
      .then((res) => res.json())
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredTasks = activeCategory === 'All'
    ? tasks
    : tasks.filter((t) => t.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <PublicLayout>
      {/* Header */}
      <div className="w-full border-b border-gray-200">
        <div className="w-full max-w-[1400px] mx-auto border-x border-gray-200 p-8 sm:p-12 lg:p-16">
          <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-black">
            Open Tasks
          </h1>
          <p className="mt-4 text-[#646464] text-[16px] leading-relaxed max-w-[500px]">
            Browse active competitions. Sign in to compete and win contracts.
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="w-full border-b border-gray-200">
        <div className="w-full max-w-[1400px] mx-auto border-x border-gray-200 px-8 sm:px-12 lg:px-16 py-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-black'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="w-full">
        <div className="w-full max-w-[1400px] mx-auto border-x border-gray-200">
          {loading ? (
            <div className="p-8 sm:p-12 lg:p-16 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-8 sm:p-12 lg:p-16 text-center py-24">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-black mb-2">No open tasks</h3>
              <p className="text-gray-500 text-[15px] mb-8">
                {activeCategory !== 'All'
                  ? `No tasks in "${activeCategory}" right now. Try a different category.`
                  : 'Check back soon for new competitions.'}
              </p>
              <Link
                href="/auth/signin"
                className="inline-block bg-black text-white px-7 py-3 rounded-full text-[14px] font-medium hover:scale-105 transition-transform"
              >
                Post the First Task
              </Link>
            </div>
          ) : (
            <div>
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="border-b border-gray-200 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="p-6 sm:p-8 lg:px-16 lg:py-8">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-[12px] font-medium text-gray-600">
                            {task.category}
                          </span>
                          <span className="text-[13px] text-gray-400">
                            {task.competitor_count} competitor{task.competitor_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <h3 className="text-[18px] font-medium text-black mb-2 truncate">
                          {task.title}
                        </h3>
                        <p className="text-[14px] text-gray-500 leading-relaxed line-clamp-2">
                          {task.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-6 lg:gap-8 shrink-0">
                        <div className="text-right">
                          <p className="text-[13px] text-gray-400 mb-1">Budget</p>
                          <p className="text-[18px] font-medium text-black font-mono">
                            {formatBudget(task.budget_cents)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[13px] text-gray-400 mb-1">Deadline</p>
                          <p className="text-[15px] font-medium text-black">
                            {formatDeadline(task.deadline)}
                          </p>
                        </div>
                        <Link
                          href="/auth/signin"
                          className="bg-black text-white px-6 py-2.5 rounded-full text-[13px] font-medium hover:scale-105 transition-transform shrink-0"
                        >
                          Compete
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
