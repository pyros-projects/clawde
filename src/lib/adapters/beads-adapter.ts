// File-based Beads adapter
// Reads task state from Beads CLI (bd list --json, bd dep list)
// SERVER-ONLY: Do not import from client components

import type { TaskGraphAdapter, Task, TaskStatus } from '../types';

interface BeadIssue {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee?: string;
  created?: string;
  updated?: string;
  labels?: string[];
}

// Used when parsing bd dep list output
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface BeadDep {
  from?: string;
  to?: string;
  type?: string;
}

export class FileBeadsAdapter implements TaskGraphAdapter {
  private projectRoot = '';
  private tasks: Task[] = [];
  private edges: { from: string; to: string }[] = [];

  async init(projectRoot: string): Promise<void> {
    this.projectRoot = projectRoot;
    await this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      // Run bd list --json to get all issues
      const issues = await this.runBd(['list', '--json', '--all']);
      
      // Run bd dep list for each issue to get edges
      this.edges = [];
      for (const issue of issues) {
        try {
          const deps = await this.runBd(['dep', 'list', issue.id, '--json']);
          if (Array.isArray(deps)) {
            for (const dep of deps) {
              if (dep.from && dep.to) {
                this.edges.push({ from: dep.from, to: dep.to });
              }
            }
          }
        } catch {
          // Some issues may not have deps
        }
      }

      this.tasks = issues.map(issue => mapBeadToTask(issue));
    } catch {
      // Beads not available or no issues
      this.tasks = [];
      this.edges = [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async runBd(args: string[]): Promise<any[]> {
    // Dynamic import to prevent build-time bundling
    const childProcess = await import('child_process');
    const result = childProcess.execSync(`bd ${args.join(' ')}`, {
      cwd: this.projectRoot,
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return JSON.parse(result);
  }

  async getTasks(): Promise<Task[]> {
    return this.tasks;
  }

  async getTask(id: string): Promise<Task | null> {
    return this.tasks.find(t => t.id === id) || null;
  }

  async getReadyTasks(): Promise<Task[]> {
    return this.tasks.filter(task => {
      if (task.status !== 'open' && task.status !== 'ready') return false;
      // Check if all deps are done
      const depIds = task.deps;
      return depIds.every(depId => {
        const dep = this.tasks.find(t => t.id === depId);
        return dep && dep.status === 'done';
      });
    });
  }

  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    const { execSync } = await import('child_process');
    
    if (status === 'done') {
      execSync(`bd close ${id}`, { cwd: this.projectRoot, encoding: 'utf-8' });
    }
    // TODO: map other statuses to Beads commands (reopen, etc.)

    await this.refresh();
    const updated = this.tasks.find(t => t.id === id);
    if (!updated) throw new Error(`Task ${id} not found after update`);
    return updated;
  }

  async getDependencyGraph(): Promise<{ nodes: Task[]; edges: { from: string; to: string }[] }> {
    return {
      nodes: this.tasks,
      edges: this.edges,
    };
  }
}

// ── Helpers ────────────────────────────────────────────────

function mapBeadToTask(issue: BeadIssue): Task {
  return {
    id: issue.id,
    title: issue.title,
    description: issue.description || '',
    status: mapBeadStatus(issue.status),
    deps: [], // populated via edges
    priority: mapBeadPriority(issue.priority),
    assignee: issue.assignee || undefined,
    evidence: [],
    createdAt: issue.created || new Date().toISOString(),
    updatedAt: issue.updated || new Date().toISOString(),
  };
}

function mapBeadStatus(status: string): TaskStatus {
  switch (status.toLowerCase()) {
    case 'closed':
    case 'done':
    case 'resolved':
      return 'done';
    case 'in-progress':
    case 'active':
    case 'working':
      return 'in-progress';
    case 'in-review':
    case 'review':
      return 'in-review';
    case 'blocked':
      return 'blocked';
    case 'ready':
      return 'ready';
    default:
      return 'open';
  }
}

function mapBeadPriority(priority: string): Task['priority'] {
  switch (priority?.toUpperCase()) {
    case 'P0': return 'P0';
    case 'P1': return 'P1';
    case 'P2': return 'P2';
    case 'P3': return 'P3';
    default: return 'P2';
  }
}
