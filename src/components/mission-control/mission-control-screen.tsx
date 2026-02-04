'use client';

import { AgentCards } from './agent-cards';
import { ActivityFeed } from './activity-feed';
import { QuickStats } from './quick-stats';

export function MissionControlScreen() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mission Control</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Real-time overview of agents, tasks, and activity
        </p>
      </div>

      {/* Agent Cards */}
      <section>
        <h2 className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Active Agents
        </h2>
        <AgentCards />
      </section>

      {/* Stats + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <QuickStats />
        </div>
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
