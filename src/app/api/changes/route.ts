// Changes API route (T13)
// Create and manage OpenSpec changes

import { NextRequest, NextResponse } from 'next/server';
import { getAdapterManager } from '@/lib/adapter-manager';
import fs from 'fs/promises';
import path from 'path';

interface CreateChangeRequest {
  name: string;
  description: string;
}

// GET — list changes
export async function GET() {
  try {
    const manager = getAdapterManager();
    let state = manager.getState();
    
    if (!state) {
      state = await manager.init();
      await manager.startWatching();
    }

    return NextResponse.json({ changes: state.changes });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list changes', details: String(error) },
      { status: 500 }
    );
  }
}

// POST — create a new change
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateChangeRequest;
    const { name, description } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Missing name or description' },
        { status: 400 }
      );
    }

    // Get project root
    const manager = getAdapterManager();
    let state = manager.getState();
    
    if (!state) {
      state = await manager.init();
      await manager.startWatching();
    }

    const projectRoot = state.project.root;
    
    // Sanitize name for directory
    const safeName = name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    if (!safeName) {
      return NextResponse.json(
        { error: 'Invalid change name' },
        { status: 400 }
      );
    }

    // Create change directory
    const changeDir = path.join(projectRoot, 'openspec', 'changes', safeName);
    
    // Check if exists
    try {
      await fs.access(changeDir);
      return NextResponse.json(
        { error: `Change "${safeName}" already exists` },
        { status: 409 }
      );
    } catch {
      // Directory doesn't exist, good to create
    }

    await fs.mkdir(changeDir, { recursive: true });

    // Create proposal.md
    const proposalContent = generateProposal(safeName, description);
    await fs.writeFile(path.join(changeDir, 'proposal.md'), proposalContent);

    // File watcher will pick up the change
    // Return immediately with the change ID
    return NextResponse.json({
      success: true,
      changeId: safeName,
      path: changeDir,
      message: `Created change: ${safeName}`,
    });
  } catch (error) {
    console.error('[changes] Error creating change:', error);
    return NextResponse.json(
      { error: 'Failed to create change', details: String(error) },
      { status: 500 }
    );
  }
}

function generateProposal(name: string, description: string): string {
  const date = new Date().toISOString().split('T')[0];
  
  return `# ${name}

**Status:** Active
**Created:** ${date}

## Summary

${description}

## Motivation

_Why is this change needed? What problem does it solve?_

## Proposed Solution

_High-level description of what will be built._

## Tasks

_Run \`/plan ${name}\` (or \`clawde plan ${name}\`) to generate tasks, or add them manually below._

## Open Questions

- _Any unknowns or decisions to be made?_
`;
}
