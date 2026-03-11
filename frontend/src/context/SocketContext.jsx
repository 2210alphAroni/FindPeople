import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const prevNearbyIds = useRef(new Set());
  const onNearbyRef = useRef(null);
  const onMessageRef = useRef(null);
  const onSeenRef = useRef(null);

  const setOnNearby = useCallback((fn) => { onNearbyRef.current = fn; }, []);
  const setOnMessage = useCallback((fn) => { onMessageRef.current = fn; }, []);
  const setOnSeen = useCallback((fn) => { onSeenRef.current = fn; }, []);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      return;
    }

    socketRef.current = io(SOCKET_URL, { withCredentials: true });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      socketRef.current.emit('user:join', {
        userId: user._id,
        username: user.isAnonymous ? (user.anonymousName || 'Anonymous') : user.username,
        avatar: user.isAnonymous ? null : user.avatar,
        anonymous: user.isAnonymous,
      });
    });

    socketRef.current.on('disconnect', () => setIsConnected(false));

    socketRef.current.on('nearby:users', (users) => {
      setNearbyUsers(users);
      users.forEach(u => {
        if (!prevNearbyIds.current.has(u.socketId)) {
          onNearbyRef.current?.(u);
          onSeenRef.current?.(u);
        }
      });
      prevNearbyIds.current = new Set(users.map(u => u.socketId));
    });

    socketRef.current.on('message:receive', (msg) => {
      setMessages(prev => [...prev, { ...msg, direction: 'incoming' }]);
      onMessageRef.current?.(msg);
    });

    socketRef.current.on('message:sent', (msg) => {
      setMessages(prev => [...prev, { ...msg, direction: 'outgoing' }]);
    });

    socketRef.current.on('typing:indicator', ({ from, isTyping }) => {
      setTypingUsers(prev => ({ ...prev, [from.socketId]: isTyping ? from : null }));
    });

    return () => { socketRef.current?.disconnect(); };
  }, [user?._id]);

  const updateLocation = useCallback((lat, lng) => {
    socketRef.current?.connected && socketRef.current.emit('location:update', { lat, lng });
  }, []);

  const sendMessage = useCallback((toSocketId, toUserId, message, fromUser) => {
    socketRef.current?.connected && socketRef.current.emit('message:send', { toSocketId, toUserId, message, fromUser });
  }, []);

  const startTyping = useCallback((toSocketId) => { socketRef.current?.emit('typing:start', { toSocketId }); }, []);
  const stopTyping = useCallback((toSocketId) => { socketRef.current?.emit('typing:stop', { toSocketId }); }, []);
  const clearMessages = useCallback(() => setMessages([]), []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current, isConnected, nearbyUsers,
      messages, typingUsers,
      updateLocation, sendMessage, startTyping, stopTyping, clearMessages,
      setOnNearby, setOnMessage, setOnSeen,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
