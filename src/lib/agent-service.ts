// Agent Connection Service (T11)
// Connects to OpenClaw gateway via OpenAI-compatible chat completions API

import type { AgentConfig, ProjectContext } from './types';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface AgentConnection {
  agentId: string;
  status: ConnectionStatus;
  error?: string;
  lastPing?: string;
}

interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: { content?: string; role?: string };
    finish_reason: string | null;
  }>;
}

export class AgentService {
  private connections: Map<string, AgentConnection> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();

  /**
   * Test connection to an agent's gateway
   */
  async ping(agent: AgentConfig): Promise<boolean> {
    if (agent.connection.type !== 'openclaw' || !agent.connection.gateway) {
      return false;
    }

    try {
      const response = await fetch(`${agent.connection.gateway}/v1/chat/completions`, {
        method: 'OPTIONS',
        signal: AbortSignal.timeout(3000),
      });
      // Even a 405 means the endpoint exists
      return response.status !== 404;
    } catch {
      return false;
    }
  }

  /**
   * Update connection status for an agent
   */
  setStatus(agentId: string, status: ConnectionStatus, error?: string): void {
    const existing = this.connections.get(agentId);
    this.connections.set(agentId, {
      agentId,
      status,
      error,
      lastPing: existing?.lastPing,
    });
  }

  /**
   * Get connection status
   */
  getConnection(agentId: string): AgentConnection | undefined {
    return this.connections.get(agentId);
  }

  /**
   * Get all connections
   */
  getAllConnections(): AgentConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Send a message to an agent and stream the response
   */
  async *sendMessage(
    agent: AgentConfig,
    messages: ChatCompletionMessage[],
    projectContext?: ProjectContext
  ): AsyncGenerator<string, void, unknown> {
    if (agent.connection.type !== 'openclaw' || !agent.connection.gateway) {
      yield `[Error: Agent ${agent.name} does not have an OpenClaw gateway configured]`;
      return;
    }

    const gateway = agent.connection.gateway;
    const agentId = agent.id;

    // Cancel any existing request for this agent
    this.abortControllers.get(agentId)?.abort();
    const controller = new AbortController();
    this.abortControllers.set(agentId, controller);

    this.setStatus(agentId, 'connecting');

    try {
      // Add project context as system message if available
      const systemMessages: ChatCompletionMessage[] = [];
      if (projectContext) {
        systemMessages.push({
          role: 'system',
          content: buildProjectContextPrompt(projectContext),
        });
      }

      const response = await fetch(`${gateway}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openclaw-agent-id': 'main', // Route to main agent
        },
        body: JSON.stringify({
          model: 'openclaw',
          stream: true,
          messages: [...systemMessages, ...messages],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        this.setStatus(agentId, 'error', `HTTP ${response.status}: ${text}`);
        yield `[Error: ${response.status} - ${text || 'Failed to connect'}]`;
        return;
      }

      this.setStatus(agentId, 'connected');

      const reader = response.body?.getReader();
      if (!reader) {
        yield '[Error: No response body]';
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const chunk = JSON.parse(data) as StreamChunk;
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.setStatus(agentId, 'disconnected');
        return;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.setStatus(agentId, 'error', message);
      yield `[Error: ${message}]`;
    } finally {
      this.abortControllers.delete(agentId);
    }
  }

  /**
   * Send a message and collect the full response (non-streaming)
   */
  async sendMessageFull(
    agent: AgentConfig,
    messages: ChatCompletionMessage[],
    projectContext?: ProjectContext
  ): Promise<string> {
    let result = '';
    for await (const chunk of this.sendMessage(agent, messages, projectContext)) {
      result += chunk;
    }
    return result;
  }

  /**
   * Cancel an ongoing request
   */
  cancel(agentId: string): void {
    this.abortControllers.get(agentId)?.abort();
    this.setStatus(agentId, 'disconnected');
  }
}

/**
 * Build a system prompt with project context
 */
function buildProjectContextPrompt(ctx: ProjectContext): string {
  const lines = [
    `You are assisting with the project "${ctx.name}" located at ${ctx.root}.`,
    '',
    'Project capabilities:',
  ];

  if (ctx.hasOpenSpec) lines.push('- OpenSpec: ✓ (spec-driven development)');
  if (ctx.hasBeads) lines.push('- Beads: ✓ (task graph management)');
  if (ctx.hasGit) lines.push('- Git: ✓ (version control)');

  lines.push('');
  lines.push('Available commands:');
  lines.push('- /new <desc> — Create a new change');
  lines.push('- /plan [change] — Generate tasks from a change');
  lines.push('- /seed [change] — Import tasks to Beads');
  lines.push('- /assign <task> <agent> — Assign a task');
  lines.push('- /status — Show project status');
  lines.push('- /approve <task> — Approve a task');
  lines.push('- /reject <task> [reason] — Reject a task');

  return lines.join('\n');
}

// Singleton instance
let _agentService: AgentService | null = null;

export function getAgentService(): AgentService {
  if (!_agentService) {
    _agentService = new AgentService();
  }
  return _agentService;
}
