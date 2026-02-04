'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Task, STATUS_COLORS } from '@/lib/types';
import { StatusDot } from '@/components/ui/status-dot';

interface TaskNodeData {
  task: Task;
  agentName?: string;
  agentColor?: string;
}

function TaskNodeComponent({ data, selected }: NodeProps & { data: TaskNodeData }) {
  const { task, agentName, agentColor } = data;
  const color = STATUS_COLORS[task.status];

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-gray-600 !border-gray-500 !w-2 !h-2" />
      <div
        className={`px-4 py-3 rounded-lg border min-w-[200px] max-w-[280px] transition-all cursor-pointer ${
          selected ? 'ring-2 ring-cyan-400/50' : ''
        }`}
        style={{
          background: 'var(--color-bg-card)',
          borderColor: selected ? color : 'var(--color-border-subtle)',
          borderLeftWidth: '3px',
          borderLeftColor: color,
        }}
      >
        <div className="flex items-start gap-2 mb-1.5">
          <StatusDot status={task.status} size="sm" pulse={task.status === 'in-progress'} />
          <span className="text-xs font-semibold leading-tight flex-1">{task.title}</span>
        </div>

        <div className="flex items-center justify-between">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded capitalize"
            style={{
              backgroundColor: `${color}15`,
              color: color,
            }}
          >
            {task.status.replace('-', ' ')}
          </span>
          {agentName && (
            <span className="text-[10px] font-medium" style={{ color: agentColor || 'var(--color-text-muted)' }}>
              {agentName}
            </span>
          )}
        </div>

        {task.evidence.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1">
            <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
              📎 {task.evidence.length} evidence
            </span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-600 !border-gray-500 !w-2 !h-2" />
    </>
  );
}

export const TaskNode = memo(TaskNodeComponent);
