'use client';

import { create } from 'zustand';
import { Task, Agent, Event, Change, Screen, TaskStatus, TaskFilters, ChatMessage, ParsedCommand, COMMANDS } from '@/lib/types';
import { executeCommand, type CommandContext } from '@/lib/commands';
import { mockTasks, mockAgents, mockEvents, mockChanges } from '@/data/mock';

interface AppStore {
  // Data
  tasks: Task[];
  agents: Agent[];
  events: Event[];
  changes: Change[];
  chatMessages: ChatMessage[];

  // UI State
  selectedTaskId: string | null;
  activeScreen: Screen;
  filters: TaskFilters;
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  chatOpen: boolean;

  // Actions
  setActiveScreen: (screen: Screen) => void;
  selectTask: (id: string | null) => void;
  setFilters: (filters: TaskFilters) => void;
  toggleSidebar: () => void;
  toggleCommandPalette: () => void;
  toggleChat: () => void;
  sendChatMessage: (content: string) => void;
  addAgentMessage: (content: string, agentId: string, command?: ParsedCommand) => void;

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

function tryParseCommand(input: string): ParsedCommand | undefined {
  // Accept both "/status" and "clawde status" formats
  let commandText: string;
  if (input.startsWith('/')) {
    commandText = input.slice(1);
  } else if (input.toLowerCase().startsWith('clawde ')) {
    commandText = input.slice(7); // "clawde ".length
  } else {
    return undefined;
  }
  
  const parts = commandText.split(/\s+/);
  const name = parts[0]?.toLowerCase();
  if (!COMMANDS.find(c => c.name === name)) return undefined;
  const args: string[] = [];
  const flags: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    if (p.startsWith('--')) {
      const [k, ...v] = p.slice(2).split('=');
      flags[k] = v.join('=') || 'true';
    } else {
      args.push(p);
    }
  }
  return { name, args, flags, raw: input };
}

// Stream a chat response from the API
async function streamAgentResponse(
  message: string,
  agentId: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (chunk: string) => void,
  onComplete: (fullResponse: string) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, message, history }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') {
          onComplete(fullResponse);
          return;
        }

        try {
          const chunk = JSON.parse(data);
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            onChunk(content);
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    onComplete(fullResponse);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    onError(msg);
  }
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial data from mocks
  tasks: mockTasks,
  agents: mockAgents,
  events: mockEvents,
  changes: mockChanges,
  chatMessages: [],

  // UI defaults
  selectedTaskId: null,
  activeScreen: 'mission-control',
  filters: {},
  sidebarOpen: true,
  commandPaletteOpen: false,
  chatOpen: false,

  // Actions
  setActiveScreen: (screen) => set({ activeScreen: screen }),
  selectTask: (id) => set({ selectedTaskId: id }),
  setFilters: (filters) => set({ filters }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),

  sendChatMessage: async (content) => {
    const command = tryParseCommand(content);
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      command,
    };

    // Add user message
    set((s) => ({ chatMessages: [...s.chatMessages, userMsg] }));

    // Create pending agent message
    const agentMsgId = `msg-${Date.now()}-agent`;
    const pendingMsg: ChatMessage = {
      id: agentMsgId,
      role: 'agent',
      content: '',
      agentId: 'claude',
      timestamp: new Date().toISOString(),
      command,
      pending: true,
    };
    set((s) => ({ chatMessages: [...s.chatMessages, pendingMsg] }));

    // If it's a command, execute it locally
    if (command) {
      const ctx: CommandContext = {
        tasks: get().tasks,
        changes: get().changes,
        // Adapter callbacks for commands that modify state
        onUpdateTask: async (taskId, updates) => {
          set((s) => ({
            tasks: s.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
          }));
        },
      };
      
      try {
        const result = await executeCommand(command, ctx);
        set((s) => ({
          chatMessages: s.chatMessages.map((m) =>
            m.id === agentMsgId ? { ...m, content: result.message, pending: false } : m
          ),
        }));
        return;
      } catch (e) {
        set((s) => ({
          chatMessages: s.chatMessages.map((m) =>
            m.id === agentMsgId ? { 
              ...m, 
              content: `❌ Command failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 
              pending: false 
            } : m
          ),
        }));
        return;
      }
    }

    // Natural language — send to agent API
    const existingMessages = get().chatMessages.filter(m => !m.pending);
    const history = existingMessages
      .slice(-10)
      .map(m => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      }));

    streamAgentResponse(
      content,
      'claude',
      history,
      // onChunk: update message content
      (chunk) => {
        set((s) => ({
          chatMessages: s.chatMessages.map((m) =>
            m.id === agentMsgId ? { ...m, content: m.content + chunk } : m
          ),
        }));
      },
      // onComplete: mark as done
      () => {
        set((s) => ({
          chatMessages: s.chatMessages.map((m) =>
            m.id === agentMsgId ? { ...m, pending: false } : m
          ),
        }));
      },
      // onError: fall back to helpful message
      (error) => {
        console.warn('[chat] Agent API error:', error);
        set((s) => ({
          chatMessages: s.chatMessages.map((m) =>
            m.id === agentMsgId ? { 
              ...m, 
              content: `I heard: "${content}"\n\n_(Agent gateway not available. Enable \`gateway.http.endpoints.chatCompletions\` in your OpenClaw config to connect.)_`, 
              pending: false 
            } : m
          ),
        }));
      }
    );
  },

  addAgentMessage: (content, agentId, command) => {
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-agent`,
      role: 'agent',
      content,
      agentId,
      timestamp: new Date().toISOString(),
      command,
    };
    set((s) => ({ chatMessages: [...s.chatMessages, msg] }));
  },

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
