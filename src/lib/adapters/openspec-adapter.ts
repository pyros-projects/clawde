// File-based OpenSpec adapter
// Reads openspec/changes/*/ directories to populate Change and Artifact data

import type { SpecAdapter, Change, Artifact, ArtifactType, ChangeStatus } from '../types';

const ARTIFACT_TYPES: ArtifactType[] = ['proposal', 'specs', 'design', 'tasks'];

export class FileOpenSpecAdapter implements SpecAdapter {
  private projectRoot = '';
  private changes: Change[] = [];

  async init(projectRoot: string): Promise<void> {
    this.projectRoot = projectRoot;
    await this.refresh();
  }

  async refresh(): Promise<void> {
    // Server-side only — reads filesystem
    const { existsSync, readdirSync, readFileSync, statSync } = await import('fs');
    const { join } = await import('path');

    const openspecDir = join(this.projectRoot, 'openspec', 'changes');
    if (!existsSync(openspecDir)) {
      this.changes = [];
      return;
    }

    const changeDirs = readdirSync(openspecDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    this.changes = changeDirs.map(dirName => {
      const changeDir = join(openspecDir, dirName);
      const artifacts: Artifact[] = [];
      let latestUpdate = new Date(0);

      // Scan for artifact files
      for (const type of ARTIFACT_TYPES) {
        const candidates = [
          `${type}.md`,
          `${type}/index.md`,
          `${type}/README.md`,
        ];

        for (const candidate of candidates) {
          const filePath = join(changeDir, candidate);
          if (existsSync(filePath)) {
            const stat = statSync(filePath);
            const content = readFileSync(filePath, 'utf-8');
            const title = extractTitle(content) || `${type} (${dirName})`;

            if (stat.mtime > latestUpdate) latestUpdate = stat.mtime;

            artifacts.push({
              id: `${dirName}-${type}`,
              type,
              path: filePath,
              title,
              content,
              lastUpdated: stat.mtime.toISOString(),
              stale: false, // TODO: compare with implementation
              changeId: dirName,
            });
            break; // found this artifact type
          }
        }
      }

      // Detect stale: if tasks.md exists and is older than proposal.md
      const proposalArt = artifacts.find(a => a.type === 'proposal');
      const tasksArt = artifacts.find(a => a.type === 'tasks');
      if (proposalArt && tasksArt) {
        const proposalTime = new Date(proposalArt.lastUpdated).getTime();
        const tasksTime = new Date(tasksArt.lastUpdated).getTime();
        if (proposalTime > tasksTime) {
          tasksArt.stale = true;
        }
      }

      // Infer status from artifacts present
      const status = inferChangeStatus(artifacts);

      // Extract task IDs from tasks.md if present
      const taskIds = tasksArt?.content
        ? extractTaskIds(tasksArt.content)
        : [];

      // Extract description from proposal
      const description = proposalArt?.content
        ? extractDescription(proposalArt.content)
        : `Change: ${dirName}`;

      // Extract name from proposal title or directory name
      const name = proposalArt?.title || dirName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      return {
        id: dirName,
        name,
        description,
        status,
        artifacts,
        taskIds,
        createdAt: latestUpdate.toISOString(),
        updatedAt: latestUpdate.toISOString(),
      } satisfies Change;
    });
  }

  async getChanges(): Promise<Change[]> {
    return this.changes;
  }

  async getChange(id: string): Promise<Change | null> {
    return this.changes.find(c => c.id === id) || null;
  }

  async getArtifact(changeId: string, type: ArtifactType): Promise<Artifact | null> {
    const change = this.changes.find(c => c.id === changeId);
    return change?.artifacts.find(a => a.type === type) || null;
  }

  async getArtifacts(changeId: string): Promise<Artifact[]> {
    const change = this.changes.find(c => c.id === changeId);
    return change?.artifacts || [];
  }
}

// ── Helpers ────────────────────────────────────────────────

function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '';
}

function extractDescription(markdown: string): string {
  // First non-heading, non-empty paragraph
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('|') && !trimmed.startsWith('-')) {
      return trimmed.slice(0, 200);
    }
  }
  return '';
}

function extractTaskIds(tasksContent: string): string[] {
  // Match ### T1:, ### T2:, etc.
  const matches = tasksContent.matchAll(/###\s+(T\d+)/g);
  return [...matches].map(m => m[1]);
}

function inferChangeStatus(artifacts: Artifact[]): ChangeStatus {
  if (artifacts.length === 0) return 'active';
  const hasProposal = artifacts.some(a => a.type === 'proposal');
  const hasTasks = artifacts.some(a => a.type === 'tasks');
  const hasSpecs = artifacts.some(a => a.type === 'specs');

  if (hasTasks) return 'implementing';
  if (hasSpecs) return 'implementing';
  if (hasProposal) return 'active';
  return 'active';
}
