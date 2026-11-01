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
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from '../messages/messages.service';
import { PrismaService } from '../../database/prisma.service';
import { CallsService } from '../calls/calls.service';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    username: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
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
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
    @Inject(forwardRef(() => CallsService))
    private readonly callsService: CallsService,
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
      // Auto-terminate any active call session on disconnect
      const activeCallId = this.callsService.getActiveCallId(userId);
      if (activeCallId) {
        this.callsService
          .endCall(activeCallId, userId, 'connection_failed')
          .then((call) => {
            const peerId = call.callerId === userId ? call.receiverId : call.callerId;
            this.server.to(`user:${peerId}`).emit('call:ended', {
              callId: call.id,
              reason: 'connection_failed',
              durationSeconds: call.durationSeconds,
            });
          })
          .catch((err) => {
            this.logger.error(`Error auto-ending call on socket disconnect: ${err.message}`);
          });
      }

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

  async broadcastNewMessage(conversationId: string, senderId: string, message: any) {
    if (!this.server) return;

    // Emit to conversation room
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:new', message);

    // Also deliver to conversation members' individual rooms
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId, leftAt: null },
      select: { userId: true },
    });

    for (const m of members) {
      if (m.userId !== senderId) {
        this.server.to(`user:${m.userId}`).emit('message:new', message);
        this.server.to(`user:${m.userId}`).emit('conversation:update', {
          conversationId,
          lastMessage: message,
        });
      }
    }
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

  // --- WEBRTC AUDIO & VIDEO CALLING SIGNALING PROTOCOL ---

  @SubscribeMessage('call:invite')
  async handleCallInvite(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string; callType: 'audio' | 'video' },
  ) {
    const callerId = client.data.userId;
    try {
      const result = await this.callsService.initiateCall(callerId, payload);

      // Relay incoming call invitation to receiver's user room
      this.server.to(`user:${result.call.receiverId}`).emit('call:incoming', {
        callId: result.call.id,
        conversationId: result.call.conversationId,
        callType: result.call.callType,
        caller: result.call.caller,
        iceServers: result.receiverIceServers,
      });

      return {
        success: true,
        call: result.call,
        iceServers: result.callerIceServers,
      };
    } catch (err: any) {
      this.logger.warn(`Call invite failed from ${callerId}: ${err.message}`);
      return {
        success: false,
        error: err.message,
        code: err.response?.code || 'CALL_FAILED',
      };
    }
  }

  @SubscribeMessage('call:ringing')
  async handleCallRinging(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { callId: string },
  ) {
    const calleeId = client.data.userId;
    const call = await this.callsService.markRinging(payload.callId, calleeId);
    if (call) {
      this.server.to(`user:${call.callerId}`).emit('call:ringing', {
        callId: call.id,
      });
      return { success: true };
    }
    return { success: false, message: 'Invalid call session' };
  }

  @SubscribeMessage('call:accept')
  async handleCallAccept(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { callId: string },
  ) {
    const calleeId = client.data.userId;
    try {
      const updated = await this.callsService.acceptCall(payload.callId, calleeId);
      this.server.to(`user:${updated.callerId}`).emit('call:accepted', {
        callId: updated.id,
        callee: updated.receiver,
      });
      return { success: true, call: updated };
    } catch (err: any) {
      this.logger.error(`Call accept error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  @SubscribeMessage('call:reject')
  async handleCallReject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { callId: string; reason?: string },
  ) {
    const calleeId = client.data.userId;
    try {
      const updated = await this.callsService.rejectCall(payload.callId, calleeId, payload.reason);
      this.server.to(`user:${updated.callerId}`).emit('call:rejected', {
        callId: updated.id,
        reason: updated.endReason,
      });
      return { success: true };
    } catch (err: any) {
      this.logger.warn(`Call reject error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  @SubscribeMessage('call:cancel')
  async handleCallCancel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { callId: string },
  ) {
    const callerId = client.data.userId;
    try {
      const updated = await this.callsService.cancelCall(payload.callId, callerId);
      this.server.to(`user:${updated.receiverId}`).emit('call:cancelled', {
        callId: updated.id,
      });
      return { success: true };
    } catch (err: any) {
      this.logger.warn(`Call cancel error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  @SubscribeMessage('call:timeout')
  async handleCallTimeout(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { callId: string },
  ) {
    const updated = await this.callsService.timeoutCall(payload.callId);
    if (updated) {
      this.server.to(`user:${updated.callerId}`).emit('call:timeout', { callId: updated.id });
      this.server.to(`user:${updated.receiverId}`).emit('call:missed', {
        callId: updated.id,
        callType: updated.callType,
      });
    }
    return { success: true };
  }

  @SubscribeMessage('call:offer')
  async handleCallOffer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { callId: string; receiverId?: string; sdp: any },
  ) {
    const userId = client.data.userId;
    const call = await this.callsService.getCallById(userId, payload.callId);
    if (!call) return { success: false, message: 'Call session not found' };

    const targetUserId = call.callerId === userId ? call.receiverId : call.callerId;
    this.server.to(`user:${targetUserId}`).emit('call:offer', {
      callId: payload.callId,
      callerId: userId,
      sdp: payload.sdp,
    });
    return { success: true };
  }

  @SubscribeMessage('call:answer')
  async handleCallAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { callId: string; callerId?: string; sdp: any },
  ) {
    const userId = client.data.userId;
    const call = await this.callsService.getCallById(userId, payload.callId);
    if (!call) return { success: false, message: 'Call session not found' };

    const targetUserId = call.callerId === userId ? call.receiverId : call.callerId;
    this.server.to(`user:${targetUserId}`).emit('call:answer', {
      callId: payload.callId,
      calleeId: userId,
      sdp: payload.sdp,
    });
    return { success: true };
  }

  @SubscribeMessage('call:ice-candidate')
  async handleIceCandidate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { callId: string; targetUserId?: string; candidate: any },
  ) {
    const userId = client.data.userId;
    const call = await this.callsService.getCallById(userId, payload.callId);
    if (!call) return { success: false, message: 'Call session not found' };

    const targetUserId =
      payload.targetUserId || (call.callerId === userId ? call.receiverId : call.callerId);
    this.server.to(`user:${targetUserId}`).emit('call:ice-candidate', {
      callId: payload.callId,
      fromUserId: userId,
      candidate: payload.candidate,
    });
    return { success: true };
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { callId: string; reason?: string },
  ) {
    const userId = client.data.userId;
    try {
      const updated = await this.callsService.endCall(payload.callId, userId, payload.reason);
      const peerId = updated.callerId === userId ? updated.receiverId : updated.callerId;
      this.server.to(`user:${peerId}`).emit('call:ended', {
        callId: updated.id,
        durationSeconds: updated.durationSeconds,
        reason: updated.endReason,
      });
      return { success: true, call: updated };
    } catch (err: any) {
      this.logger.warn(`Call end error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}
