import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { wsService } from '../services/api';
import { WebSocketMessage } from '../types';

/**
 * Custom hook that manages a WebSocket connection for real-time events.
 * Connects when the user is authenticated and disconnects on unmount.
 *
 * The onMessage callback is stored in a ref so that changes to it never
 * restart the WebSocket connection — only a user change does.
 */
export default function useWebSocket(onMessage?: (msg: WebSocketMessage) => void) {
  const { user, token } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  // Always keep the latest callback in a ref without triggering effect re-runs
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    if (!user || !token) return;

    const ws = wsService.connect(
      token,
      (data) => {
        setConnected(true);
        // Call through the ref — always the latest callback, no dep needed
        onMessageRef.current?.(data as WebSocketMessage);
      },
      (error) => {
        console.error('WebSocket error:', error);
        setConnected(false);
      },
    );

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, [user, token]); // ← only restarts when auth state changes

  return { ws: wsRef.current, connected, send };
}