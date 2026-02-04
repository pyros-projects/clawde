// Task update API route (T16/T17)
// Update task assignee, status, and other fields via Beads

import { NextRequest, NextResponse } from 'next/server';
import { getAdapterManager } from '@/lib/adapter-manager';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface UpdateTaskRequest {
  assignee?: string;
  status?: 'open' | 'ready' | 'in-progress' | 'in-review' | 'blocked' | 'done';
  priority?: string;
  title?: string;
}

// Map ClawDE status → Beads status
// ClawDE: open, ready, in-progress, in-review, blocked, done
// Beads:  open, in_progress, blocked, closed
function mapToBeadsStatus(clawdeStatus: string): string {
  const mapping: Record<string, string> = {
    'open': 'open',
    'ready': 'open',           // ready = open (no blockers)
    'in-progress': 'in_progress',
    'in-review': 'in_progress', // in-review still active work
    'blocked': 'blocked',
    'done': 'closed',
  };
  return mapping[clawdeStatus] || clawdeStatus;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/tasks/[id] — update task fields
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: taskId } = await context.params;
    const body = (await request.json()) as UpdateTaskRequest;

    // Validate taskId format (basic sanitization)
    if (!taskId || !/^[a-z0-9-]+$/i.test(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID format' },
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

    // Check if Beads is available
    if (!state.project.hasBeads) {
      return NextResponse.json(
        { error: 'Beads not initialized in this project' },
        { status: 400 }
      );
    }

    // Build bd update args
    const args: string[] = ['update', taskId, '--json'];

    if (body.assignee !== undefined) {
      args.push('--assignee', body.assignee);
    }
    if (body.status !== undefined) {
      // Map ClawDE status to Beads status
      const beadsStatus = mapToBeadsStatus(body.status);
      args.push('--status', beadsStatus);
    }
    if (body.priority !== undefined) {
      args.push('--priority', body.priority);
    }
    if (body.title !== undefined) {
      args.push('--title', body.title);
    }

    // Must have at least one field to update
    if (args.length <= 3) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    try {
      const { stdout, stderr } = await execFileAsync('bd', args, {
        cwd: projectRoot,
        timeout: 15000,
      });

      // Parse result
      let result;
      try {
        result = JSON.parse(stdout.trim());
      } catch {
        // bd might not return JSON on success, that's ok
        result = { success: true, output: stdout.trim() };
      }

      return NextResponse.json({
        success: true,
        taskId,
        updates: body,
        result,
        message: `Updated task ${taskId}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      
      // Check for common errors
      if (msg.includes('not found') || msg.includes('no such issue')) {
        return NextResponse.json(
          { error: `Task "${taskId}" not found` },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: `Failed to update task: ${msg}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[tasks/update] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update task', details: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/tasks/[id] — get task details
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: taskId } = await context.params;

    // Validate taskId format
    if (!taskId || !/^[a-z0-9-]+$/i.test(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID format' },
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

    if (!state.project.hasBeads) {
      return NextResponse.json(
        { error: 'Beads not initialized in this project' },
        { status: 400 }
      );
    }

    try {
      const { stdout } = await execFileAsync('bd', ['show', taskId, '--json'], {
        cwd: projectRoot,
        timeout: 10000,
      });

      const task = JSON.parse(stdout.trim());
      return NextResponse.json({ task });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      
      if (msg.includes('not found') || msg.includes('no such issue')) {
        return NextResponse.json(
          { error: `Task "${taskId}" not found` },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: `Failed to get task: ${msg}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[tasks/get] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get task', details: String(error) },
      { status: 500 }
    );
  }
}
