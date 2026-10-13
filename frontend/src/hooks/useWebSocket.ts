import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { wsService } from '../services/api';
import { WebSocketMessage } from '../types';

/**
 * Custom hook that manages a WebSocket connection for real-time events.
 * Connects when the user is authenticated and disconnects on unmount.
 */
export default function useWebSocket(onMessage?: (msg: WebSocketMessage) => void) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  const handleMessage = useCallback(
    (data: unknown) => {
      const msg = data as WebSocketMessage;
      onMessage?.(msg);
    },
    [onMessage],
  );

  useEffect(() => {
    if (!user) return;

    const ws = wsService.connect(
      (data) => {
        setConnected(true);
        handleMessage(data);
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
  }, [user, handleMessage]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { ws: wsRef.current, connected, send };
}