// Chat API route (T11)
// Proxies chat messages to agent gateways

import { NextRequest } from 'next/server';
import { getAdapterManager } from '@/lib/adapter-manager';

interface ChatRequest {
  agentId: string;
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;
    const { agentId, message, history = [] } = body;

    // Get or initialize project state
    const manager = getAdapterManager();
    let state = manager.getState();
    
    if (!state) {
      // Auto-initialize on first chat request
      state = await manager.init();
      await manager.startWatching();
    }

    // Find agent config
    const agentConfig = state.project.config.agents.find(a => a.id === agentId);
    if (!agentConfig) {
      return Response.json(
        { error: `Agent "${agentId}" not found in project config` },
        { status: 404 }
      );
    }

    // Check connection type
    if (agentConfig.connection.type !== 'openclaw' || !agentConfig.connection.gateway) {
      return Response.json(
        { error: `Agent "${agentId}" does not have an OpenClaw gateway configured` },
        { status: 400 }
      );
    }

    const gateway = agentConfig.connection.gateway;

    // Build messages array
    const systemPrompt = buildSystemPrompt(state);
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history,
      { role: 'user' as const, content: message },
    ];

    // Forward to agent gateway with streaming
    const response = await fetch(`${gateway}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': 'main',
      },
      body: JSON.stringify({
        model: 'openclaw',
        stream: true,
        messages,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      
      // Check if it's a "not enabled" error
      if (response.status === 405) {
        return Response.json(
          { 
            error: 'Agent gateway does not have chat completions enabled',
            hint: 'Enable gateway.http.endpoints.chatCompletions in your OpenClaw config',
          },
          { status: 503 }
        );
      }
      
      return Response.json(
        { error: `Gateway error: ${response.status} - ${text}` },
        { status: response.status }
      );
    }

    // Stream the response back
    const readable = response.body;
    if (!readable) {
      return Response.json(
        { error: 'No response body from gateway' },
        { status: 500 }
      );
    }

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[chat] Error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

function buildSystemPrompt(state: { project: { name: string; root: string; hasOpenSpec: boolean; hasBeads: boolean; hasGit: boolean }; tasks: Array<{ status: string }>; changes: Array<{ status: string }> }): string {
  const { project, tasks, changes } = state;
  
  const taskStats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    inReview: tasks.filter(t => t.status === 'in-review').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    ready: tasks.filter(t => t.status === 'ready' || t.status === 'open').length,
  };

  return `You are a ClawDE assistant helping with the project "${project.name}".

Project root: ${project.root}
Capabilities: ${[
    project.hasOpenSpec ? 'OpenSpec' : null,
    project.hasBeads ? 'Beads' : null,
    project.hasGit ? 'Git' : null,
  ].filter(Boolean).join(', ')}

Current status:
- ${taskStats.total} tasks total
- ${taskStats.done} done, ${taskStats.inProgress} in progress, ${taskStats.inReview} in review
- ${taskStats.blocked} blocked, ${taskStats.ready} ready
- ${changes.length} changes tracked

Available commands:
- /new <desc> — Create a new change
- /plan [change] — Generate tasks from a change
- /seed [change] — Import tasks to Beads
- /assign <task> <agent> — Assign a task
- /status — Show project status
- /approve <task> — Approve a task
- /reject <task> [reason] — Reject a task

Be concise and helpful. When the user uses a slash command, acknowledge it and explain what would happen (actual execution comes later).`;
}

// GET for connection testing
export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agentId');
  
  if (!agentId) {
    return Response.json({ status: 'ok', endpoint: '/api/chat' });
  }

  const manager = getAdapterManager();
  let state = manager.getState();
  
  if (!state) {
    // Auto-initialize
    try {
      state = await manager.init();
      await manager.startWatching();
    } catch {
      return Response.json({ connected: false, reason: 'Failed to initialize project' });
    }
  }

  const agentConfig = state.project.config.agents.find(a => a.id === agentId);
  if (!agentConfig) {
    return Response.json({ connected: false, reason: 'Agent not found' });
  }

  if (agentConfig.connection.type !== 'openclaw' || !agentConfig.connection.gateway) {
    return Response.json({ connected: false, reason: 'No gateway configured' });
  }

  try {
    const response = await fetch(`${agentConfig.connection.gateway}/v1/chat/completions`, {
      method: 'OPTIONS',
      signal: AbortSignal.timeout(3000),
    });
    
    // 405 means endpoint exists but method not allowed (which is fine for OPTIONS)
    // 404 means endpoint doesn't exist
    const available = response.status !== 404;
    
    return Response.json({
      connected: available,
      gateway: agentConfig.connection.gateway,
      status: response.status,
    });
  } catch {
    return Response.json({ connected: false, reason: 'Gateway unreachable' });
  }
}
