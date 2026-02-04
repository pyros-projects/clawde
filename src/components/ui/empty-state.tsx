'use client';

import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  hint?: string;
}

export function EmptyState({ icon: Icon, title, description, action, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-8">
      <div className="w-16 h-16 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[var(--color-text-muted)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-md mb-4">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-[var(--color-accent-cyan)] text-black rounded-md font-medium hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
      {hint && (
        <p className="text-xs text-[var(--color-text-muted)] mt-4 max-w-sm">
          💡 {hint}
        </p>
      )}
    </div>
  );
}

interface OnboardingBannerProps {
  title: string;
  steps: Array<{
    label: string;
    done: boolean;
    action?: () => void;
  }>;
  onDismiss?: () => void;
}

export function OnboardingBanner({ title, steps, onDismiss }: OnboardingBannerProps) {
  const completedCount = steps.filter(s => s.done).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[var(--color-text-primary)]">{title}</h3>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-sm"
          >
            Dismiss
          </button>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="h-1 bg-[var(--color-bg-tertiary)] rounded-full mb-3 overflow-hidden">
        <div 
          className="h-full bg-[var(--color-accent-cyan)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className={step.done ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-text-muted)]'}>
              {step.done ? '✓' : '○'}
            </span>
            <span className={step.done ? 'text-[var(--color-text-secondary)] line-through' : 'text-[var(--color-text-primary)]'}>
              {step.label}
            </span>
            {!step.done && step.action && (
              <button
                onClick={step.action}
                className="ml-auto text-xs text-[var(--color-accent-cyan)] hover:underline"
              >
                Set up →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
