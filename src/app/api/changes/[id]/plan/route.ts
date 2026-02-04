// Plan API route (T14)
// Generate tasks from a change proposal using AI agent

import { NextRequest, NextResponse } from 'next/server';
import { getAdapterManager } from '@/lib/adapter-manager';
import fs from 'fs/promises';
import path from 'path';

interface PlanRequest {
  dryRun?: boolean;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/changes/[id]/plan — generate tasks from proposal
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: rawChangeId } = await context.params;
    const body = (await request.json()) as PlanRequest;
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

    // Double-check: resolved path must be within changesRoot (defense in depth)
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

    // Read proposal.md
    const proposalPath = path.join(changeDir, 'proposal.md');
    let proposal: string;
    try {
      proposal = await fs.readFile(proposalPath, 'utf-8');
    } catch {
      return NextResponse.json(
        { error: `No proposal.md found for change "${changeId}"` },
        { status: 404 }
      );
    }

    // Check for existing tasks.md
    const tasksPath = path.join(changeDir, 'tasks.md');
    let existingTasks: string | null = null;
    try {
      existingTasks = await fs.readFile(tasksPath, 'utf-8');
    } catch {
      // No existing tasks, that's fine
    }

    // Generate tasks using agent
    const tasksContent = await generateTasksFromProposal(changeId, proposal, existingTasks);

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        changeId,
        preview: tasksContent,
        message: `Preview of tasks for "${changeId}" (dry run — not written)`,
      });
    }

    // Write tasks.md
    await fs.writeFile(tasksPath, tasksContent);

    // Parse task count for response
    const taskMatches = tasksContent.match(/^### T\d+:/gm);
    const taskCount = taskMatches?.length ?? 0;

    return NextResponse.json({
      success: true,
      changeId,
      tasksPath,
      taskCount,
      message: `Generated ${taskCount} tasks for "${changeId}"`,
    });
  } catch (error) {
    console.error('[plan] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate tasks', details: String(error) },
      { status: 500 }
    );
  }
}

async function generateTasksFromProposal(
  changeId: string,
  proposal: string,
  existingTasks: string | null
): Promise<string> {
  // Try to call the agent via /api/chat
  const systemPrompt = `You are a task decomposition assistant for ClawDE, an AI development orchestration tool.

Your job is to read a feature proposal and generate a structured task breakdown in Markdown format.

Output ONLY the tasks.md content, nothing else. Follow this format exactly:

# ${changeId} — Tasks

## Phase 1: [Phase Name]

### T1: [Task Title]
- [Requirement 1]
- [Requirement 2]
- **Deps:** none

### T2: [Task Title]
- [Requirement]
- **Deps:** T1

## Phase 2: [Phase Name]
...

Guidelines:
- Use phases to group related work (Foundation, Core, Polish, etc.)
- Each task should be completable in 1-4 hours
- List concrete requirements as bullet points
- Always include **Deps:** line (comma-separated task refs, or "none")
- Use T1, T2, T3... numbering within each change
- Be specific — avoid vague tasks like "implement feature"`;

  const userPrompt = existingTasks
    ? `Here's a feature proposal. There are existing tasks that may need updates.

## Proposal
${proposal}

## Existing Tasks
${existingTasks}

Please regenerate/refine the tasks based on the current proposal state.`
    : `Here's a feature proposal. Please generate a task breakdown.

## Proposal
${proposal}`;

  try {
    const response = await fetch(new URL('/api/chat', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').href, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Handle both streaming and non-streaming responses
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content.trim();
    }

    throw new Error('Unexpected response format from chat API');
  } catch (error) {
    console.warn('[plan] Agent call failed, using template fallback:', error);
    // Fallback: generate a template that the user can fill in
    return generateFallbackTemplate(changeId, proposal);
  }
}

function generateFallbackTemplate(changeId: string, proposal: string): string {
  // Extract title from proposal (first heading)
  const titleMatch = proposal.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1] || changeId;

  // Try to extract any task hints from proposal
  const taskSection = proposal.match(/##\s*Tasks?\s*\n([\s\S]*?)(?=\n##|$)/i);
  const taskHints = taskSection?.[1]?.trim() || '';

  return `# ${changeId} — Tasks

> ⚠️ Auto-generated template. Agent planning unavailable — please refine manually.

## Phase 1: Foundation

### T1: Initial setup
- Set up base structure
- Define interfaces/types
- **Deps:** none

### T2: Core implementation
- Implement main functionality from proposal
${taskHints ? `- Hints from proposal:\n${taskHints.split('\n').map(l => `  ${l}`).join('\n')}` : '- [Add specific requirements]'}
- **Deps:** T1

## Phase 2: Integration

### T3: Wire up to UI/system
- Connect to existing components
- Add necessary API routes
- **Deps:** T2

## Phase 3: Polish

### T4: Testing and refinement
- Add tests
- Handle edge cases
- Documentation
- **Deps:** T3

---
_Original proposal: ${title}_
`;
}
