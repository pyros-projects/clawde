// File watcher service (T6)
// Watches repo directories for changes and triggers adapter refreshes
// SERVER-ONLY: runs in the Next.js server process, not in the browser

type WatchCallback = (event: 'change' | 'add' | 'unlink', path: string) => void;

interface WatcherConfig {
  projectRoot: string;
  debounceMs: number;
  onOpenSpecChange?: WatchCallback;
  onBeadsChange?: WatchCallback;
  onGitChange?: WatchCallback;
  onConfigChange?: WatchCallback;
  onAnyChange?: WatchCallback;
}

export class FileWatcher {
  private watchers: Array<{ close: () => void }> = [];
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private config: WatcherConfig;
  private running = false;

  constructor(config: WatcherConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    const fs = await import('fs');
    const path = await import('path');
    const root = this.config.projectRoot;

    // Watch directories that exist
    const watchTargets: Array<{
      dir: string;
      callback?: WatchCallback;
      category: string;
    }> = [
      {
        dir: path.join(root, 'openspec'),
        callback: this.config.onOpenSpecChange,
        category: 'openspec',
      },
      {
        dir: path.join(root, '.beads'),
        callback: this.config.onBeadsChange,
        category: 'beads',
      },
      {
        dir: path.join(root, '.git', 'refs'),
        callback: this.config.onGitChange,
        category: 'git',
      },
      {
        dir: path.join(root, '.clawde'),
        callback: this.config.onConfigChange,
        category: 'config',
      },
    ];

    for (const target of watchTargets) {
      if (!fs.existsSync(target.dir)) continue;

      try {
        const watcher = fs.watch(
          target.dir,
          { recursive: true },
          (eventType, filename) => {
            if (!filename) return;
            const fullPath = path.join(target.dir, filename);
            const event = eventType === 'rename' ? 'add' : 'change';

            // Debounce per category
            this.debounced(target.category, () => {
              target.callback?.(event, fullPath);
              this.config.onAnyChange?.(event, fullPath);
            });
          }
        );

        this.watchers.push(watcher);
      } catch {
        // Directory not watchable — skip silently
      }
    }
  }

  stop(): void {
    this.running = false;
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  isRunning(): boolean {
    return this.running;
  }

  private debounced(key: string, fn: () => void): void {
    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);

    this.debounceTimers.set(
      key,
      setTimeout(() => {
        this.debounceTimers.delete(key);
        fn();
      }, this.config.debounceMs)
    );
  }
}

/**
 * Create a file watcher that refreshes adapters on filesystem changes.
 * Call from the server process (API route init or standalone server).
 */
export function createProjectWatcher(
  projectRoot: string,
  debounceMs: number,
  onRefresh: (category: 'openspec' | 'beads' | 'git' | 'config' | 'any') => void
): FileWatcher {
  return new FileWatcher({
    projectRoot,
    debounceMs,
    onOpenSpecChange: () => onRefresh('openspec'),
    onBeadsChange: () => onRefresh('beads'),
    onGitChange: () => onRefresh('git'),
    onConfigChange: () => onRefresh('config'),
    onAnyChange: () => onRefresh('any'),
  });
}
