import { Agent } from '@/lib/types';

export const mockAgents: Agent[] = [
  {
    id: 'agent-claude',
    name: 'Claude',
    provider: 'Anthropic',
    model: 'claude-opus-4-5',
    capabilities: ['coding', 'architecture', 'review', 'documentation', 'git-write'],
    status: 'working',
    connectionStatus: 'connected',
    currentTaskId: 'task-7',
    color: '#f97316', // orange
  },
  {
    id: 'agent-codie',
    name: 'Codie',
    provider: 'OpenAI',
    model: 'gpt-5.2',
    capabilities: ['coding', 'review', 'testing', 'refactoring'],
    status: 'waiting-review',
    connectionStatus: 'connected',
    currentTaskId: 'task-5',
    color: '#06b6d4', // cyan
  },
  {
    id: 'agent-gemini',
    name: 'Gem',
    provider: 'Google',
    model: 'gemini-2.5-pro',
    capabilities: ['coding', 'research', 'documentation'],
    status: 'idle',
    connectionStatus: 'connected',
    color: '#a855f7', // purple
  },
];
