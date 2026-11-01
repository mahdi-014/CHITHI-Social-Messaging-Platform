import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('chithi_token') : null);

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token: authToken },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      withCredentials: true,
    });
  } else if (authToken && (!socket.auth || !(socket.auth as any).token)) {
    socket.auth = { token: authToken };
    if (!socket.connected) {
      socket.connect();
    }
  }

  return socket;
}

export function connectSocket(token: string): Socket {
  if (socket) {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    withCredentials: true,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
