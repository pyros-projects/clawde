'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { MissionControlScreen } from '@/components/mission-control/mission-control-screen';
import { useAppStore } from '@/stores/app-store';
import { useEffect } from 'react';

function ScreenContent() {
  const { activeScreen } = useAppStore();

  switch (activeScreen) {
    case 'mission-control':
      return <MissionControlScreen />;
    case 'task-graph':
      return <ComingSoon title="Task Graph" description="Interactive dependency DAG visualization" />;
    case 'review-queue':
      return <ComingSoon title="Review Queue" description="Review and approve agent work" />;
    case 'spec-studio':
      return <ComingSoon title="Spec Studio" description="Spec-driven planning artifacts" />;
    case 'agent-registry':
      return <ComingSoon title="Agent Registry" description="Configure and monitor agents" />;
    default:
      return <MissionControlScreen />;
  }
}

function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>{description}</p>
        <div
          className="mt-6 inline-block px-4 py-2 rounded-lg text-sm"
          style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
        >
          🚧 Building...
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { sidebarOpen, setActiveScreen, toggleCommandPalette } = useAppStore();

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      // Number keys for screen switching (only without modifiers)
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const screens = ['mission-control', 'task-graph', 'review-queue', 'spec-studio', 'agent-registry'] as const;
        const idx = parseInt(e.key) - 1;
        if (idx >= 0 && idx < screens.length) {
          setActiveScreen(screens[idx]);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveScreen, toggleCommandPalette]);

  return (
    <div className="min-h-screen bg-grid">
      <Sidebar />
      <main
        className={`transition-all duration-300 min-h-screen ${sidebarOpen ? 'ml-56' : 'ml-16'}`}
      >
        <div className="p-6 max-w-7xl mx-auto">
          <ScreenContent />
        </div>
      </main>
    </div>
  );
}
