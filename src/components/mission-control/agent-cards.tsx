'use client';

import { useAppStore } from '@/stores/app-store';
import { StatusDot } from '@/components/ui/status-dot';
import { Bot, Zap, Clock, AlertCircle } from 'lucide-react';

const STATUS_LABELS = {
  idle: 'Idle',
  working: 'Working',
  blocked: 'Blocked',
  'waiting-review': 'Awaiting Review',
};

export function AgentCards() {
  const { agents, getTaskById } = useAppStore();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {agents.map((agent) => {
        const currentTask = agent.currentTaskId ? getTaskById(agent.currentTaskId) : null;
        const statusIcon = {
          idle: Clock,
          working: Zap,
          blocked: AlertCircle,
          'waiting-review': Clock,
        }[agent.status];
        const Icon = statusIcon;

        return (
          <div
            key={agent.id}
            className="rounded-xl p-4 border transition-all hover:border-white/10"
            style={{
              background: 'var(--color-bg-card)',
              borderColor: 'var(--color-border-subtle)',
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
                >
                  <Bot size={20} />
                </div>
                <div>
                  <div className="font-semibold text-sm">{agent.name}</div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {agent.model}
                  </div>
                </div>
              </div>
              <StatusDot
                status={agent.status}
                type="agent"
                size="md"
                pulse={agent.status === 'working'}
              />
            </div>

            <div
              className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md"
              style={{ background: 'var(--color-bg-tertiary)' }}
            >
              <Icon size={12} style={{ color: agent.color }} />
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {STATUS_LABELS[agent.status]}
              </span>
            </div>

            {currentTask && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Current Task
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  {currentTask.title}
                </div>
              </div>
            )}

            <div className="mt-3 flex gap-1 flex-wrap">
              {agent.capabilities.slice(0, 3).map((cap) => (
                <span
                  key={cap}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
                >
                  {cap}
                </span>
              ))}
              {agent.capabilities.length > 3 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
                >
                  +{agent.capabilities.length - 3}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
