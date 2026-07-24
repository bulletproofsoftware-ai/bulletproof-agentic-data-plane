import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketEvent {
  event_type: string;
  pipeline_id: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export function useWebSocket(url: string, token: string) {
  const [events, setEvents] = useState<WebSocketEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!url || !token) return;

    const ws = new WebSocket(`${url}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as WebSocketEvent;
        setEvents(prev => [parsed, ...prev].slice(0, 100)); // Keep last 100
      } catch {
        // Ignore non-JSON messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Auto-reconnect after 5s
      setTimeout(connect, 5000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url, token]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { events, connected };
}
