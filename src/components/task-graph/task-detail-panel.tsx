'use client';

import { useAppStore } from '@/stores/app-store';
import { StatusDot } from '@/components/ui/status-dot';
import { X, GitCommit, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

interface TaskDetailPanelProps {
  taskId: string;
  onClose: () => void;
}

export function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
  const { getTaskById, getAgentById, tasks, approveTask, rejectTask, updateTaskStatus } = useAppStore();
  const task = getTaskById(taskId);

  if (!task) return null;

  const agent = task.assignee ? getAgentById(task.assignee) : null;
  const deps = task.deps.map((d) => tasks.find((t) => t.id === d)).filter(Boolean);
  const dependents = tasks.filter((t) => t.deps.includes(taskId));

  return (
    <div
      className="w-80 rounded-xl border overflow-hidden shrink-0"
      style={{
        background: 'var(--color-bg-card)',
        borderColor: 'var(--color-border-subtle)',
        height: 'calc(100vh - 12rem)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
        <h3 className="text-sm font-semibold">Task Details</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100% - 50px)' }}>
        {/* Title + Status */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <StatusDot status={task.status} size="md" pulse={task.status === 'in-progress'} />
            <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{task.id}</span>
          </div>
          <h4 className="font-semibold text-sm">{task.title}</h4>
          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {task.description}
          </p>
        </div>

        {/* Meta */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--color-text-muted)' }}>Priority</span>
            <span className="font-mono font-medium">{task.priority}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--color-text-muted)' }}>Assignee</span>
            {agent ? (
              <span className="font-medium" style={{ color: agent.color }}>{agent.name}</span>
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }}>Unassigned</span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--color-text-muted)' }}>Status</span>
            <span className="capitalize">{task.status.replace('-', ' ')}</span>
          </div>
        </div>

        {/* Dependencies */}
        {deps.length > 0 && (
          <div>
            <h5 className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Depends On
            </h5>
            <div className="space-y-1">
              {deps.map((dep) => dep && (
                <div key={dep.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded" style={{ background: 'var(--color-bg-tertiary)' }}>
                  <StatusDot status={dep.status} size="sm" />
                  <span className="truncate flex-1">{dep.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dependents */}
        {dependents.length > 0 && (
          <div>
            <h5 className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Blocks
            </h5>
            <div className="space-y-1">
              {dependents.map((dep) => (
                <div key={dep.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded" style={{ background: 'var(--color-bg-tertiary)' }}>
                  <StatusDot status={dep.status} size="sm" />
                  <span className="truncate flex-1">{dep.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence */}
        <div>
          <h5 className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Evidence {task.evidence.length > 0 ? `(${task.evidence.length})` : ''}
          </h5>
          {task.evidence.length === 0 ? (
            <div className="text-xs py-3 text-center rounded" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
              No evidence yet
            </div>
          ) : (
            <div className="space-y-2">
              {task.evidence.map((ev) => (
                <div key={ev.id} className="text-xs p-2.5 rounded space-y-1" style={{ background: 'var(--color-bg-tertiary)' }}>
                  {ev.commitSha && (
                    <div className="flex items-center gap-1.5">
                      <GitCommit size={10} style={{ color: 'var(--color-accent-orange)' }} />
                      <span className="font-mono">{ev.commitSha}</span>
                    </div>
                  )}
                  {ev.testOutput && (
                    <div className="flex items-center gap-1.5">
                      {ev.testPassed ? (
                        <CheckCircle2 size={10} style={{ color: 'var(--color-accent-green)' }} />
                      ) : (
                        <XCircle size={10} style={{ color: 'var(--color-accent-red)' }} />
                      )}
                      <span style={{ color: 'var(--color-text-secondary)' }}>{ev.testOutput}</span>
                    </div>
                  )}
                  <p style={{ color: 'var(--color-text-muted)' }}>{ev.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {task.status === 'in-review' && (
          <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <button
              onClick={() => approveTask(taskId)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
            >
              <CheckCircle2 size={14} /> Approve
            </button>
            <button
              onClick={() => rejectTask(taskId, 'Needs changes')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <XCircle size={14} /> Request Changes
            </button>
          </div>
        )}
        {task.status === 'ready' && (
          <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <button
              onClick={() => updateTaskStatus(taskId, 'in-progress')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
            >
              <ArrowRight size={14} /> Start Task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
