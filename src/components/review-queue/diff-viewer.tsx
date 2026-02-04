'use client';

import { useState } from 'react';
import { mockDiffs } from '@/data/mock';
import { DiffFile } from '@/lib/types';
import { FileText, Plus, Minus } from 'lucide-react';

interface DiffViewerProps {
  taskId: string;
}

function DiffLineComponent({ line }: { line: { type: string; content: string; lineNumber?: number } }) {
  const bgColor =
    line.type === 'add' ? 'rgba(34, 197, 94, 0.08)' :
    line.type === 'remove' ? 'rgba(239, 68, 68, 0.08)' :
    'transparent';

  const textColor =
    line.type === 'add' ? 'var(--color-accent-green)' :
    line.type === 'remove' ? 'var(--color-accent-red)' :
    'var(--color-text-secondary)';

  const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';

  return (
    <div className="flex font-mono text-[11px] leading-relaxed" style={{ backgroundColor: bgColor }}>
      <span
        className="w-12 shrink-0 text-right pr-3 select-none"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {line.lineNumber || ''}
      </span>
      <span className="w-4 shrink-0 select-none" style={{ color: textColor }}>
        {prefix}
      </span>
      <span style={{ color: textColor }} className="whitespace-pre">
        {line.content}
      </span>
    </div>
  );
}

function DiffFileComponent({ file }: { file: DiffFile }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border-subtle)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2 text-xs hover:bg-white/[0.02] transition-colors"
        style={{ background: 'var(--color-bg-tertiary)' }}
      >
        <FileText size={12} style={{ color: 'var(--color-text-muted)' }} />
        <span className="font-mono flex-1 text-left">{file.path}</span>
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-0.5 text-green-400">
            <Plus size={10} /> {file.additions}
          </span>
          <span className="flex items-center gap-0.5 text-red-400">
            <Minus size={10} /> {file.deletions}
          </span>
        </span>
      </button>
      {expanded && (
        <div className="overflow-x-auto" style={{ background: 'var(--color-bg-primary)' }}>
          {file.hunks.map((hunk, i) => (
            <div key={i}>
              <div className="px-3 py-1 text-[10px] font-mono" style={{ color: 'var(--color-accent-cyan)', background: 'rgba(6, 182, 212, 0.05)' }}>
                {hunk.header}
              </div>
              {hunk.lines.map((line, j) => (
                <DiffLineComponent key={j} line={line} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DiffViewer({ taskId }: DiffViewerProps) {
  const files = mockDiffs[taskId];

  if (!files || files.length === 0) {
    return (
      <div
        className="rounded-xl border p-8 text-center h-full flex items-center justify-center"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border-subtle)' }}
      >
        <div>
          <FileText size={32} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No diff available for this task</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden h-full flex flex-col"
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border-subtle)' }}
    >
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
        <h3 className="text-sm font-semibold">Changes</h3>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {files.length} file{files.length !== 1 ? 's' : ''} changed
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {files.map((file, i) => (
          <DiffFileComponent key={i} file={file} />
        ))}
      </div>
    </div>
  );
}
