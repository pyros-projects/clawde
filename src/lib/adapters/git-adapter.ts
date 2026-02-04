// File-based Git adapter
// Reads git log, diffs, and branches to populate events and review data

import type { VCSAdapter, DiffFile, DiffHunk, CommitInfo, Event, EventType } from '../types';

export class FileGitAdapter implements VCSAdapter {
  private projectRoot = '';

  async init(projectRoot: string): Promise<void> {
    this.projectRoot = projectRoot;
  }

  async getDiff(taskId: string): Promise<{ files: DiffFile[] }> {
    const { execSync } = await import('child_process');
    
    try {
      const diffRef = taskId || 'HEAD~1..HEAD';
      const raw = execSync(`git diff ${diffRef} --unified=3`, {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        timeout: 10000,
      });
      return { files: parseDiff(raw) };
    } catch {
      return { files: [] };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getCommits(taskId: string): Promise<CommitInfo[]> {
    const { execSync } = await import('child_process');
    
    try {
      const raw2 = execSync(
        `git log --format="%H%x09%h%x09%s%x09%an%x09%ae%x09%aI" -n 50`,
        {
          cwd: this.projectRoot,
          encoding: 'utf-8',
          timeout: 10000,
        }
      );

      return raw2.trim().split('\n').filter(Boolean).map(line => {
        const [sha, , message, author, , timestamp] = line.split('\t');
        return {
          sha: sha,
          message,
          author,
          timestamp,
          filesChanged: 0, // would need separate numstat call
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Convert git commits to ClawDE Events.
   * Maps git author to agent ID using the provided author→agent mapping.
   */
  async getCommitEvents(
    authorMap: Record<string, string>,
  ): Promise<Event[]> {
    const commits = await this.getCommits('');
    
    return commits.map((commit) => ({
      id: `git-${commit.sha.slice(0, 7)}`,
      type: 'commit' as EventType,
      payload: {
        sha: commit.sha.slice(0, 7),
        message: commit.message,
        author: commit.author,
        filesChanged: commit.filesChanged,
      },
      timestamp: commit.timestamp,
      agentId: authorMap[commit.author] || undefined,
    }));
  }
}

// ── Diff Parser ────────────────────────────────────────────

function parseDiff(raw: string): DiffFile[] {
  const files: DiffFile[] = [];
  const fileBlocks = raw.split(/^diff --git /m).filter(Boolean);

  for (const block of fileBlocks) {
    const lines = block.split('\n');
    
    // Extract file path
    const headerMatch = lines[0]?.match(/a\/(.+)\s+b\/(.+)/);
    if (!headerMatch) continue;
    const path = headerMatch[2];

    let additions = 0;
    let deletions = 0;
    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        if (currentHunk) hunks.push(currentHunk);
        currentHunk = { header: line, lines: [] };
      } else if (currentHunk) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          additions++;
          currentHunk.lines.push({ type: 'add', content: line.slice(1) });
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          deletions++;
          currentHunk.lines.push({ type: 'remove', content: line.slice(1) });
        } else if (line.startsWith(' ')) {
          currentHunk.lines.push({ type: 'context', content: line.slice(1) });
        }
      }
    }
    if (currentHunk) hunks.push(currentHunk);

    files.push({ path, additions, deletions, hunks });
  }

  return files;
}
