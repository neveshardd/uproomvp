import { FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { prisma } from './database';
import { AuthService } from './auth-service';

interface AuthenticatedSocket {
  userId: string;
  companyId: string;
  socketId: string;
}

interface MessageData {
  content: string;
  conversationId: string;
  type?: 'TEXT' | 'IMAGE' | 'FILE';
}

interface TypingData {
  conversationId: string;
  isTyping: boolean;
}

class WebSocketManager {
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  initialize(fastify: FastifyInstance) {
    this.io = new SocketIOServer(fastify.server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://uproom.com']
          : ['http://localhost:3000'],
        credentials: true
      },
      path: '/socket.io'
    });

    this.io.on('connection', (socket) => {
      console.log('Cliente conectado:', socket.id);

      // Autenticação do socket
      socket.on('authenticate', async (data: { token: string; companyId: string }) => {
        try {
          console.log('WebSocket: Autenticando socket:', socket.id);
          console.log('WebSocket: Token recebido:', data.token ? 'Presente' : 'Ausente');
          console.log('WebSocket: Company ID:', data.companyId);
          
          const decoded = AuthService.verifyToken(data.token);
          if (!decoded || !decoded.userId) {
            console.log('WebSocket: Token inválido ou expirado');
            socket.emit('auth_error', { message: 'Token inválido' });
            return;
          }
          
          console.log('WebSocket: Token válido para usuário:', decoded.userId);

          // Verificar se o usuário pertence à empresa
          const membership = await prisma.companyMember.findFirst({
            where: {
              userId: decoded.userId,
              companyId: data.companyId,
            },
          });

          if (!membership) {
            socket.emit('auth_error', { message: 'Usuário não pertence à empresa' });
            return;
          }

          // Registrar usuário conectado
          const userSocket: AuthenticatedSocket = {
            userId: decoded.userId,
            companyId: data.companyId,
            socketId: socket.id,
          };

          this.connectedUsers.set(socket.id, userSocket);
          
          if (!this.userSockets.has(decoded.userId)) {
            this.userSockets.set(decoded.userId, new Set());
          }
          this.userSockets.get(decoded.userId)!.add(socket.id);

          // Entrar na sala da empresa
          socket.join(`company:${data.companyId}`);

          // Entrar nas salas das conversas do usuário
          const conversations = await prisma.conversation.findMany({
            where: {
              participants: {
                some: { userId: decoded.userId }
              },
              companyId: data.companyId,
            },
            select: { id: true }
          });

          conversations.forEach(conv => {
            socket.join(`conversation:${conv.id}`);
          });

          socket.emit('authenticated', { 
            userId: decoded.userId, 
            companyId: data.companyId 
          });

          // Notificar outros usuários que este usuário está online
          this.broadcastUserStatus(decoded.userId, data.companyId, 'online');

        } catch (error) {
          console.error('WebSocket: Erro na autenticação:', error);
          console.error('WebSocket: Data recebida:', data);
          socket.emit('auth_error', { message: 'Erro na autenticação', error: error instanceof Error ? error.message : 'Erro desconhecido' });
        }
      });

      // Enviar mensagem
      socket.on('send_message', async (data: MessageData) => {
        try {
          const userSocket = this.connectedUsers.get(socket.id);
          if (!userSocket) {
            socket.emit('error', { message: 'Usuário não autenticado' });
            return;
          }

          // Verificar se o usuário é participante da conversa
          const participation = await prisma.conversationParticipant.findFirst({
            where: {
              conversationId: data.conversationId,
              userId: userSocket.userId,
            },
          });

          if (!participation) {
            socket.emit('error', { message: 'Acesso negado à conversa' });
            return;
          }

          // Criar mensagem no banco
          const message = await prisma.message.create({
            data: {
              content: data.content,
              conversationId: data.conversationId,
              userId: userSocket.userId,
              type: data.type || 'TEXT',
            },
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                }
              }
            }
          });

          // Atualizar timestamp da conversa
          await prisma.conversation.update({
            where: { id: data.conversationId },
            data: { updatedAt: new Date() },
          });

          // Enviar mensagem para todos os participantes da conversa
          this.io!.to(`conversation:${data.conversationId}`).emit('new_message', {
            message,
            conversationId: data.conversationId,
          });

        } catch (error) {
          console.error('Erro ao enviar mensagem:', error);
          socket.emit('error', { message: 'Erro ao enviar mensagem' });
        }
      });

      // Indicador de digitação
      socket.on('typing', (data: TypingData) => {
        const userSocket = this.connectedUsers.get(socket.id);
        if (!userSocket) return;

        socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
          userId: userSocket.userId,
          conversationId: data.conversationId,
          isTyping: data.isTyping,
        });
      });

      // Desconexão
      socket.on('disconnect', () => {
        const userSocket = this.connectedUsers.get(socket.id);
        if (userSocket) {
          this.connectedUsers.delete(socket.id);
          
          const userSocketSet = this.userSockets.get(userSocket.userId);
          if (userSocketSet) {
            userSocketSet.delete(socket.id);
            if (userSocketSet.size === 0) {
              this.userSockets.delete(userSocket.userId);
              // Notificar que o usuário está offline
              this.broadcastUserStatus(userSocket.userId, userSocket.companyId, 'offline');
            }
          }
        }
        console.log('Cliente desconectado:', socket.id);
      });
    });
  }

  private broadcastUserStatus(userId: string, companyId: string, status: 'online' | 'offline') {
    if (!this.io) return;

    this.io.to(`company:${companyId}`).emit('user_status_changed', {
      userId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  // Método para notificar sobre mudança de presença/status
  notifyPresenceUpdate(userId: string, companyId: string, presence: any) {
    if (!this.io) return;

    console.log('Broadcasting presence update:', { userId, companyId, status: presence.status });
    
    this.io.to(`company:${companyId}`).emit('presence_updated', {
      userId,
      presence: {
        status: presence.status,
        message: presence.message,
        isOnline: presence.isOnline,
        lastSeen: presence.lastSeen,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Método para notificar sobre nova conversa
  notifyNewConversation(conversationId: string, participantIds: string[], companyId: string) {
    if (!this.io) return;

    participantIds.forEach(userId => {
      const userSockets = this.userSockets.get(userId);
      if (userSockets) {
        userSockets.forEach(socketId => {
          const socket = this.io!.sockets.sockets.get(socketId);
          if (socket) {
            socket.join(`conversation:${conversationId}`);
          }
        });
      }
    });

    this.io.to(`company:${companyId}`).emit('new_conversation', {
      conversationId,
      participantIds,
    });
  }

  // Método para notificar sobre nova mensagem (para casos especiais)
  notifyNewMessage(message: any, conversationId: string) {
    if (!this.io) return;

    this.io.to(`conversation:${conversationId}`).emit('new_message', {
      message,
      conversationId,
    });
  }

  getIO() {
    return this.io;
  }
}

export const wsManager = new WebSocketManager();
