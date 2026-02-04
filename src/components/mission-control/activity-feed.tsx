'use client';

import { useAppStore } from '@/stores/app-store';
import { Event, EventType } from '@/lib/types';
import {
  GitCommit,
  Play,
  CheckCircle2,
  Eye,
  XCircle,
  AlertTriangle,
  Plug,
  PlugZap,
  FileText,
  FolderPlus,
  Archive,
  Shield,
  Terminal,
} from 'lucide-react';

const EVENT_CONFIG: Record<EventType, { icon: React.ElementType; color: string; label: string }> = {
  'task-created': { icon: FolderPlus, color: 'var(--color-text-muted)', label: 'Created' },
  'task-claimed': { icon: Play, color: 'var(--color-accent-cyan)', label: 'Claimed' },
  'task-started': { icon: Play, color: 'var(--color-accent-amber)', label: 'Started' },
  'task-completed': { icon: CheckCircle2, color: 'var(--color-accent-green)', label: 'Completed' },
  'task-review-requested': { icon: Eye, color: 'var(--color-accent-purple)', label: 'Review Requested' },
  'task-approved': { icon: Shield, color: 'var(--color-accent-green)', label: 'Approved' },
  'task-rejected': { icon: XCircle, color: 'var(--color-accent-red)', label: 'Rejected' },
  'task-blocked': { icon: AlertTriangle, color: 'var(--color-accent-red)', label: 'Blocked' },
  'agent-connected': { icon: Plug, color: 'var(--color-accent-green)', label: 'Connected' },
  'agent-disconnected': { icon: PlugZap, color: 'var(--color-accent-red)', label: 'Disconnected' },
  commit: { icon: GitCommit, color: 'var(--color-accent-orange)', label: 'Commit' },
  'spec-updated': { icon: FileText, color: 'var(--color-accent-cyan)', label: 'Spec Updated' },
  'change-created': { icon: FolderPlus, color: 'var(--color-accent-cyan)', label: 'Change Created' },
  'change-verified': { icon: CheckCircle2, color: 'var(--color-accent-green)', label: 'Verified' },
  'change-archived': { icon: Archive, color: 'var(--color-text-muted)', label: 'Archived' },
  'chat-command': { icon: Terminal, color: 'var(--color-accent-cyan)', label: 'Command' },
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function EventItem({ event }: { event: Event }) {
  const { agents } = useAppStore();
  const config = EVENT_CONFIG[event.type];
  const Icon = config.icon;
  const agent = event.agentId ? agents.find((a) => a.id === event.agentId) : null;
  const message = (event.payload as { message?: string; sha?: string }).message ||
    (event.payload as { sha?: string }).sha || event.type;

  return (
    <div className="flex items-start gap-3 py-2.5 px-3 hover:bg-white/[0.02] rounded-lg transition-colors">
      <div className="mt-0.5">
        <Icon size={14} style={{ color: config.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {agent && (
            <span className="font-medium" style={{ color: agent.color }}>
              {agent.name}
            </span>
          )}{' '}
          <span className="truncate">{message}</span>
        </div>
        {event.type === 'commit' && (event.payload as { sha?: string }).sha && (
          <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
            {(event.payload as { sha: string }).sha.slice(0, 7)}
          </span>
        )}
      </div>
      <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--color-text-muted)' }}>
        {formatTime(event.timestamp)}
      </span>
    </div>
  );
}

export function ActivityFeed() {
  const { events } = useAppStore();
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: 'var(--color-bg-card)',
        borderColor: 'var(--color-border-subtle)',
      }}
    >
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
        <h3 className="text-sm font-semibold">Activity</h3>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Live</span>
        </div>
      </div>
      <div className="max-h-[400px] overflow-y-auto divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
        {sortedEvents.map((event) => (
          <EventItem key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
