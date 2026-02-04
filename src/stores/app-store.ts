'use client';

import { create } from 'zustand';
import { Task, Agent, Event, Change, Screen, TaskStatus, TaskFilters } from '@/lib/types';
import { mockTasks, mockAgents, mockEvents, mockChanges } from '@/data/mock';

interface AppStore {
  // Data
  tasks: Task[];
  agents: Agent[];
  events: Event[];
  changes: Change[];

  // UI State
  selectedTaskId: string | null;
  activeScreen: Screen;
  filters: TaskFilters;
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;

  // Actions
  setActiveScreen: (screen: Screen) => void;
  selectTask: (id: string | null) => void;
  setFilters: (filters: TaskFilters) => void;
  toggleSidebar: () => void;
  toggleCommandPalette: () => void;

  // Task mutations (update local state + append event)
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  approveTask: (taskId: string) => void;
  rejectTask: (taskId: string, reason: string) => void;

  // Computed
  getReadyTasks: () => Task[];
  getReviewTasks: () => Task[];
  getTaskById: (id: string) => Task | undefined;
  getAgentById: (id: string) => Agent | undefined;
  getFilteredTasks: () => Task[];
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial data from mocks
  tasks: mockTasks,
  agents: mockAgents,
  events: mockEvents,
  changes: mockChanges,

  // UI defaults
  selectedTaskId: null,
  activeScreen: 'mission-control',
  filters: {},
  sidebarOpen: true,
  commandPaletteOpen: false,

  // Actions
  setActiveScreen: (screen) => set({ activeScreen: screen }),
  selectTask: (id) => set({ selectedTaskId: id }),
  setFilters: (filters) => set({ filters }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  updateTaskStatus: (taskId, status) => {
    set((state) => {
      const newEvent: Event = {
        id: `evt-${Date.now()}`,
        type: status === 'in-review' ? 'task-review-requested' : status === 'done' ? 'task-completed' : 'task-started',
        payload: { taskId, newStatus: status },
        timestamp: new Date().toISOString(),
        taskId,
      };
      return {
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, status, updatedAt: new Date().toISOString() } : t
        ),
        events: [newEvent, ...state.events],
      };
    });
  },

  approveTask: (taskId) => {
    set((state) => {
      const newEvent: Event = {
        id: `evt-${Date.now()}`,
        type: 'task-approved',
        payload: { taskId, message: 'Task approved' },
        timestamp: new Date().toISOString(),
        taskId,
      };
      return {
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, status: 'done' as TaskStatus, updatedAt: new Date().toISOString() } : t
        ),
        events: [newEvent, ...state.events],
      };
    });
  },

  rejectTask: (taskId, reason) => {
    set((state) => {
      const newEvent: Event = {
        id: `evt-${Date.now()}`,
        type: 'task-rejected',
        payload: { taskId, reason },
        timestamp: new Date().toISOString(),
        taskId,
      };
      return {
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, status: 'in-progress' as TaskStatus, updatedAt: new Date().toISOString() } : t
        ),
        events: [newEvent, ...state.events],
      };
    });
  },

  // Computed
  getReadyTasks: () => {
    const { tasks } = get();
    return tasks.filter((t) => {
      if (t.status !== 'ready' && t.status !== 'open') return false;
      return t.deps.every((depId) => {
        const dep = tasks.find((d) => d.id === depId);
        return dep?.status === 'done';
      });
    });
  },

  getReviewTasks: () => get().tasks.filter((t) => t.status === 'in-review'),

  getTaskById: (id) => get().tasks.find((t) => t.id === id),

  getAgentById: (id) => get().agents.find((a) => a.id === id),

  getFilteredTasks: () => {
    const { tasks, filters } = get();
    return tasks.filter((t) => {
      if (filters.status?.length && !filters.status.includes(t.status)) return false;
      if (filters.agentId && t.assignee !== filters.agentId) return false;
      if (filters.changeId && t.changeId !== filters.changeId) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  },
}));
