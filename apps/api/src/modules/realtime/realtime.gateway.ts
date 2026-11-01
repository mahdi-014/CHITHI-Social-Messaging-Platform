import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from '../messages/messages.service';
import { PrismaService } from '../../database/prisma.service';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    username: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  private onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly messagesService: MessagesService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Socket connection rejected: No token provided (${client.id})`);
        client.disconnect();
        return;
      }

      const accessSecret =
        this.configService.get<string>('jwt.accessSecret') ||
        'chithi_super_secret_jwt_access_key_2026_dev';

      const payload = this.jwtService.verify(token, { secret: accessSecret });

      client.data = {
        userId: payload.sub,
        username: payload.username,
      };

      // Join personal user room
      client.join(`user:${payload.sub}`);

      // Track online presence
      const userSockets = this.onlineUsers.get(payload.sub) || new Set();
      userSockets.add(client.id);
      this.onlineUsers.set(payload.sub, userSockets);

      this.logger.log(`User connected: ${payload.username} (${payload.sub}) on socket ${client.id}`);
      this.broadcastPresence(payload.sub, true);
    } catch (err: any) {
      this.logger.warn(`Socket authentication error: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.data?.userId;
    if (userId) {
      const userSockets = this.onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.onlineUsers.delete(userId);
          this.broadcastPresence(userId, false);
        }
      }
      this.logger.log(`User disconnected: ${client.data.username} (${userId})`);
    }
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() conversationId: string,
  ) {
    const userId = client.data.userId;
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (member && !member.leftAt) {
      client.join(`conversation:${conversationId}`);
      return { success: true, conversationId };
    }
    return { success: false, message: 'Not authorized for this conversation' };
  }

  @SubscribeMessage('conversation:leave')
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() conversationId: string,
  ) {
    client.leave(`conversation:${conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: {
      conversationId: string;
      clientMessageId?: string;
      messageType: any;
      body?: string;
      replyToMessageId?: string;
      attachmentMediaIds?: string[];
    },
  ) {
    const userId = client.data.userId;
    try {
      const message = await this.messagesService.sendMessage(
        userId,
        payload.conversationId,
        {
          clientMessageId: payload.clientMessageId,
          messageType: payload.messageType,
          body: payload.body,
          replyToMessageId: payload.replyToMessageId,
          attachmentMediaIds: payload.attachmentMediaIds,
        },
      );

      // Emit to conversation room
      this.server
        .to(`conversation:${payload.conversationId}`)
        .emit('message:new', message);

      // Also deliver to conversation members' individual rooms
      const members = await this.prisma.conversationMember.findMany({
        where: { conversationId: payload.conversationId, leftAt: null },
        select: { userId: true },
      });

      for (const m of members) {
        if (m.userId !== userId) {
          this.server.to(`user:${m.userId}`).emit('message:new', message);
          this.server.to(`user:${m.userId}`).emit('conversation:update', {
            conversationId: payload.conversationId,
            lastMessage: message,
          });
        }
      }

      return { success: true, message };
    } catch (err: any) {
      this.logger.error(`Error sending message via socket: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  @SubscribeMessage('message:delivered')
  async handleDelivered(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { messageId: string },
  ) {
    const userId = client.data.userId;
    const receipt = await this.messagesService.updateReceipt(userId, payload.messageId, 'delivered');
    if (receipt) {
      const msg = await this.prisma.message.findUnique({
        where: { id: payload.messageId },
        select: { senderId: true, conversationId: true },
      });
      if (msg) {
        this.server.to(`user:${msg.senderId}`).emit('message:delivered', {
          messageId: payload.messageId,
          recipientId: userId,
          deliveredAt: receipt.deliveredAt,
        });
      }
    }
    return { success: true };
  }

  @SubscribeMessage('message:read')
  async handleRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { messageId: string },
  ) {
    const userId = client.data.userId;
    const receipt = await this.messagesService.updateReceipt(userId, payload.messageId, 'read');
    if (receipt) {
      const msg = await this.prisma.message.findUnique({
        where: { id: payload.messageId },
        select: { senderId: true, conversationId: true },
      });
      if (msg) {
        this.server.to(`user:${msg.senderId}`).emit('message:read', {
          messageId: payload.messageId,
          recipientId: userId,
          readAt: receipt.readAt,
        });
      }
    }
    return { success: true };
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    client.to(`conversation:${payload.conversationId}`).emit('typing:start', {
      conversationId: payload.conversationId,
      userId: client.data.userId,
      username: client.data.username,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    client.to(`conversation:${payload.conversationId}`).emit('typing:stop', {
      conversationId: payload.conversationId,
      userId: client.data.userId,
    });
  }

  private broadcastPresence(userId: string, isOnline: boolean) {
    this.server.emit('presence:update', {
      userId,
      isOnline,
      timestamp: new Date(),
    });
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }
}
