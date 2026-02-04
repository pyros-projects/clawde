// Adapter Manager (T7)
// Central coordinator that initializes adapters and provides data to the store
// SERVER-ONLY: runs in the Next.js server process

import { FileOpenSpecAdapter } from './adapters/openspec-adapter';
import { FileBeadsAdapter } from './adapters/beads-adapter';
import { FileGitAdapter } from './adapters/git-adapter';
import { discoverProjectServer } from './project';
import { createProjectWatcher, FileWatcher } from './watcher';
import type {
  ProjectContext,
  Task,
  Change,
  Event,
  Agent,
  AgentStatus,
  ConnectionStatus,
} from './types';

export interface ProjectState {
  project: ProjectContext;
  tasks: Task[];
  changes: Change[];
  events: Event[];
  agents: Agent[];
}

type RefreshListener = (state: ProjectState) => void;

export class AdapterManager {
  private projectRoot: string;
  private openSpecAdapter = new FileOpenSpecAdapter();
  private beadsAdapter = new FileBeadsAdapter();
  private gitAdapter = new FileGitAdapter();
  private watcher: FileWatcher | null = null;
  private listeners: RefreshListener[] = [];
  private currentState: ProjectState | null = null;
  private mockMode: boolean;

  constructor(projectRoot: string, mockMode = false) {
    this.projectRoot = projectRoot;
    this.mockMode = mockMode;
  }

  async init(): Promise<ProjectState> {
    if (this.mockMode) {
      return this.loadMockState();
    }

    const project = await discoverProjectServer(this.projectRoot);

    // Initialize adapters for sources that exist
    if (project.hasOpenSpec) {
      await this.openSpecAdapter.init(this.projectRoot);
    }
    if (project.hasBeads) {
      await this.beadsAdapter.init(this.projectRoot);
    }
    if (project.hasGit) {
      await this.gitAdapter.init(this.projectRoot);
    }

    this.currentState = await this.buildState(project);
    return this.currentState;
  }

  async startWatching(): Promise<void> {
    if (this.mockMode || this.watcher?.isRunning()) return;

    const project = await discoverProjectServer(this.projectRoot);
    const debounceMs = project.config.settings.watchDebounceMs;

    this.watcher = createProjectWatcher(
      this.projectRoot,
      debounceMs,
      async (category) => {
        await this.refresh(category);
      }
    );

    await this.watcher.start();
  }

  stopWatching(): void {
    this.watcher?.stop();
  }

  onRefresh(listener: RefreshListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getState(): ProjectState | null {
    return this.currentState;
  }

  private async refresh(category: string): Promise<void> {
    try {
      if (category === 'openspec' || category === 'any') {
        await this.openSpecAdapter.refresh();
      }
      if (category === 'beads' || category === 'any') {
        await this.beadsAdapter.refresh();
      }
      // Git doesn't need explicit refresh — reads on demand

      const project = await discoverProjectServer(this.projectRoot);
      this.currentState = await this.buildState(project);

      // Notify listeners
      for (const listener of this.listeners) {
        listener(this.currentState);
      }
    } catch {
      // Refresh failed — keep existing state
    }
  }

  private async buildState(project: ProjectContext): Promise<ProjectState> {
    const [tasks, changes, commitEvents] = await Promise.all([
      project.hasBeads ? this.beadsAdapter.getTasks() : Promise.resolve([]),
      project.hasOpenSpec ? this.openSpecAdapter.getChanges() : Promise.resolve([]),
      project.hasGit
        ? this.gitAdapter.getCommitEvents(this.buildAuthorMap(project))
        : Promise.resolve([]),
    ]);

    // Build agents from config
    const agents = project.config.agents.map(agentConfig => ({
      id: agentConfig.id,
      name: agentConfig.name,
      provider: agentConfig.provider,
      model: agentConfig.model,
      capabilities: agentConfig.capabilities,
      status: 'idle' as AgentStatus,
      connectionStatus: 'disconnected' as ConnectionStatus,
      color: agentConfig.color,
    }));

    return {
      project,
      tasks,
      changes,
      events: commitEvents,
      agents,
    };
  }

  private buildAuthorMap(project: ProjectContext): Record<string, string> {
    // Map git author names to agent IDs
    const map: Record<string, string> = {};
    for (const agent of project.config.agents) {
      map[agent.name] = agent.id;
      // Also map common git name patterns
      map[agent.name.toLowerCase()] = agent.id;
    }
    return map;
  }

  private async loadMockState(): Promise<ProjectState> {
    // Dynamic import to avoid bundling mocks in production
    const { mockTasks } = await import('../data/mock/tasks');
    const { mockAgents } = await import('../data/mock/agents');
    const { mockEvents } = await import('../data/mock/events');
    const { mockChanges } = await import('../data/mock/changes');

    const project: ProjectContext = {
      root: this.projectRoot,
      name: 'ClawDE (mock)',
      hasOpenSpec: true,
      hasBeads: true,
      hasGit: true,
      hasClawDEConfig: true,
      config: {
        agents: [],
        settings: {
          confirmDestructive: true,
          maxActionsPerMinute: 30,
          watchDebounceMs: 100,
          mockMode: true,
        },
      },
    };

    this.currentState = {
      project,
      tasks: mockTasks,
      changes: mockChanges,
      events: mockEvents,
      agents: mockAgents,
    };

    return this.currentState;
  }
}

// Singleton for the server process
let _manager: AdapterManager | null = null;

export function getAdapterManager(projectRoot?: string): AdapterManager {
  if (!_manager) {
    const root = projectRoot || process.cwd();
    const mockMode = process.env.CLAWDE_MOCK === 'true';
    _manager = new AdapterManager(root, mockMode);
  }
  return _manager;
}
