// Project discovery and configuration
// Scans filesystem for project capabilities and reads .clawde/config.yaml

import {
  ProjectContext,
  ClawDEConfig,
  AgentConfig,
  DEFAULT_SETTINGS,
} from './types';

/**
 * Discover project context from a root directory.
 * Checks for .git/, openspec/, .beads/, .clawde/ and reads config.
 */
export async function discoverProject(root: string): Promise<ProjectContext> {
  // In browser/static context, we can't access the filesystem
  // This function is designed to run server-side (API routes)
  // For now, return a placeholder that will be populated by the server
  
  const name = root.split('/').pop() || 'unknown';
  
  return {
    root,
    name,
    hasOpenSpec: false,
    hasBeads: false,
    hasGit: false,
    hasClawDEConfig: false,
    config: {
      agents: [],
      settings: { ...DEFAULT_SETTINGS },
    },
  };
}

/**
 * Server-side project discovery (uses fs).
 * Only call from API routes / server actions.
 */
export async function discoverProjectServer(root: string): Promise<ProjectContext> {
  const { existsSync, readFileSync } = await import('fs');
  const { join, basename } = await import('path');

  const hasGit = existsSync(join(root, '.git'));
  const hasOpenSpec = existsSync(join(root, 'openspec'));
  const hasBeads = existsSync(join(root, '.beads'));
  const hasClawDEConfig = existsSync(join(root, '.clawde'));

  let config: ClawDEConfig = {
    agents: [],
    settings: { ...DEFAULT_SETTINGS },
  };

  if (hasClawDEConfig) {
    try {
      const configPath = join(root, '.clawde', 'config.yaml');
      if (existsSync(configPath)) {
        const raw = readFileSync(configPath, 'utf-8');
        config = parseConfig(raw);
      }
    } catch {
      // Config parse error — use defaults
    }
  }

  // Name from package.json or directory name
  let name = basename(root);
  try {
    const pkgPath = join(root, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) name = pkg.name;
    }
  } catch {
    // Use directory name
  }

  return {
    root,
    name,
    hasOpenSpec,
    hasBeads,
    hasGit,
    hasClawDEConfig,
    config,
  };
}

/**
 * Parse .clawde/config.yaml content.
 * Uses a simple YAML-like parser for the subset we need.
 * In production, we'd use a real YAML parser.
 */
export function parseConfig(raw: string): ClawDEConfig {
  // For v1, we'll use JSON as the config format (simpler, no yaml dep needed)
  // The file can be .clawde/config.json
  try {
    const parsed = JSON.parse(raw);
    return {
      agents: (parsed.agents || []).map(parseAgentConfig),
      settings: {
        ...DEFAULT_SETTINGS,
        ...parsed.settings,
      },
    };
  } catch {
    return {
      agents: [],
      settings: { ...DEFAULT_SETTINGS },
    };
  }
}

function parseAgentConfig(raw: Record<string, unknown>): AgentConfig {
  return {
    id: String(raw.id || 'unknown'),
    name: String(raw.name || raw.id || 'Unknown'),
    provider: String(raw.provider || 'unknown'),
    model: String(raw.model || 'unknown'),
    color: String(raw.color || '#64748b'),
    capabilities: Array.isArray(raw.capabilities)
      ? raw.capabilities.map(String)
      : [],
    connection: {
      type: (raw.connection as Record<string, unknown>)?.type as 'openclaw' | 'cli' | 'http' || 'openclaw',
      gateway: String((raw.connection as Record<string, unknown>)?.gateway || ''),
    },
  };
}

/**
 * Generate a default .clawde/config.json for a new project.
 */
export function generateDefaultConfig(): string {
  const config = {
    agents: [
      {
        id: 'claude',
        name: 'Claude',
        provider: 'Anthropic',
        model: 'claude-opus-4-5',
        color: '#f97316',
        capabilities: ['coding', 'architecture', 'review', 'documentation', 'git-write'],
        connection: {
          type: 'openclaw',
          gateway: 'http://localhost:18789',
        },
      },
    ],
    settings: {
      confirmDestructive: true,
      maxActionsPerMinute: 30,
      watchDebounceMs: 100,
      defaultAgent: 'claude',
    },
  };
  return JSON.stringify(config, null, 2);
}
