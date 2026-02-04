// Command Executor (T12)
// Parses and executes chat commands, maps to adapter actions

import type { ParsedCommand, Task, Change } from './types';

export type CommandResult = {
  success: boolean;
  message: string;
  data?: unknown;
  navigateTo?: { screen: string; id?: string }; // hint for UI navigation
};

export type CommandContext = {
  tasks: Task[];
  changes: Change[];
  // Adapter callbacks (injected by caller)
  onCreateChange?: (name: string, description: string) => Promise<string>;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onRunBeadsCommand?: (cmd: string, args: string[]) => Promise<string>;
};

// Command definitions with validation and execution
interface CommandDef {
  name: string;
  usage: string;
  help: string;
  minArgs: number;
  maxArgs: number;
  execute: (cmd: ParsedCommand, ctx: CommandContext) => Promise<CommandResult>;
}

const COMMAND_DEFS: CommandDef[] = [
  {
    name: 'status',
    usage: '/status',
    help: 'Show project status summary',
    minArgs: 0,
    maxArgs: 0,
    execute: async (_cmd, ctx) => {
      // Try to fetch fresh data from API, fall back to local state
      let tasks = ctx.tasks;
      let changes = ctx.changes;
      let projectName = 'ClawDE';

      try {
        const [tasksRes, changesRes, projectRes] = await Promise.all([
          fetch('/api/tasks').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/changes').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/project').then(r => r.ok ? r.json() : null).catch(() => null),
        ]);

        if (tasksRes?.tasks) tasks = tasksRes.tasks;
        if (changesRes?.changes) changes = changesRes.changes;
        if (projectRes?.project?.name) projectName = projectRes.project.name;
      } catch {
        // Use local state as fallback
      }

      const stats = {
        total: tasks.length,
        done: tasks.filter(t => t.status === 'done').length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        inReview: tasks.filter(t => t.status === 'in-review').length,
        blocked: tasks.filter(t => t.status === 'blocked').length,
        ready: tasks.filter(t => t.status === 'ready' || t.status === 'open').length,
      };
      
      const activeChanges = changes.filter(c => c.status === 'active' || c.status === 'implementing');
      const reviewTasks = tasks.filter(t => t.status === 'in-review');
      
      // Calculate completion percentage
      const completionPct = stats.total > 0 
        ? Math.round((stats.done / stats.total) * 100) 
        : 0;

      // Build status message with deep links
      let message = `📊 **${projectName} Status**\n\n`;
      message += `**Progress:** ${completionPct}% complete (${stats.done}/${stats.total})\n`;
      message += `• ✅ ${stats.done} done | 🔄 ${stats.inProgress} in progress | 👀 ${stats.inReview} in review\n`;
      message += `• 🚫 ${stats.blocked} blocked | 🎯 ${stats.ready} ready\n\n`;
      
      if (activeChanges.length > 0) {
        message += `**Active Changes:** ${activeChanges.length}\n`;
        activeChanges.slice(0, 3).forEach(c => {
          message += `• ${c.name}\n`;
        });
        if (activeChanges.length > 3) message += `• ...and ${activeChanges.length - 3} more\n`;
        message += '\n';
      }

      if (reviewTasks.length > 0) {
        message += `**Pending Review:** ${reviewTasks.length}\n`;
        reviewTasks.slice(0, 3).forEach(t => {
          message += `• ${t.title}\n`;
        });
        if (reviewTasks.length > 3) message += `• ...and ${reviewTasks.length - 3} more\n`;
      }

      return {
        success: true,
        message,
        data: { stats, activeChanges: activeChanges.length, pendingReview: reviewTasks.length },
        navigateTo: { screen: 'mission-control' },
      };
    },
  },
  {
    name: 'new',
    usage: '/new <description>',
    help: 'Create a new OpenSpec change',
    minArgs: 1,
    maxArgs: Infinity,
    execute: async (cmd) => {
      const description = cmd.args.join(' ');
      if (!description.trim()) {
        return { success: false, message: '❌ Please provide a description for the new change.' };
      }
      
      // Generate a name from the description
      const name = description
        .slice(0, 50)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      try {
        const response = await fetch('/api/changes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { success: false, message: `❌ ${data.error || 'Failed to create change'}` };
        }

        return {
          success: true,
          message: `✅ Created change: **${data.changeId}**\n\n📁 \`openspec/changes/${data.changeId}/proposal.md\`\n\nNext: run \`/plan ${data.changeId}\` (or \`clawde plan ${data.changeId}\`) to generate tasks.`,
          navigateTo: { screen: 'spec-studio', id: data.changeId },
        };
      } catch (e) {
        return { success: false, message: `❌ Failed to create change: ${e instanceof Error ? e.message : 'Network error'}` };
      }
    },
  },
  {
    name: 'plan',
    usage: '/plan [change-id] [--dry-run]',
    help: 'Generate tasks from a change proposal',
    minArgs: 0,
    maxArgs: 1,
    execute: async (cmd, ctx) => {
      let changeId = cmd.args[0];
      const dryRun = cmd.flags['dry-run'] === 'true';
      
      if (!changeId) {
        // Find most recent active change from local state
        const active = ctx.changes.find(c => c.status === 'active');
        if (!active) {
          return { success: false, message: '❌ No active change found. Specify a change ID or create one with `/new`.' };
        }
        changeId = active.id;
      }
      
      // Try to find change in local state (for display name), but don't block if not found
      // API is source of truth - it will 404 if change doesn't exist on disk
      const change = ctx.changes.find(c => c.id === changeId || c.name.includes(changeId!));
      const targetId = change?.id || changeId;

      try {
        const response = await fetch(`/api/changes/${encodeURIComponent(targetId)}/plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dryRun }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { success: false, message: `❌ ${data.error || 'Failed to generate tasks'}` };
        }

        const displayName = change?.name || targetId;

        if (dryRun) {
          return {
            success: true,
            message: `🔍 **Dry run** — tasks for **${displayName}**:\n\n\`\`\`markdown\n${data.preview?.slice(0, 1500)}${data.preview?.length > 1500 ? '\n...(truncated)' : ''}\n\`\`\`\n\n_Run without \`--dry-run\` to save._`,
          };
        }

        return {
          success: true,
          message: `✅ Generated **${data.taskCount}** tasks for **${displayName}**\n\n📁 \`openspec/changes/${targetId}/tasks.md\`\n\nNext: run \`/seed ${targetId}\` (or \`clawde seed ${targetId}\`) to import into Beads.`,
          navigateTo: { screen: 'spec-studio', id: targetId },
        };
      } catch (e) {
        return { success: false, message: `❌ Failed to plan: ${e instanceof Error ? e.message : 'Network error'}` };
      }
    },
  },
  {
    name: 'seed',
    usage: '/seed [change-id] [--dry-run]',
    help: 'Import tasks from change into Beads graph',
    minArgs: 0,
    maxArgs: 1,
    execute: async (cmd, ctx) => {
      let changeId = cmd.args[0];
      const dryRun = cmd.flags['dry-run'] === 'true';
      
      if (!changeId) {
        // Find most recent active change from local state
        const active = ctx.changes.find(c => c.status === 'active');
        if (!active) {
          return { success: false, message: '❌ No active change found. Specify a change ID.' };
        }
        changeId = active.id;
      }
      
      // Try to find change in local state (for display name)
      const change = ctx.changes.find(c => c.id === changeId || c.name.includes(changeId!));
      const targetId = change?.id || changeId;
      const displayName = change?.name || targetId;

      try {
        const response = await fetch(`/api/changes/${encodeURIComponent(targetId)}/seed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dryRun }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { success: false, message: `❌ ${data.error || 'Failed to seed tasks'}` };
        }

        if (dryRun) {
          const taskList = data.tasks
            ?.slice(0, 10)
            .map((t: { id: string; title: string; deps: string[] }) => 
              `• ${t.id}: ${t.title}${t.deps.length ? ` (deps: ${t.deps.join(', ')})` : ''}`)
            .join('\n') || '';
          
          return {
            success: true,
            message: `🔍 **Dry run** — would seed **${data.tasks?.length || 0}** tasks from **${displayName}**:\n\n${taskList}${data.tasks?.length > 10 ? '\n...(truncated)' : ''}\n\n_Run without \`--dry-run\` to import._`,
          };
        }

        const errSummary = data.errors?.length 
          ? `\n\n⚠️ ${data.errors.length} errors:\n${data.errors.slice(0, 3).join('\n')}` 
          : '';

        return {
          success: true,
          message: `🌱 Seeded **${data.created}** tasks with **${data.dependencies}** dependencies from **${displayName}**${errSummary}\n\nTask Graph should update automatically.`,
          navigateTo: { screen: 'task-graph' },
        };
      } catch (e) {
        return { success: false, message: `❌ Failed to seed: ${e instanceof Error ? e.message : 'Network error'}` };
      }
    },
  },
  {
    name: 'assign',
    usage: '/assign <task> <agent>',
    help: 'Assign a task to an agent',
    minArgs: 2,
    maxArgs: 2,
    execute: async (cmd, ctx) => {
      const [taskRef, agentId] = cmd.args;
      
      // Try to find task in local state (for display info)
      const task = ctx.tasks.find(t => 
        t.id === taskRef || 
        t.id.includes(taskRef) || 
        t.title.toLowerCase().includes(taskRef.toLowerCase())
      );
      
      // Use found task ID or raw ref (API is source of truth)
      const taskId = task?.id || taskRef;
      const displayName = task?.title || taskId;

      try {
        const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignee: agentId }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { success: false, message: `❌ ${data.error || 'Failed to assign task'}` };
        }

        return {
          success: true,
          message: `✅ Assigned **${displayName}** to **${agentId}**`,
          navigateTo: { screen: 'task-graph', id: taskId },
        };
      } catch (e) {
        return { success: false, message: `❌ Failed to assign: ${e instanceof Error ? e.message : 'Network error'}` };
      }
    },
  },
  {
    name: 'approve',
    usage: '/approve <task>',
    help: 'Approve a task (mark as done)',
    minArgs: 1,
    maxArgs: 1,
    execute: async (cmd, ctx) => {
      const taskRef = cmd.args[0];
      
      // Try to find task in local state (for display info)
      const task = ctx.tasks.find(t => 
        t.id === taskRef || 
        t.id.includes(taskRef) || 
        t.title.toLowerCase().includes(taskRef.toLowerCase())
      );
      
      const taskId = task?.id || taskRef;
      const displayName = task?.title || taskId;

      // Note: we no longer require in-review status client-side
      // API/Beads will handle any status transition rules

      try {
        const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'done' }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { success: false, message: `❌ ${data.error || 'Failed to approve task'}` };
        }

        return {
          success: true,
          message: `✅ Approved: **${displayName}**`,
          navigateTo: { screen: 'task-graph', id: taskId },
        };
      } catch (e) {
        return { success: false, message: `❌ Failed to approve: ${e instanceof Error ? e.message : 'Network error'}` };
      }
    },
  },
  {
    name: 'reject',
    usage: '/reject <task> [reason]',
    help: 'Reject a task (send back to in-progress)',
    minArgs: 1,
    maxArgs: Infinity,
    execute: async (cmd, ctx) => {
      const taskRef = cmd.args[0];
      const reason = cmd.args.slice(1).join(' ') || 'No reason provided';
      
      // Try to find task in local state (for display info)
      const task = ctx.tasks.find(t => 
        t.id === taskRef || 
        t.id.includes(taskRef) || 
        t.title.toLowerCase().includes(taskRef.toLowerCase())
      );
      
      const taskId = task?.id || taskRef;
      const displayName = task?.title || taskId;

      try {
        const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'in-progress' }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { success: false, message: `❌ ${data.error || 'Failed to reject task'}` };
        }

        return {
          success: true,
          message: `🔄 Rejected: **${displayName}**\nReason: ${reason}`,
          navigateTo: { screen: 'task-graph', id: taskId },
        };
      } catch (e) {
        return { success: false, message: `❌ Failed to reject: ${e instanceof Error ? e.message : 'Network error'}` };
      }
    },
  },
  {
    name: 'run',
    usage: '/run <task>',
    help: 'Tell an agent to start working on a task',
    minArgs: 1,
    maxArgs: 1,
    execute: async (cmd, ctx) => {
      const taskRef = cmd.args[0];
      
      const task = ctx.tasks.find(t => 
        t.id === taskRef || 
        t.id.includes(taskRef) || 
        t.title.toLowerCase().includes(taskRef.toLowerCase())
      );
      
      if (!task) {
        return { success: false, message: `❌ Task "${taskRef}" not found.` };
      }
      
      return {
        success: true,
        message: `🚀 Would start: **${task.title}**\n\n_(Agent task execution not wired yet — coming later)_`,
        navigateTo: { screen: 'task-graph', id: task.id },
      };
    },
  },
  {
    name: 'help',
    usage: '/help [command]',
    help: 'Show available commands',
    minArgs: 0,
    maxArgs: 1,
    execute: async (cmd) => {
      const specificCmd = cmd.args[0]?.toLowerCase();
      
      if (specificCmd) {
        const def = COMMAND_DEFS.find(d => d.name === specificCmd);
        if (!def) {
          return { success: false, message: `❌ Unknown command: ${specificCmd}` };
        }
        return {
          success: true,
          message: `**${def.usage}**\n${def.help}`,
        };
      }
      
      const helpText = COMMAND_DEFS
        .map(d => `• \`${d.usage}\` — ${d.help}`)
        .join('\n');
      
      return {
        success: true,
        message: `**Available Commands**\n\n${helpText}\n\n_Tip: Also accepts \`clawde <command>\` format._`,
      };
    },
  },
];

/**
 * Execute a parsed command
 */
export async function executeCommand(
  cmd: ParsedCommand,
  ctx: CommandContext
): Promise<CommandResult> {
  const def = COMMAND_DEFS.find(d => d.name === cmd.name);
  
  if (!def) {
    return {
      success: false,
      message: `❌ Unknown command: \`${cmd.name}\`\n\nRun \`/help\` to see available commands.`,
    };
  }
  
  // Validate arg count
  if (cmd.args.length < def.minArgs) {
    return {
      success: false,
      message: `❌ Missing arguments.\n\nUsage: \`${def.usage}\``,
    };
  }
  
  if (cmd.args.length > def.maxArgs) {
    return {
      success: false,
      message: `❌ Too many arguments.\n\nUsage: \`${def.usage}\``,
    };
  }
  
  return def.execute(cmd, ctx);
}

/**
 * Get command definition by name
 */
export function getCommandDef(name: string): CommandDef | undefined {
  return COMMAND_DEFS.find(d => d.name === name);
}

/**
 * Get all command definitions (for autocomplete)
 */
export function getAllCommands(): Array<{ name: string; usage: string; help: string }> {
  return COMMAND_DEFS.map(d => ({ name: d.name, usage: d.usage, help: d.help }));
}
