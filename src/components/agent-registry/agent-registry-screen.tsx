'use client';

import { useAppStore } from '@/stores/app-store';
import { AGENT_STATUS_COLORS } from '@/lib/types';
import { StatusDot } from '@/components/ui/status-dot';
import { Bot, Wifi, WifiOff, Zap, Shield, Clock } from 'lucide-react';

export function AgentRegistryScreen() {
  const { agents, tasks } = useAppStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agent Registry</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {agents.length} agent{agents.length !== 1 ? 's' : ''} registered
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {agents.map((agent) => {
          const agentTasks = tasks.filter((t) => t.assignee === agent.id);
          const completedTasks = agentTasks.filter((t) => t.status === 'done').length;
          const activeTasks = agentTasks.filter((t) => t.status === 'in-progress').length;
          const reviewTasks = agentTasks.filter((t) => t.status === 'in-review').length;

          return (
            <div
              key={agent.id}
              className="rounded-xl border p-5 transition-all hover:border-white/10"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border-subtle)' }}
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${agent.color}15` }}
                >
                  <Bot size={28} style={{ color: agent.color }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold">{agent.name}</h3>
                    <StatusDot status={agent.status} type="agent" size="md" pulse={agent.status === 'working'} />
                    <span className="text-xs capitalize" style={{ color: AGENT_STATUS_COLORS[agent.status] }}>
                      {agent.status.replace('-', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>{agent.provider}</span>
                    <span className="font-mono">{agent.model}</span>
                    <span className="flex items-center gap-1">
                      {agent.connectionStatus === 'connected' ? (
                        <Wifi size={11} style={{ color: 'var(--color-accent-green)' }} />
                      ) : (
                        <WifiOff size={11} style={{ color: 'var(--color-accent-red)' }} />
                      )}
                      {agent.connectionStatus}
                    </span>
                  </div>

                  {/* Capabilities */}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {agent.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 shrink-0">
                  <div className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <Zap size={12} style={{ color: 'var(--color-accent-amber)' }} />
                      <span className="text-lg font-bold">{activeTasks}</span>
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Active</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <Clock size={12} style={{ color: 'var(--color-accent-purple)' }} />
                      <span className="text-lg font-bold">{reviewTasks}</span>
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Review</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <Shield size={12} style={{ color: 'var(--color-accent-green)' }} />
                      <span className="text-lg font-bold">{completedTasks}</span>
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Done</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Coming soon sections */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className="rounded-xl border border-dashed p-6 text-center"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          <Shield size={24} className="mx-auto mb-2" />
          <p className="text-sm font-medium mb-1">Access Controls</p>
          <p className="text-xs">Identity rules, repo permissions — coming in MVP</p>
        </div>
        <div
          className="rounded-xl border border-dashed p-6 text-center"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          <Zap size={24} className="mx-auto mb-2" />
          <p className="text-sm font-medium mb-1">Cost Tracking</p>
          <p className="text-xs">Per-agent token usage and cost — coming in MVP</p>
        </div>
      </div>
    </div>
  );
}
