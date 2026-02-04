'use client';

import { useAppStore } from '@/stores/app-store';
import { Screen } from '@/lib/types';
import {
  LayoutDashboard,
  GitBranch,
  CheckCircle2,
  FileText,
  Bot,
  ChevronLeft,
  ChevronRight,
  Command,
} from 'lucide-react';

const NAV_ITEMS: { screen: Screen; label: string; icon: React.ElementType; shortcut: string }[] = [
  { screen: 'mission-control', label: 'Mission Control', icon: LayoutDashboard, shortcut: '1' },
  { screen: 'task-graph', label: 'Task Graph', icon: GitBranch, shortcut: '2' },
  { screen: 'review-queue', label: 'Review Queue', icon: CheckCircle2, shortcut: '3' },
  { screen: 'spec-studio', label: 'Spec Studio', icon: FileText, shortcut: '4' },
  { screen: 'agent-registry', label: 'Agents', icon: Bot, shortcut: '5' },
];

export function Sidebar() {
  const { activeScreen, setActiveScreen, sidebarOpen, toggleSidebar, toggleCommandPalette, getReviewTasks } = useAppStore();
  const reviewCount = getReviewTasks().length;

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 flex flex-col border-r transition-all duration-300 ${
        sidebarOpen ? 'w-56' : 'w-16'
      }`}
      style={{
        background: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-sm">
          C
        </div>
        {sidebarOpen && (
          <div>
            <span className="font-semibold text-sm tracking-wide">ClawDE</span>
            <span className="text-[10px] block" style={{ color: 'var(--color-text-muted)' }}>
              v0.1 prototype
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {NAV_ITEMS.map(({ screen, label, icon: Icon, shortcut }) => {
          const isActive = activeScreen === screen;
          return (
            <button
              key={screen}
              onClick={() => setActiveScreen(screen)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-cyan-400' : ''} />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left">{label}</span>
                  {screen === 'review-queue' && reviewCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-400">
                      {reviewCount}
                    </span>
                  )}
                  <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                    {shortcut}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-2 space-y-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={toggleCommandPalette}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all"
        >
          <Command size={16} />
          {sidebarOpen && (
            <>
              <span className="flex-1 text-left">Command</span>
              <kbd className="text-[10px] font-mono px-1 py-0.5 rounded" style={{ background: 'var(--color-bg-tertiary)' }}>
                ⌘K
              </kbd>
            </>
          )}
        </button>
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all"
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          {sidebarOpen && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
