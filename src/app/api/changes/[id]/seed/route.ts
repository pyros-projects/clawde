// Seed API route (T15)
// Parse tasks.md and import into Beads task graph

import { NextRequest, NextResponse } from 'next/server';
import { getAdapterManager } from '@/lib/adapter-manager';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface SeedRequest {
  dryRun?: boolean;
  prefix?: string; // Task ID prefix (default: change name)
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface ParsedTask {
  id: string;        // e.g., "T1"
  title: string;
  description: string;
  deps: string[];    // e.g., ["T1", "T2"]
  phase: string;
}

// POST /api/changes/[id]/seed — import tasks to Beads
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: rawChangeId } = await context.params;
    const body = (await request.json()) as SeedRequest;
    const dryRun = body.dryRun ?? false;

    // Sanitize changeId to prevent path traversal
    const changeId = rawChangeId
      .replace(/[^a-z0-9-]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    if (!changeId) {
      return NextResponse.json(
        { error: 'Invalid change ID' },
        { status: 400 }
      );
    }

    // Get project state
    const manager = getAdapterManager();
    let state = manager.getState();
    
    if (!state) {
      state = await manager.init();
      await manager.startWatching();
    }

    const projectRoot = state.project.root;
    const changesRoot = path.resolve(projectRoot, 'openspec', 'changes');
    const changeDir = path.resolve(changesRoot, changeId);

    // Defense in depth: resolved path must be within changesRoot
    if (!changeDir.startsWith(changesRoot + path.sep)) {
      return NextResponse.json(
        { error: 'Invalid change ID' },
        { status: 400 }
      );
    }

    // Check if change exists
    try {
      await fs.access(changeDir);
    } catch {
      return NextResponse.json(
        { error: `Change "${changeId}" not found` },
        { status: 404 }
      );
    }

    // Read tasks.md
    const tasksPath = path.join(changeDir, 'tasks.md');
    let tasksContent: string;
    try {
      tasksContent = await fs.readFile(tasksPath, 'utf-8');
    } catch {
      return NextResponse.json(
        { error: `No tasks.md found for change "${changeId}". Run /plan first.` },
        { status: 404 }
      );
    }

    // Parse tasks
    const tasks = parseTasksMd(tasksContent);
    if (tasks.length === 0) {
      return NextResponse.json(
        { error: 'No tasks found in tasks.md' },
        { status: 400 }
      );
    }

    // Check if Beads is available
    if (!state.project.hasBeads) {
      return NextResponse.json(
        { error: 'Beads not initialized in this project. Run `bd init` first.' },
        { status: 400 }
      );
    }

    // Generate task prefix from change name
    const prefix = body.prefix || changeId.slice(0, 10);

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        changeId,
        tasks: tasks.map(t => ({
          id: `${prefix}-${t.id}`,
          title: t.title,
          deps: t.deps.map(d => `${prefix}-${d}`),
          phase: t.phase,
        })),
        message: `Would create ${tasks.length} tasks (dry run)`,
      });
    }

    // Create tasks in Beads
    const created: string[] = [];
    const errors: string[] = [];
    const taskIdMap: Record<string, string> = {}; // T1 -> actual beads ID

    for (const task of tasks) {
      try {
        // bd add --title "..." returns the created issue ID
        const { stdout } = await execAsync(
          `bd add --title "${escapeShell(task.title)}" --json`,
          { cwd: projectRoot }
        );
        
        const result = JSON.parse(stdout.trim());
        const beadsId = result.id || result.issue?.id;
        
        if (beadsId) {
          taskIdMap[task.id] = beadsId;
          created.push(beadsId);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Failed to create ${task.id}: ${msg}`);
      }
    }

    // Now add dependencies
    const depsCreated: string[] = [];
    for (const task of tasks) {
      if (task.deps.length === 0) continue;
      
      const beadsId = taskIdMap[task.id];
      if (!beadsId) continue;

      for (const depRef of task.deps) {
        const depBeadsId = taskIdMap[depRef];
        if (!depBeadsId) {
          errors.push(`Dep ${depRef} not found for ${task.id}`);
          continue;
        }

        try {
          await execAsync(
            `bd dep ${beadsId} ${depBeadsId}`,
            { cwd: projectRoot }
          );
          depsCreated.push(`${beadsId} -> ${depBeadsId}`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`Failed to add dep ${task.id} -> ${depRef}: ${msg}`);
        }
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      changeId,
      created: created.length,
      dependencies: depsCreated.length,
      taskIds: taskIdMap,
      errors: errors.length > 0 ? errors : undefined,
      message: `Created ${created.length} tasks with ${depsCreated.length} dependencies${errors.length > 0 ? ` (${errors.length} errors)` : ''}`,
    });
  } catch (error) {
    console.error('[seed] Error:', error);
    return NextResponse.json(
      { error: 'Failed to seed tasks', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Parse tasks.md content into structured tasks
 */
function parseTasksMd(content: string): ParsedTask[] {
  const tasks: ParsedTask[] = [];
  let currentPhase = 'Phase 1';

  // Match phase headers: ## Phase N: Name
  const phaseRegex = /^##\s+Phase\s+\d+[:\s]+(.+)$/gm;
  
  // Match task headers: ### T<n>: Title
  const taskRegex = /^###\s+(T\d+)[:\s]+(.+)$/gm;
  
  // Split into lines for processing
  const lines = content.split('\n');
  let currentTask: ParsedTask | null = null;
  const descLines: string[] = [];

  for (const line of lines) {
    // Check for phase header
    const phaseMatch = line.match(/^##\s+Phase\s+\d+[:\s]+(.+)$/);
    if (phaseMatch) {
      // Save previous task if exists
      if (currentTask) {
        currentTask.description = descLines.join('\n').trim();
        tasks.push(currentTask);
        descLines.length = 0;
      }
      currentPhase = phaseMatch[1].trim();
      currentTask = null;
      continue;
    }

    // Check for task header
    const taskMatch = line.match(/^###\s+(T\d+)[:\s]+(.+)$/);
    if (taskMatch) {
      // Save previous task if exists
      if (currentTask) {
        currentTask.description = descLines.join('\n').trim();
        tasks.push(currentTask);
        descLines.length = 0;
      }
      
      currentTask = {
        id: taskMatch[1],
        title: taskMatch[2].trim(),
        description: '',
        deps: [],
        phase: currentPhase,
      };
      continue;
    }

    // Check for deps line
    if (currentTask && line.includes('**Deps:**')) {
      const depsMatch = line.match(/\*\*Deps:\*\*\s*(.+)/i);
      if (depsMatch) {
        const depsStr = depsMatch[1].trim();
        if (depsStr.toLowerCase() !== 'none') {
          // Parse comma-separated deps: "T1, T2" or "T1,T2"
          currentTask.deps = depsStr
            .split(/[,\s]+/)
            .map(d => d.trim())
            .filter(d => /^T\d+$/i.test(d))
            .map(d => d.toUpperCase());
        }
      }
      continue;
    }

    // Accumulate description lines
    if (currentTask && line.trim()) {
      descLines.push(line);
    }
  }

  // Save last task
  if (currentTask) {
    currentTask.description = descLines.join('\n').trim();
    tasks.push(currentTask);
  }

  return tasks;
}

/**
 * Escape string for shell command
 */
function escapeShell(str: string): string {
  return str.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}
