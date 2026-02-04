// SSE endpoint for real-time updates (T9)
// Streams state changes to connected clients

import { getAdapterManager, ProjectState } from '@/lib/adapter-manager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const encoder = new TextEncoder();
  
  // Cleanup function - will be set in start(), called in cancel()
  let cleanup: (() => void) | null = null;
  
  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      // Initialize adapter manager
      const manager = getAdapterManager();
      let state = manager.getState();
      
      if (!state) {
        try {
          state = await manager.init();
          await manager.startWatching();
        } catch (e) {
          // Send error and close
          const errorEvent = `event: error\ndata: ${JSON.stringify({ error: String(e) })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
          return;
        }
      }

      // Send initial state
      const initialEvent = formatSSEEvent('init', {
        tasks: state.tasks.length,
        changes: state.changes.length,
        events: state.events.length,
        agents: state.agents.length,
        project: state.project.name,
      });
      controller.enqueue(encoder.encode(initialEvent));

      // Subscribe to refresh events
      const unsubscribe = manager.onRefresh((newState: ProjectState) => {
        try {
          const updateEvent = formatSSEEvent('update', {
            timestamp: Date.now(),
            tasks: newState.tasks.length,
            changes: newState.changes.length,
            events: newState.events.length,
            // Include summary of what changed
            tasksByStatus: countByStatus(newState.tasks),
            changesByStatus: countByStatus(newState.changes),
          });
          controller.enqueue(encoder.encode(updateEvent));
        } catch {
          // Controller might be closed
        }
      });

      // Heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = formatSSEEvent('heartbeat', { ts: Date.now() });
          controller.enqueue(encoder.encode(heartbeat));
        } catch {
          // Controller closed - cleanup will handle the interval
          cleanup?.();
        }
      }, 30000); // Every 30 seconds

      // Set cleanup function for cancel() to call
      cleanup = () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
      };
    },

    cancel() {
      // Called when client disconnects
      cleanup?.();
      cleanup = null;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

function formatSSEEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function countByStatus<T extends { status: string }>(items: T[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item.status] = (counts[item.status] || 0) + 1;
  }
  return counts;
}
