'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { MissionControlScreen } from '@/components/mission-control/mission-control-screen';
import { TaskGraphScreen } from '@/components/task-graph/task-graph-screen';
import { ReviewQueueScreen } from '@/components/review-queue/review-queue-screen';
import { SpecStudioScreen } from '@/components/spec-studio/spec-studio-screen';
import { AgentRegistryScreen } from '@/components/agent-registry/agent-registry-screen';
import { useAppStore } from '@/stores/app-store';
import { useEffect } from 'react';

function ScreenContent() {
  const { activeScreen } = useAppStore();

  switch (activeScreen) {
    case 'mission-control':
      return <MissionControlScreen />;
    case 'task-graph':
      return <TaskGraphScreen />;
    case 'review-queue':
      return <ReviewQueueScreen />;
    case 'spec-studio':
      return <SpecStudioScreen />;
    case 'agent-registry':
      return <AgentRegistryScreen />;
    default:
      return <MissionControlScreen />;
  }
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
