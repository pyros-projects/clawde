'use client';

import { useAppStore } from '@/stores/app-store';
import { TaskStatus } from '@/lib/types';
import { CheckCircle2, Clock, Eye, AlertTriangle, Circle, Users } from 'lucide-react';

const STAT_CONFIG: { status: TaskStatus; label: string; icon: React.ElementType; colorVar: string }[] = [
  { status: 'done', label: 'Done', icon: CheckCircle2, colorVar: 'var(--color-status-done)' },
  { status: 'in-progress', label: 'In Progress', icon: Clock, colorVar: 'var(--color-status-in-progress)' },
  { status: 'in-review', label: 'In Review', icon: Eye, colorVar: 'var(--color-status-in-review)' },
  { status: 'blocked', label: 'Blocked', icon: AlertTriangle, colorVar: 'var(--color-status-blocked)' },
  { status: 'ready', label: 'Ready', icon: Circle, colorVar: 'var(--color-status-ready)' },
];

export function QuickStats() {
  const { tasks, agents } = useAppStore();
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const activeAgents = agents.filter((a) => a.connectionStatus === 'connected').length;

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: 'var(--color-bg-card)',
        borderColor: 'var(--color-border-subtle)',
      }}
    >
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Progress</h3>
        <span className="text-2xl font-bold" style={{ color: 'var(--color-accent-cyan)' }}>
          {pct}%
        </span>
      </div>
      <div className="w-full h-2 rounded-full mb-4" style={{ background: 'var(--color-bg-tertiary)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--color-accent-cyan), var(--color-accent-purple))',
          }}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {STAT_CONFIG.map(({ status, label, icon: Icon, colorVar }) => {
          const count = tasks.filter((t) => t.status === status).length;
          return (
            <div key={status} className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Icon size={12} style={{ color: colorVar }} />
                <span className="text-lg font-bold" style={{ color: colorVar }}>
                  {count}
                </span>
              </div>
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {label}
              </div>
            </div>
          );
        })}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Users size={12} style={{ color: 'var(--color-accent-orange)' }} />
            <span className="text-lg font-bold" style={{ color: 'var(--color-accent-orange)' }}>
              {activeAgents}
            </span>
          </div>
          <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            Agents
          </div>
        </div>
      </div>
    </div>
  );
}
