'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { StatusDot } from '@/components/ui/status-dot';
import { DiffViewer } from './diff-viewer';
import { CheckCircle2, XCircle, Eye, GitCommit, Clock } from 'lucide-react';

export function ReviewQueueScreen() {
  const { tasks, agents, approveTask, rejectTask } = useAppStore();
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  const reviewTasks = tasks.filter((t) => t.status === 'in-review');
  const selectedTask = selectedReviewId ? tasks.find((t) => t.id === selectedReviewId) : reviewTasks[0];

  const agent = selectedTask?.assignee ? agents.find((a) => a.id === selectedTask.assignee) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {reviewTasks.length} task{reviewTasks.length !== 1 ? 's' : ''} awaiting review
          </p>
        </div>
        {reviewTasks.length > 1 && (
          <button
            onClick={() => {
              reviewTasks.forEach((t) => approveTask(t.id));
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
          >
            <CheckCircle2 size={14} /> Approve All ({reviewTasks.length})
          </button>
        )}
      </div>

      {reviewTasks.length === 0 ? (
        <div
          className="rounded-xl border p-12 text-center"
          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border-subtle)' }}
        >
          <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: 'var(--color-accent-green)' }} />
          <h2 className="text-lg font-semibold mb-1">All clear!</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No tasks awaiting review. Agents are still working.
          </p>
        </div>
      ) : (
        <div className="flex gap-4" style={{ height: 'calc(100vh - 12rem)' }}>
          {/* Review List */}
          <div
            className="w-72 shrink-0 rounded-xl border overflow-hidden"
            style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border-subtle)' }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Eye size={14} style={{ color: 'var(--color-accent-purple)' }} />
                Pending Reviews
              </h3>
            </div>
            <div className="divide-y overflow-y-auto" style={{ borderColor: 'var(--color-border-subtle)' }}>
              {reviewTasks.map((task) => {
                const taskAgent = task.assignee ? agents.find((a) => a.id === task.assignee) : null;
                const isSelected = selectedTask?.id === task.id;
                return (
                  <button
                    key={task.id}
                    onClick={() => setSelectedReviewId(task.id)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      isSelected ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <StatusDot status={task.status} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{task.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {taskAgent && (
                            <span className="text-[10px]" style={{ color: taskAgent.color }}>
                              {taskAgent.name}
                            </span>
                          )}
                          <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                            <Clock size={9} /> 2h ago
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Review Detail */}
          {selectedTask && (
            <div className="flex-1 flex flex-col gap-4">
              {/* Task header */}
              <div
                className="rounded-xl border p-4"
                style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border-subtle)' }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold">{selectedTask.title}</h2>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {selectedTask.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {agent && (
                        <span className="text-xs flex items-center gap-1.5" style={{ color: agent.color }}>
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ backgroundColor: `${agent.color}20` }}>
                            {agent.name[0]}
                          </span>
                          {agent.name} ({agent.model})
                        </span>
                      )}
                      {selectedTask.evidence.length > 0 && selectedTask.evidence[0].commitSha && (
                        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                          <GitCommit size={12} /> {selectedTask.evidence[0].commitSha}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveTask(selectedTask.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                    >
                      <CheckCircle2 size={14} /> Approve
                    </button>
                    <button
                      onClick={() => rejectTask(selectedTask.id, 'Needs changes')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <XCircle size={14} /> Changes
                    </button>
                  </div>
                </div>

                {/* Evidence */}
                {selectedTask.evidence.length > 0 && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <h4 className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                      Evidence
                    </h4>
                    {selectedTask.evidence.map((ev) => (
                      <div key={ev.id} className="flex items-center gap-3 text-xs">
                        {ev.testPassed !== undefined && (
                          <span className="flex items-center gap-1">
                            {ev.testPassed ? (
                              <CheckCircle2 size={12} style={{ color: 'var(--color-accent-green)' }} />
                            ) : (
                              <XCircle size={12} style={{ color: 'var(--color-accent-red)' }} />
                            )}
                            <span style={{ color: 'var(--color-text-secondary)' }}>{ev.testOutput}</span>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Diff viewer */}
              <div className="flex-1 overflow-hidden">
                <DiffViewer taskId={selectedTask.id} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
