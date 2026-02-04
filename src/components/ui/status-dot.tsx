'use client';

import { AgentStatus, TaskStatus, STATUS_COLORS, AGENT_STATUS_COLORS } from '@/lib/types';

interface StatusDotProps {
  status: TaskStatus | AgentStatus;
  type?: 'task' | 'agent';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export function StatusDot({ status, type = 'task', size = 'md', pulse }: StatusDotProps) {
  const colors = type === 'agent' ? AGENT_STATUS_COLORS : STATUS_COLORS;
  const color = colors[status as keyof typeof colors] || '#64748b';
  
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <span className="relative inline-flex">
      <span
        className={`${sizeClasses[size]} rounded-full inline-block`}
        style={{ backgroundColor: color }}
      />
      {pulse && (
        <span
          className={`absolute inset-0 ${sizeClasses[size]} rounded-full animate-ping`}
          style={{ backgroundColor: color, opacity: 0.4 }}
        />
      )}
    </span>
  );
}
