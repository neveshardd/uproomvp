import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

interface Message {
  id: string;
  content: string;
  conversationId: string;
  userId: string;
  type: 'TEXT' | 'IMAGE' | 'FILE';
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
}

interface TypingUser {
  userId: string;
  isTyping: boolean;
}

interface PresenceData {
  status: string;
  message: string;
  isOnline: boolean;
  lastSeen: Date;
}

interface WebSocketEvents {
  onMessage: (message: Message) => void;
  onTyping: (data: { userId: string; conversationId: string; isTyping: boolean }) => void;
  onUserStatus: (data: { userId: string; status: 'online' | 'offline'; timestamp: string }) => void;
  onNewConversation: (data: { conversationId: string; participantIds: string[] }) => void;
  onPresenceUpdate?: (data: { userId: string; presence: PresenceData; timestamp: string }) => void;
}

export const useWebSocket = (events: WebSocketEvents) => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!user || !currentCompany || socketRef.current?.connected) {
      return;
    }

    setIsConnecting(true);
    
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333').replace(/\/$/, '');
    const socket = io(apiUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setIsConnecting(false);
      reconnectAttempts.current = 0;

      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('Nenhum token encontrado');
        socket.emit('auth_error', { message: 'Token não encontrado' });
        return;
      }
      
      socket.emit('authenticate', {
        token,
        companyId: currentCompany.id,
      });
    });

    socket.on('authenticated', (data) => {
    });

    socket.on('auth_error', (error) => {
      setIsConnecting(false);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      setIsConnecting(false);

      if (reason !== 'io client disconnect' && reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      }
    });

    socket.on('connect_error', (error) => {
      setIsConnecting(false);
    });

    socket.on('new_message', (data: { message: Message; conversationId: string }) => {
      events.onMessage(data.message);
    });

    socket.on('user_typing', (data: { userId: string; conversationId: string; isTyping: boolean }) => {
      events.onTyping(data);
    });

    socket.on('user_status_changed', (data: { userId: string; status: 'online' | 'offline'; timestamp: string }) => {
      events.onUserStatus(data);
    });

    socket.on('new_conversation', (data: { conversationId: string; participantIds: string[] }) => {
      events.onNewConversation(data);
    });

    socket.on('presence_updated', (data: { userId: string; presence: PresenceData; timestamp: string }) => {
      if (events.onPresenceUpdate) {
        events.onPresenceUpdate(data);
      }
    });

    socket.on('error', (error) => { 
    });

    socket.connect();
  }, [user, currentCompany, events]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    reconnectAttempts.current = 0;
  }, []);

  const sendMessage = useCallback((data: {
    content: string;
    conversationId: string;
    type?: 'TEXT' | 'IMAGE' | 'FILE';
  }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', data);
    } else {
      console.warn('WebSocket não conectado, não é possível enviar mensagem');
    }
  }, []);

  const sendTyping = useCallback((data: {
    conversationId: string;
    isTyping: boolean;
  }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', data);
    }
  }, []);

  useEffect(() => {
    if (user && currentCompany && !socketRef.current) {
      connect();
    }
  }, [user, currentCompany, connect]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    sendMessage,
    sendTyping,
    connect,
    disconnect,
  };
};
