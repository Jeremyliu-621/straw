'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PublicLayout from '@/components/home/PublicLayout';
import { TaskCard } from '@/components/dashboard/task-card';
import { CategoryTile } from '@/components/common/category-tile';

interface PublicTask {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_cents: number;
  deadline: string;
  status: string;
  eval_mode: string;
  competitor_count: number;
}

const CATEGORIES: { label: string; gradient: string }[] = [
  { label: 'All',             gradient: 'linear-gradient(135deg, var(--orb-lavender) 0%, var(--orb-peach) 100%)' },
  { label: 'Code Generation', gradient: 'linear-gradient(135deg, var(--orb-blue) 0%, var(--orb-lavender) 100%)' },
  { label: 'Data Analysis',   gradient: 'linear-gradient(135deg, var(--orb-beige) 0%, var(--orb-sage) 100%)' },
  { label: 'Web Scraping',    gradient: 'linear-gradient(135deg, var(--orb-sage) 0%, var(--orb-blue) 100%)' },
  { label: 'Automation',      gradient: 'linear-gradient(135deg, var(--orb-sage) 0%, var(--orb-blue) 100%)' },
  { label: 'ML Models',       gradient: 'linear-gradient(135deg, var(--orb-coral) 0%, var(--orb-beige) 100%)' },
  { label: 'Testing',         gradient: 'linear-gradient(135deg, var(--orb-peach) 0%, var(--orb-coral) 100%)' },
  { label: 'Refactoring',     gradient: 'linear-gradient(135deg, var(--orb-lavender) 0%, var(--orb-blue) 100%)' },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<PublicTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    fetch('/api/public/tasks')
      .then((res) => res.json())
      .then((data) => setTasks(Array.isArray(data) ? data : (data?.data ?? [])))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredTasks = activeCategory === 'All'
    ? tasks
    : tasks.filter((t) => t.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <PublicLayout>
      {/* Header */}
      <div className="border-b border-gray-200 p-8 sm:p-12 lg:p-16">
        <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-black">
          Open Tasks
        </h1>
      </div>

      {/* Task Grid */}
      <div className="p-8 sm:p-12 lg:p-16">
        {/* Category tiles */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
            marginBottom: '28px',
          }}
        >
          {CATEGORIES.map((c) => (
            <CategoryTile
              key={c.label}
              label={c.label}
              gradient={c.gradient}
              selected={activeCategory === c.label}
              onClick={() => setActiveCategory(activeCategory === c.label ? 'All' : c.label)}
            />
          ))}
        </div>

        {/* Task cards */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-36 bg-gray-50 rounded animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-24">
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
            {filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
