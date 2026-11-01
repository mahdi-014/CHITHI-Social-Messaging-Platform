import { create } from 'zustand';

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: {
    id: string;
    username: string;
    profile?: {
      displayName: string;
      avatarMediaId?: string;
    };
  };
  messageType: string;
  body: string | null;
  isDeleted?: boolean;
  isEdited?: boolean;
  replyToMessageId?: string | null;
  attachments?: any[];
  receipts?: any[];
  reactions?: any[];
  createdAt: string;
  editedAt?: string | null;
}

export interface ConversationItem {
  id: string;
  type: 'direct' | 'group';
  title: string;
  avatarMediaId?: string;
  otherParticipant?: {
    id: string;
    username: string;
    displayName: string;
    avatarMediaId?: string;
  };
  lastMessage?: {
    id: string;
    senderId: string;
    messageType: string;
    body: string | null;
    createdAt: string;
  };
  lastMessageAt?: string;
  unreadCount: number;
}

interface ChatState {
  conversations: ConversationItem[];
  activeConversationId: string | null;
  messages: Record<string, MessageItem[]>; // conversationId -> messages
  typingUsers: Record<string, Set<string>>; // conversationId -> Set of usernames
  onlineUsers: Set<string>; // Set of userIds

  setConversations: (conversations: ConversationItem[]) => void;
  updateConversationLastMessage: (conversationId: string, lastMessage: any) => void;
  setActiveConversationId: (id: string | null) => void;
  setMessages: (conversationId: string, messages: MessageItem[]) => void;
  appendMessage: (conversationId: string, message: MessageItem) => void;
  updateMessageReceipt: (messageId: string, status: 'delivered' | 'read', userId: string) => void;
  setUserTyping: (conversationId: string, username: string, isTyping: boolean) => void;
  setUserOnline: (userId: string, isOnline: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},
  onlineUsers: new Set(),

  setConversations: (conversations) => set({ conversations }),

  updateConversationLastMessage: (conversationId, lastMessage) => {
    const list = get().conversations.map((c) => {
      if (c.id === conversationId) {
        return {
          ...c,
          lastMessage,
          lastMessageAt: lastMessage.createdAt,
          unreadCount: get().activeConversationId === conversationId ? 0 : c.unreadCount + 1,
        };
      }
      return c;
    });
    set({ conversations: list });
  },

  setActiveConversationId: (id) => {
    set({ activeConversationId: id });
    if (id) {
      // Clear unread count for active conversation
      const list = get().conversations.map((c) =>
        c.id === id ? { ...c, unreadCount: 0 } : c,
      );
      set({ conversations: list });
    }
  },

  setMessages: (conversationId, messages) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: messages,
      },
    }));
  },

  appendMessage: (conversationId, message) => {
    const current = get().messages[conversationId] || [];
    // Deduplicate by message.id
    if (current.some((m) => m.id === message.id)) {
      return;
    }
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...current, message],
      },
    }));
  },

  updateMessageReceipt: (messageId, status, userId) => {
    set((state) => {
      const nextMessages = { ...state.messages };
      for (const convId of Object.keys(nextMessages)) {
        nextMessages[convId] = nextMessages[convId].map((m) => {
          if (m.id === messageId) {
            const receipts = m.receipts || [];
            const existing = receipts.find((r) => r.userId === userId);
            if (existing) {
              if (status === 'read') existing.readAt = new Date().toISOString();
              else existing.deliveredAt = new Date().toISOString();
            } else {
              receipts.push({
                messageId,
                userId,
                deliveredAt: new Date().toISOString(),
                readAt: status === 'read' ? new Date().toISOString() : null,
              });
            }
            return { ...m, receipts: [...receipts] };
          }
          return m;
        });
      }
      return { messages: nextMessages };
    });
  },

  setUserTyping: (conversationId, username, isTyping) => {
    set((state) => {
      const current = new Set(state.typingUsers[conversationId] || []);
      if (isTyping) {
        current.add(username);
      } else {
        current.delete(username);
      }
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: current,
        },
      };
    });
  },

  setUserOnline: (userId, isOnline) => {
    set((state) => {
      const updated = new Set(state.onlineUsers);
      if (isOnline) {
        updated.add(userId);
      } else {
        updated.delete(userId);
      }
      return { onlineUsers: updated };
    });
  },
}));
