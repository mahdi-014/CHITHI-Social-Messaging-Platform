'use client';

import React, { useEffect, useState, useRef } from 'react';
import { apiFetch } from '../../../lib/api';
import { getSocket } from '../../../lib/socket';
import { useAuthStore } from '../../../stores/auth.store';
import { useChatStore, ConversationItem, MessageItem } from '../../../stores/chat.store';
import {
  Send,
  Search,
  Plus,
  ArrowLeft,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Smile,
  Circle,
  MessageSquare,
  Users,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ChatsPage() {
  const { user } = useAuthStore();
  const {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    setMessages,
    appendMessage,
    typingUsers,
    onlineUsers,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [friendsModalOpen, setFriendsModalOpen] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load conversations on mount
  useEffect(() => {
    setLoadingConv(true);
    apiFetch<ConversationItem[]>('/conversations')
      .then((data) => setConversations(data))
      .catch(console.error)
      .finally(() => setLoadingConv(false));
  }, [setConversations]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) return;

    setLoadingMessages(true);
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('conversation:join', activeConversationId);

    const handleNewMessage = (msg: MessageItem) => {
      if (msg && msg.conversationId === activeConversationId) {
        appendMessage(activeConversationId, msg);
      }
    };
    socket.on('message:new', handleNewMessage);

    apiFetch<{ messages: MessageItem[] }>(`/conversations/${activeConversationId}/messages?limit=50`)
      .then((res) => {
        // Reverse because backend returns newest first for cursor pagination
        const chronological = [...res.messages].reverse();
        setMessages(activeConversationId, chronological);

        // Mark last message as read if from other user
        const lastMsg = chronological[chronological.length - 1];
        if (lastMsg && lastMsg.senderId !== user?.id) {
          apiFetch(`/messages/${lastMsg.id}/receipt`, {
            method: 'POST',
            body: { status: 'read' },
          }).catch(() => {});
          socket.emit('message:read', { messageId: lastMsg.id });
        }
      })
      .catch(console.error)
      .finally(() => setLoadingMessages(false));

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.emit('conversation:leave', activeConversationId);
    };
  }, [activeConversationId, setMessages, appendMessage, user?.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversationId]);

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const currentMessages = activeConversationId ? messages[activeConversationId] || [] : [];
  const currentTyping = activeConversationId ? Array.from(typingUsers[activeConversationId] || []) : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!activeConversationId) return;

    const socket = getSocket();
    socket.emit('typing:start', { conversationId: activeConversationId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: activeConversationId });
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversationId || !user) return;

    const text = inputText.trim();
    setInputText('');

    const socket = getSocket();
    socket.emit('typing:stop', { conversationId: activeConversationId });

    const clientMsgId = crypto.randomUUID();

    if (socket && socket.connected) {
      socket.emit(
        'message:send',
        {
          conversationId: activeConversationId,
          clientMessageId: clientMsgId,
          messageType: 'text',
          body: text,
        },
        (res: any) => {
          if (res?.message) {
            appendMessage(activeConversationId, res.message);
          }
        },
      );
    } else {
      try {
        const sent = await apiFetch<MessageItem>(`/conversations/${activeConversationId}/messages`, {
          method: 'POST',
          body: {
            clientMessageId: clientMsgId,
            messageType: 'text',
            body: text,
          },
        });

        appendMessage(activeConversationId, sent);
      } catch (err: any) {
        console.error('Failed to send message:', err);
      }
    }
  };

  const openNewChatModal = async () => {
    setFriendsModalOpen(true);
    try {
      const friends = await apiFetch<any[]>('/friends');
      setFriendsList(friends);
    } catch (err) {
      console.error(err);
    }
  };

  const startChatWithFriend = async (friendId: string) => {
    try {
      const conv = await apiFetch<ConversationItem>('/conversations/direct', {
        method: 'POST',
        body: { friendId },
      });
      setFriendsModalOpen(false);

      if (!conversations.some((c) => c.id === conv.id)) {
        setConversations([conv, ...conversations]);
      }
      setActiveConversationId(conv.id);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Conversation List Panel */}
      <div
        className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-border bg-surface ${
          activeConversationId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Chats</h1>
          <button
            onClick={openNewChatModal}
            className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            title="Start new conversation"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/50">
          {loadingConv ? (
            <div className="p-6 text-center text-sm text-muted">Loading chats...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center text-muted">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium">No conversations yet</p>
              <p className="text-xs text-muted max-w-xs">
                Start a direct chat with one of your accepted friends.
              </p>
              <button
                onClick={openNewChatModal}
                className="mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-md shadow-primary/20 transition-all"
              >
                New Conversation
              </button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const isOnline = conv.otherParticipant ? onlineUsers.has(conv.otherParticipant.id) : false;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`w-full p-3.5 flex items-start gap-3.5 text-left transition-colors ${
                    isActive ? 'bg-primary/10' : 'hover:bg-surface-muted/60'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-base">
                      {conv.title ? conv.title[0].toUpperCase() : 'C'}
                    </div>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-success border-2 border-surface" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm truncate">{conv.title}</span>
                      {conv.lastMessageAt && (
                        <span className="text-[11px] text-muted flex-shrink-0">
                          {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted truncate pr-2">
                        {conv.lastMessage?.body || 'No messages yet'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex-shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Active Conversation Panel */}
      <div
        className={`flex-1 flex flex-col bg-background ${
          !activeConversationId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-border bg-surface px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveConversationId(null)}
                  className="md:hidden p-2 rounded-lg hover:bg-surface-muted text-muted"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                    {activeConv.title ? activeConv.title[0].toUpperCase() : 'U'}
                  </div>
                  {activeConv.otherParticipant && onlineUsers.has(activeConv.otherParticipant.id) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-surface" />
                  )}
                </div>

                <div>
                  <h2 className="font-bold text-sm leading-tight">{activeConv.title}</h2>
                  <p className="text-xs text-muted">
                    {activeConv.otherParticipant && onlineUsers.has(activeConv.otherParticipant.id)
                      ? 'Online'
                      : activeConv.otherParticipant
                      ? `@${activeConv.otherParticipant.username}`
                      : 'Direct Chat'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="p-8 text-center text-sm text-muted">Loading messages...</div>
              ) : currentMessages.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted">
                  No messages yet. Send a greeting to start chatting!
                </div>
              ) : (
                currentMessages.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  const isRead = msg.receipts?.some((r) => r.readAt);
                  const isDelivered = msg.receipts?.some((r) => r.deliveredAt);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                          isMine
                            ? 'bg-primary text-primary-foreground rounded-br-xs'
                            : 'bg-surface border border-border text-foreground rounded-bl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                        <div
                          className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                            isMine ? 'text-primary-foreground/75' : 'text-muted'
                          }`}
                        >
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMine && (
                            <span>
                              {isRead ? (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
                              ) : isDelivered ? (
                                <CheckCheck className="w-3.5 h-3.5" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {currentTyping.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted italic">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce delay-200" />
                  </div>
                  <span>{currentTyping[0]} is typing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-surface flex items-center gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-40"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center text-primary shadow-sm mb-4">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-1">Select a conversation</h2>
            <p className="text-sm text-muted max-w-sm">
              Choose an active chat from the sidebar or start a new conversation with an accepted friend.
            </p>
          </div>
        )}
      </div>

      {/* New Conversation Friends Modal */}
      {friendsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-base">New Conversation</h3>
              <button
                onClick={() => setFriendsModalOpen(false)}
                className="text-muted hover:text-foreground text-sm font-medium"
              >
                Cancel
              </button>
            </div>

            <div className="p-3 flex-1 overflow-y-auto divide-y divide-border/50">
              {friendsList.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted">
                  You don&apos;t have any accepted friends yet. Go to the Friends tab to connect with someone!
                </div>
              ) : (
                friendsList.map((f) => (
                  <button
                    key={f.friendId}
                    onClick={() => startChatWithFriend(f.friendId)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-surface-muted/60 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {f.displayName ? f.displayName[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{f.displayName}</h4>
                      <p className="text-xs text-muted">@{f.username}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
