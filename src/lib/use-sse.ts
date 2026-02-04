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
  const [reconnectTrigger, setReconnectTrigger] = useState(0);
  
  // Store callbacks in refs, updated via effect
  const callbacksRef = useRef({ onEvent, onStatusChange });
  useEffect(() => {
    callbacksRef.current = { onEvent, onStatusChange };
  }, [onEvent, onStatusChange]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manual reconnect
  const reconnect = useCallback(() => {
    retriesRef.current = 0;
    setReconnectTrigger(n => n + 1);
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  useEffect(() => {
    let mounted = true;

    const updateStatus = (newStatus: SSEStatus) => {
      if (!mounted) return;
      setStatus(newStatus);
      callbacksRef.current.onStatusChange?.(newStatus);
    };

    const connect = () => {
      if (!mounted) return;
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      updateStatus('connecting');

      try {
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          if (!mounted) return;
          retriesRef.current = 0;
          updateStatus('connected');
        };

        eventSource.onerror = () => {
          if (!mounted) return;
          eventSource.close();
          eventSourceRef.current = null;
          updateStatus('disconnected');

          // Attempt reconnect
          if (retriesRef.current < maxRetries) {
            retriesRef.current++;
            const delay = reconnectMs * retriesRef.current;
            reconnectTimerRef.current = setTimeout(() => {
              if (mounted) connect();
            }, delay);
          } else {
            updateStatus('error');
          }
        };

        // Listen for all event types
        const eventTypes = ['init', 'update', 'heartbeat', 'error'];
        for (const type of eventTypes) {
          eventSource.addEventListener(type, (e: MessageEvent) => {
            if (!mounted) return;
            try {
              const data = JSON.parse(e.data);
              const event: SSEEvent = {
                type,
                data,
                timestamp: Date.now(),
              };
              setLastEvent(event);
              callbacksRef.current.onEvent?.(event);
            } catch {
              // Invalid JSON
            }
          });
        }
      } catch {
        updateStatus('error');
      }
    };

    connect();

    return () => {
      mounted = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [url, reconnectMs, maxRetries, reconnectTrigger]);

  return {
    status,
    lastEvent,
    reconnect,
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
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  
  // Store onRefresh in ref, updated via effect
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const handleEvent = useCallback((event: SSEEvent) => {
    if (event.type === 'update' || event.type === 'init') {
      setLastUpdate(Date.now());
      onRefreshRef.current();
    }
  }, []);

  const handleStatusChange = useCallback((newStatus: SSEStatus) => {
    // Could track status here if needed
    void newStatus;
  }, []);

  const sse = useSSE({
    url: '/api/events/stream',
    onEvent: enabled ? handleEvent : undefined,
    onStatusChange: handleStatusChange,
  });

  // Fallback polling when SSE fails
  useEffect(() => {
    if (!enabled) return;
    if (sse.status === 'error') {
      // Poll every 5s as fallback
      const interval = setInterval(() => {
        onRefreshRef.current();
        setLastUpdate(Date.now());
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [sse.status, enabled]);

  return {
    status: sse.status,
    lastUpdate,
    reconnect: sse.reconnect,
  };
}
