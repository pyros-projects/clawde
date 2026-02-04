// ClawDE Core Data Model
// v0: mock adapters | v1: file-based adapters | v2: multi-project

// ============================================================
// Project Context
// ============================================================

export interface ProjectContext {
  root: string;                   // absolute path to repo
  name: string;                   // from package.json or directory name
  hasOpenSpec: boolean;            // openspec/ exists
  hasBeads: boolean;               // .beads/ exists
  hasGit: boolean;                 // .git/ exists
  hasClawDEConfig: boolean;        // .clawde/ exists
  config: ClawDEConfig;
}

export interface ClawDEConfig {
  agents: AgentConfig[];
  settings: ClawDESettings;
}

export interface AgentConfig {
  id: string;
  name: string;
  provider: string;
  model: string;
  color: string;
  capabilities: string[];
  connection: AgentConnectionConfig;
}

export interface AgentConnectionConfig {
  type: 'openclaw' | 'cli' | 'http';
  gateway?: string;               // OpenClaw gateway URL
  command?: string;                // CLI command (e.g., "codex")
  baseUrl?: string;                // HTTP base URL
}

export interface ClawDESettings {
  confirmDestructive: boolean;     // require confirmation for destructive commands
  maxActionsPerMinute: number;     // rate limit
  defaultAgent?: string;           // agent ID for chat
  watchDebounceMs: number;         // file watcher debounce
  mockMode: boolean;               // use mock data instead of real adapters
}

export const DEFAULT_SETTINGS: ClawDESettings = {
  confirmDestructive: true,
  maxActionsPerMinute: 30,
  watchDebounceMs: 100,
  mockMode: false,
};

// ============================================================
// Entities
// ============================================================

export type TaskStatus = 'open' | 'ready' | 'in-progress' | 'in-review' | 'blocked' | 'done';
export type ArtifactType = 'proposal' | 'specs' | 'design' | 'tasks';
export type ChangeStatus = 'active' | 'implementing' | 'in-review' | 'verified' | 'archived';
export type AgentStatus = 'idle' | 'working' | 'blocked' | 'waiting-review';
export type ConnectionStatus = 'connected' | 'disconnected' | 'error';
export type EventType =
  | 'task-created'
  | 'task-claimed'
  | 'task-started'
  | 'task-completed'
  | 'task-review-requested'
  | 'task-approved'
  | 'task-rejected'
  | 'task-blocked'
  | 'agent-connected'
  | 'agent-disconnected'
  | 'commit'
  | 'spec-updated'
  | 'change-created'
  | 'change-verified'
  | 'change-archived';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  deps: string[]; // task IDs this depends on
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  specLink?: string; // change ID or artifact path
  assignee?: string; // agent ID
  evidence: Evidence[];
  createdAt: string;
  updatedAt: string;
  changeId?: string;
}

export interface Artifact {
  id: string;
  type: ArtifactType;
  path: string;
  title: string;
  content?: string;
  lastUpdated: string;
  stale: boolean;
  changeId: string;
}

export interface Evidence {
  id: string;
  taskId: string;
  commitSha?: string;
  prUrl?: string;
  testOutput?: string;
  testPassed?: boolean;
  screenshots?: string[];
  agentId: string;
  description: string;
  timestamp: string;
}

export interface Agent {
  id: string;
  name: string;
  provider: string;
  model: string;
  capabilities: string[];
  status: AgentStatus;
  connectionStatus: ConnectionStatus;
  currentTaskId?: string;
  avatar?: string;
  color: string; // for UI identification
}

export interface Event {
  id: string;
  type: EventType;
  payload: Record<string, unknown>;
  timestamp: string;
  agentId?: string;
  taskId?: string;
  changeId?: string;
  correlationId?: string;
}

export interface Change {
  id: string;
  name: string;
  description: string;
  status: ChangeStatus;
  artifacts: Artifact[];
  taskIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Adapter Interfaces (mock now, real later)
// ============================================================

export interface TaskGraphAdapter {
  init(projectRoot: string): Promise<void>;
  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | null>;
  getReadyTasks(): Promise<Task[]>;
  updateTaskStatus(id: string, status: TaskStatus): Promise<Task>;
  getDependencyGraph(): Promise<{ nodes: Task[]; edges: { from: string; to: string }[] }>;
}

export interface SpecAdapter {
  init(projectRoot: string): Promise<void>;
  getChanges(): Promise<Change[]>;
  getChange(id: string): Promise<Change | null>;
  getArtifact(changeId: string, type: ArtifactType): Promise<Artifact | null>;
  getArtifacts(changeId: string): Promise<Artifact[]>;
}

export interface VCSAdapter {
  init(projectRoot: string): Promise<void>;
  getDiff(taskId: string): Promise<{ files: DiffFile[] }>;
  getCommits(taskId: string): Promise<CommitInfo[]>;
}

export interface AgentRuntimeAdapter {
  init(projectRoot: string, config: ClawDEConfig): Promise<void>;
  getAgents(): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | null>;
  getEvents(since?: string): Promise<Event[]>;
}

// ============================================================
// Chat Types
// ============================================================

export type ChatRole = 'user' | 'agent' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  agentId?: string;
  timestamp: string;
  command?: ParsedCommand;         // if this was a parsed command
  pending?: boolean;               // still streaming
}

export interface ParsedCommand {
  name: string;                    // e.g., "new", "plan", "seed"
  args: string[];                  // positional args
  flags: Record<string, string>;   // --flag=value
  raw: string;                     // original input
}

export const COMMANDS = [
  { name: 'new', usage: '/new <description>', help: 'Create a new OpenSpec change' },
  { name: 'plan', usage: '/plan [change-id]', help: 'Run task decomposition on a change' },
  { name: 'seed', usage: '/seed [change-id]', help: 'Import tasks into Beads graph' },
  { name: 'assign', usage: '/assign <task> <agent>', help: 'Assign a task to an agent' },
  { name: 'status', usage: '/status', help: 'Show project status summary' },
  { name: 'approve', usage: '/approve <task>', help: 'Approve a task in review' },
  { name: 'reject', usage: '/reject <task> [reason]', help: 'Reject a task with feedback' },
  { name: 'run', usage: '/run <task>', help: 'Tell an agent to start a task' },
] as const;

// ============================================================
// Supporting Types
// ============================================================

export interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  lineNumber?: number;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
  filesChanged: number;
}

// ============================================================
// UI State
// ============================================================

export interface AppState {
  tasks: Task[];
  agents: Agent[];
  events: Event[];
  changes: Change[];
  selectedTaskId: string | null;
  activeScreen: Screen;
  filters: TaskFilters;
}

export type Screen = 'mission-control' | 'task-graph' | 'review-queue' | 'spec-studio' | 'agent-registry';

export interface TaskFilters {
  status?: TaskStatus[];
  agentId?: string;
  changeId?: string;
  searchQuery?: string;
}

// ============================================================
// Status Colors (for consistent theming)
// ============================================================

export const STATUS_COLORS: Record<TaskStatus, string> = {
  'open': '#64748b',       // slate
  'ready': '#06b6d4',      // cyan
  'in-progress': '#f59e0b', // amber
  'in-review': '#a855f7',  // purple
  'blocked': '#ef4444',    // red
  'done': '#22c55e',       // green
};

export const AGENT_STATUS_COLORS: Record<AgentStatus, string> = {
  'idle': '#64748b',
  'working': '#f59e0b',
  'blocked': '#ef4444',
  'waiting-review': '#a855f7',
};
