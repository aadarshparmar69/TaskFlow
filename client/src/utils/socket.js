import { io } from 'socket.io-client';

const getSocketUrl = () => {
  const customUrl = import.meta.env.VITE_SOCKET_URL;
  if (import.meta.env.PROD && (!customUrl || customUrl.includes('localhost'))) {
    return window.location.origin;
  }
  return customUrl || window.location.origin;
};

const SOCKET_URL = getSocketUrl();

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: {
    token: null,
  },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  transports: ['websocket', 'polling'],
});

/**
 * Connect the socket with the given auth token.
 * @param {string} token — JWT access token
 */
export const connectSocket = (token) => {
  if (!token) return;

  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }
};

/**
 * Disconnect the socket and clean up auth.
 */
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
  socket.auth = { token: null };
};

// Debug listeners (development only)
if (import.meta.env.DEV) {
  socket.on('connect', () => {
    console.log('[socket] connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[socket] connection error:', err.message);
  });
}
