// SSE client hook (T9)
// Subscribes to real-time updates and triggers store refreshes

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export type SSEStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface SSEEvent {
  type: string;
  data: unknown;
  timestamp: number;
}

interface UseSSEOptions {
  url: string;
  onEvent?: (event: SSEEvent) => void;
  onStatusChange?: (status: SSEStatus) => void;
  reconnectMs?: number;
  maxRetries?: number;
}

export function useSSE(options: UseSSEOptions) {
  const {
    url,
    onEvent,
    onStatusChange,
    reconnectMs = 2000,
    maxRetries = 5,
  } = options;

  const [status, setStatus] = useState<SSEStatus>('disconnected');
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const mountedRef = useRef(true);

  const updateStatus = useCallback((newStatus: SSEStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    updateStatus('connecting');

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (!mountedRef.current) return;
        retriesRef.current = 0;
        updateStatus('connected');
      };

      eventSource.onerror = () => {
        if (!mountedRef.current) return;
        eventSource.close();
        eventSourceRef.current = null;
        updateStatus('disconnected');

        // Attempt reconnect
        if (retriesRef.current < maxRetries) {
          retriesRef.current++;
          setTimeout(connect, reconnectMs * retriesRef.current);
        } else {
          updateStatus('error');
        }
      };

      // Listen for all event types
      const eventTypes = ['init', 'update', 'heartbeat', 'error'];
      for (const type of eventTypes) {
        eventSource.addEventListener(type, (e: MessageEvent) => {
          if (!mountedRef.current) return;
          try {
            const data = JSON.parse(e.data);
            const event: SSEEvent = {
              type,
              data,
              timestamp: Date.now(),
            };
            setLastEvent(event);
            onEvent?.(event);
          } catch {
            // Invalid JSON
          }
        });
      }
    } catch {
      updateStatus('error');
    }
  }, [url, onEvent, updateStatus, reconnectMs, maxRetries]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    updateStatus('disconnected');
  }, [updateStatus]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    status,
    lastEvent,
    reconnect: connect,
    disconnect,
  };
}

/**
 * Hook that connects to SSE and refreshes data on updates
 */
export function useRealtimeUpdates(
  onRefresh: () => Promise<void>,
  enabled = true
) {
  const [status, setStatus] = useState<SSEStatus>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  const handleEvent = useCallback(async (event: SSEEvent) => {
    if (event.type === 'update' || event.type === 'init') {
      setLastUpdate(Date.now());
      await onRefresh();
    }
  }, [onRefresh]);

  const sse = useSSE({
    url: '/api/events/stream',
    onEvent: enabled ? handleEvent : undefined,
    onStatusChange: setStatus,
  });

  // Fallback polling when SSE fails
  useEffect(() => {
    if (!enabled) return;
    if (status === 'error' || status === 'disconnected') {
      // Poll every 5s as fallback
      const interval = setInterval(async () => {
        await onRefresh();
        setLastUpdate(Date.now());
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [status, enabled, onRefresh]);

  return {
    status: sse.status,
    lastUpdate,
    reconnect: sse.reconnect,
  };
}
