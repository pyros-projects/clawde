'use client';

import { useAppStore } from '@/stores/app-store';
import { FileText, ChevronRight, AlertTriangle } from 'lucide-react';

const ARTIFACT_TYPES = ['proposal', 'specs', 'design', 'tasks'] as const;
const STATE_FLOW = ['implementing', 'in-review', 'verified', 'archived'] as const;

const STATE_COLORS: Record<string, string> = {
  active: 'var(--color-accent-cyan)',
  implementing: 'var(--color-accent-amber)',
  'in-review': 'var(--color-accent-purple)',
  verified: 'var(--color-accent-green)',
  archived: 'var(--color-text-muted)',
};

export function SpecStudioScreen() {
  const { changes } = useAppStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Spec Studio</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Spec-driven planning — artifacts and workflow states
        </p>
      </div>

      {/* Pipeline Legend */}
      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border-subtle)' }}
      >
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Artifacts
            </div>
            <div className="flex items-center gap-2">
              {ARTIFACT_TYPES.map((type, i) => (
                <span key={type} className="flex items-center gap-1.5">
                  <span className="text-xs capitalize px-2 py-1 rounded" style={{ background: 'var(--color-bg-tertiary)' }}>
                    {type}
                  </span>
                  {i < ARTIFACT_TYPES.length - 1 && <ChevronRight size={12} style={{ color: 'var(--color-text-muted)' }} />}
                </span>
              ))}
            </div>
          </div>
          <div className="w-px h-10" style={{ background: 'var(--color-border)' }} />
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
              States
            </div>
            <div className="flex items-center gap-2">
              {STATE_FLOW.map((state, i) => (
                <span key={state} className="flex items-center gap-1.5">
                  <span
                    className="text-xs capitalize px-2 py-1 rounded"
                    style={{ backgroundColor: `${STATE_COLORS[state]}15`, color: STATE_COLORS[state] }}
                  >
                    {state.replace('-', ' ')}
                  </span>
                  {i < STATE_FLOW.length - 1 && <ChevronRight size={12} style={{ color: 'var(--color-text-muted)' }} />}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Changes List */}
      <div className="space-y-4">
        {changes.map((change) => (
          <div
            key={change.id}
            className="rounded-xl border p-5 transition-all hover:border-white/10"
            style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border-subtle)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sm">{change.name}</h3>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {change.description}
                </p>
              </div>
              <span
                className="text-[10px] px-2 py-1 rounded-full capitalize font-medium"
                style={{
                  backgroundColor: `${STATE_COLORS[change.status]}15`,
                  color: STATE_COLORS[change.status],
                }}
              >
                {change.status.replace('-', ' ')}
              </span>
            </div>

            {/* Artifact Pipeline */}
            <div className="flex gap-2">
              {ARTIFACT_TYPES.map((type) => {
                const artifact = change.artifacts.find((a) => a.type === type);
                return (
                  <div
                    key={type}
                    className={`flex-1 rounded-lg p-3 border transition-all ${
                      artifact ? 'cursor-pointer hover:border-white/10' : ''
                    }`}
                    style={{
                      background: artifact ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
                      borderColor: artifact
                        ? artifact.stale
                          ? 'var(--color-accent-amber)'
                          : 'var(--color-border-subtle)'
                        : 'transparent',
                      opacity: artifact ? 1 : 0.4,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={12} style={{ color: artifact ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)' }} />
                      <span className="text-[10px] uppercase tracking-wider font-medium">{type}</span>
                      {artifact?.stale && (
                        <AlertTriangle size={10} style={{ color: 'var(--color-accent-amber)' }} />
                      )}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      {artifact ? artifact.title : 'Not created'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Task count */}
            <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {change.taskIds.length} task{change.taskIds.length !== 1 ? 's' : ''}
              </span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                {change.id}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Coming soon */}
      <div
        className="rounded-xl border border-dashed p-6 text-center"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
      >
        <p className="text-sm">Interactive artifact editing and &ldquo;Generate Tasks&rdquo; coming in MVP</p>
      </div>
    </div>
  );
}
