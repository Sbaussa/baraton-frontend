import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

let globalSocket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
  }
  return globalSocket;
};

export const useSocket = (room?: 'kitchen' | 'delivery' | 'cashier') => {
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket.connected) socket.connect();
    if (room) socket.emit(`join-${room}`);
    return () => {};
  }, [room]);

  return socketRef.current;
};
