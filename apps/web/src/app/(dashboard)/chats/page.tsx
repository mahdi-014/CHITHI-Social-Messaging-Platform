'use client';

import React, { useEffect, useState, useRef } from 'react';
import { apiFetch, uploadMediaFile, getMediaUrl } from '../../../lib/api';
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
  Phone,
  Video,
  History,
  Paperclip,
  X,
  Loader2,
  Maximize2,
  MoreVertical,
  Camera,
  Film,
  Smile,
  User,
  SquarePen,
  MoreHorizontal,
  UserPlus,
  UserCheck,
} from 'lucide-react';
import { useWebRTCCall } from '../../../hooks/useWebRTCCall';
import CallHistoryModal from '../../../components/calling/CallHistoryModal';
import UserAvatar from '../../../components/ui/UserAvatar';
import UserProfileModal from '../../../components/profile/UserProfileModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

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

  const { startCall } = useWebRTCCall();
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState<any | null>(null);
  const [showRightPanel, setShowRightPanel] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [friendsModalOpen, setFriendsModalOpen] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);

  // Attachment & Media Sharing State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSelectMedia = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      alert('File size exceeds the 100 MB limit.');
      return;
    }

    if (type === 'image' && !file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WebP, GIF).');
      return;
    }
    if (type === 'video' && !file.type.startsWith('video/')) {
      alert('Please select a valid video file (MP4, WebM).');
      return;
    }

    const preview = URL.createObjectURL(file);
    setSelectedFile(file);
    setFilePreview(preview);
    setFileType(type);
    setAttachmentMenuOpen(false);
    e.target.value = '';
  };

  const handleClearAttachment = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);
    setUploadingMedia(false);
    setUploadProgress(null);
  };

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
    setHeaderMenuOpen(false);
    setAttachmentMenuOpen(false);

    const activeItem = conversations.find((c) => c.id === activeConversationId);
    if (activeItem?.otherParticipant?.id) {
      apiFetch<any>(`/profiles/${activeItem.otherParticipant.id}`)
        .then((data) => setPartnerProfile(data))
        .catch(() => setPartnerProfile(null));
    } else {
      setPartnerProfile(null);
    }

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
    if ((!inputText.trim() && !selectedFile) || !activeConversationId || !user) return;

    const text = inputText.trim();
    setInputText('');

    const socket = getSocket();
    socket.emit('typing:stop', { conversationId: activeConversationId });

    const clientMsgId = crypto.randomUUID();

    let attachmentMediaIds: string[] = [];
    let messageType: 'text' | 'image' | 'video' = 'text';

    if (selectedFile && fileType) {
      setUploadingMedia(true);
      setUploadProgress('Uploading media...');
      try {
        const media = await uploadMediaFile(selectedFile, 'chat_attachment');
        attachmentMediaIds = [media.id];
        messageType = fileType;
      } catch (err: any) {
        alert(`Failed to upload media: ${err?.message || 'Upload error'}`);
        setUploadingMedia(false);
        setUploadProgress(null);
        return;
      } finally {
        handleClearAttachment();
      }
    }

    const payload = {
      conversationId: activeConversationId,
      clientMessageId: clientMsgId,
      messageType,
      body: text || (messageType === 'image' ? 'Sent an image' : messageType === 'video' ? 'Sent a video' : ''),
      attachmentMediaIds,
    };

    if (socket && socket.connected) {
      socket.emit('message:send', payload, (res: any) => {
        if (res?.message) {
          appendMessage(activeConversationId, res.message);
        }
      });
    } else {
      try {
        const sent = await apiFetch<MessageItem>(`/conversations/${activeConversationId}/messages`, {
          method: 'POST',
          body: payload,
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

  // Date formatting helpers for WhatsApp-style chat grouping & timestamps
  const isSameDay = (d1: string, d2?: string) => {
    if (!d2) return false;
    const a = new Date(d1);
    const b = new Date(d2);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  };

  const formatDateSeparator = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
    });
  };

  const formatConvTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* ======================================================== */}
      {/* 1. CHITHI CONVERSATION LIST PANEL */}
      {/* ======================================================== */}
      <div
        className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-border/70 bg-surface select-none ${
          activeConversationId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Top Header — Search Bar & New Chat (Exact Mockup Match) */}
        <div className="p-3 border-b border-border/50 flex items-center gap-2 bg-surface">
          <h1 className="text-sm font-bold tracking-tight text-foreground whitespace-nowrap">
            Chats
          </h1>
          <div className="relative flex-1 flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-surface-muted/70 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-muted hover:text-foreground p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            onClick={() => setHistoryModalOpen(true)}
            className="p-1.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-muted transition-colors flex-shrink-0"
            title="Call History"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={openNewChatModal}
            className="p-1.5 rounded-xl text-primary hover:bg-primary-muted/60 transition-colors flex-shrink-0"
            title="Start new conversation"
          >
            <SquarePen className="w-4 h-4" />
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConv ? (
            <div className="p-8 text-center text-xs text-muted flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>Loading chats...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
              <img
                src="/brand/logo/logo-symbol.svg"
                alt="CHITHI"
                className="w-11 h-11 rounded-xl shadow-xs mb-1 object-contain"
              />
              <p className="text-sm font-semibold text-foreground">No conversations yet</p>
              <p className="text-xs text-muted max-w-xs leading-relaxed">
                Connect and exchange messages with your accepted friends on CHITHI.
              </p>
              <button
                onClick={openNewChatModal}
                className="mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-xs transition-all"
              >
                New Conversation
              </button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const isOnline = conv.otherParticipant ? onlineUsers.has(conv.otherParticipant.id) : false;
              const isTyping = typingUsers[conv.id] && typingUsers[conv.id].size > 0;
              const lastMsgIsMine = conv.lastMessage?.senderId === user?.id;

              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`w-full px-3 py-2.5 rounded-2xl flex items-center gap-3 text-left transition-all ${
                    isActive
                      ? 'bg-primary-muted/70 dark:bg-[#24333D] text-foreground font-medium shadow-xs'
                      : 'hover:bg-surface-muted/50 text-foreground/90'
                  }`}
                >
                  <UserAvatar
                    displayName={conv.title}
                    username={conv.otherParticipant?.username}
                    avatarMediaId={conv.otherParticipant?.avatarMediaId}
                    size="md"
                    isOnline={isOnline}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-xs sm:text-sm truncate text-foreground">{conv.title}</span>
                      {conv.lastMessageAt && (
                        <span className={`text-[11px] flex-shrink-0 font-medium ${isActive || conv.unreadCount > 0 ? 'text-primary' : 'text-muted'}`}>
                          {formatConvTime(conv.lastMessageAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {isTyping ? (
                        <p className="text-xs text-primary font-medium flex items-center gap-1 truncate animate-pulse">
                          typing...
                        </p>
                      ) : (
                        <div className="flex items-center gap-1 min-w-0 text-xs text-muted truncate">
                          {lastMsgIsMine && (
                            <CheckCheck className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                          )}
                          <span className="truncate">
                            {conv.lastMessage?.body || 'No messages yet'}
                          </span>
                        </div>
                      )}

                      {conv.unreadCount > 0 && (
                        <span className="w-4.5 h-4.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
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

      {/* ======================================================== */}
      {/* 2. ACTIVE CONVERSATION PANEL */}
      {/* ======================================================== */}
      <div
        className={`flex-1 flex flex-col bg-background relative overflow-hidden ${
          !activeConversationId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeConv ? (
          <>
            {/* Minimal Chat Header */}
            <div className="h-15 border-b border-border/70 bg-surface/95 backdrop-blur-xs px-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setActiveConversationId(null)}
                  className="md:hidden p-2 -ml-2 rounded-lg hover:bg-surface-muted text-muted hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <button
                  onClick={() => {
                    if (activeConv.otherParticipant?.id) {
                      setProfileModalUserId(activeConv.otherParticipant.id);
                    }
                  }}
                  className="flex items-center gap-3 hover:opacity-90 transition-opacity text-left cursor-pointer min-w-0"
                  title="View user profile"
                >
                  <UserAvatar
                    displayName={activeConv.title}
                    username={activeConv.otherParticipant?.username}
                    avatarMediaId={activeConv.otherParticipant?.avatarMediaId}
                    size="md"
                    isOnline={activeConv.otherParticipant ? onlineUsers.has(activeConv.otherParticipant.id) : false}
                  />

                  <div className="min-w-0">
                    <h2 className="font-semibold text-sm leading-tight text-foreground truncate flex items-center gap-1.5">
                      <span>{activeConv.title}</span>
                    </h2>
                    <p className="text-[11px] text-muted truncate flex items-center gap-1.5 mt-0.5">
                      {currentTyping.length > 0 ? (
                        <span className="text-primary font-medium">typing...</span>
                      ) : activeConv.otherParticipant && onlineUsers.has(activeConv.otherParticipant.id) ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          <span className="text-muted font-normal">Online</span>
                        </>
                      ) : activeConv.otherParticipant ? (
                        `@${activeConv.otherParticipant.username}`
                      ) : (
                        'Direct Chat'
                      )}
                    </p>
                  </div>
                </button>
              </div>

              {/* Calling & Action Controls (Matching Mockup) */}
              <div className="flex items-center gap-1.5 relative">
                {activeConv.otherParticipant && (
                  <>
                    <button
                      onClick={() =>
                        startCall(activeConv.id, 'audio', {
                          id: activeConv.otherParticipant!.id,
                          username: activeConv.otherParticipant!.username,
                          displayName: activeConv.otherParticipant!.displayName,
                          avatarMediaId: activeConv.otherParticipant!.avatarMediaId,
                        })
                      }
                      title="Start Voice Call"
                      className="p-2 rounded-xl text-muted hover:text-primary hover:bg-surface-muted transition-colors"
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        startCall(activeConv.id, 'video', {
                          id: activeConv.otherParticipant!.id,
                          username: activeConv.otherParticipant!.username,
                          displayName: activeConv.otherParticipant!.displayName,
                          avatarMediaId: activeConv.otherParticipant!.avatarMediaId,
                        })
                      }
                      title="Start Video Call"
                      className="p-2 rounded-xl text-muted hover:text-primary hover:bg-surface-muted transition-colors"
                    >
                      <Video className="w-5 h-5" />
                    </button>
                  </>
                )}

                <button
                  onClick={() => setShowRightPanel((prev) => !prev)}
                  className="p-2 rounded-xl text-muted hover:text-primary hover:bg-surface-muted transition-colors"
                  title="Toggle Contact Info"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Calm Chat Background and Message Flow */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 relative bg-background bg-[url('/brand/backgrounds/quiet-connection-waves.svg')] bg-cover bg-center">
              {loadingMessages ? (
                <div className="p-8 text-center text-xs text-muted flex flex-col items-center justify-center gap-2 h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span>Loading conversation history...</span>
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <Send className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No messages yet</p>
                  <p className="text-xs text-muted mt-1 max-w-xs leading-relaxed">
                    Send a message or share a photo to begin chatting with {activeConv.title}.
                  </p>
                </div>
              ) : (
                currentMessages.map((msg, index) => {
                  const isMine = msg.senderId === user?.id;
                  const isRead = msg.receipts?.some((r) => r.readAt);
                  const isDelivered = msg.receipts?.some((r) => r.deliveredAt);
                  const attachments = msg.attachments || [];
                  const showDateSeparator =
                    index === 0 || !isSameDay(msg.createdAt, currentMessages[index - 1].createdAt);

                  return (
                    <React.Fragment key={msg.id}>
                      {/* Minimal Date Separator Badge */}
                      {showDateSeparator && (
                        <div className="flex justify-center my-3 select-none">
                          <span className="px-3 py-0.5 rounded-full text-[10px] font-medium bg-surface-muted text-muted">
                            {formatDateSeparator(msg.createdAt)}
                          </span>
                        </div>
                      )}

                      {/* CHITHI Minimal Message Bubble */}
                      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group mb-1`}>
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] p-2.5 rounded-2xl text-sm relative ${
                            isMine
                              ? 'bg-chat-outgoing text-chat-outgoingText rounded-br-xs'
                              : 'bg-chat-incoming text-chat-incomingText rounded-bl-xs shadow-xs'
                          }`}
                        >
                          {/* Attachments rendering */}
                          {attachments.map((att: any) => {
                            const mediaId = att.mediaAssetId || att.mediaAsset?.id;
                            const mime = att.mediaAsset?.mimeType || '';
                            const isVid = mime.startsWith('video/') || msg.messageType === 'video';
                            const mediaUrl = getMediaUrl(mediaId);

                            if (isVid) {
                              return (
                                <div key={att.id || mediaId} className="mb-2 rounded-xl overflow-hidden bg-black/90 shadow-xs">
                                  <video
                                    src={mediaUrl}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="w-full max-h-72 object-contain rounded-xl"
                                  />
                                </div>
                              );
                            }

                            return (
                              <div
                                key={att.id || mediaId}
                                className="mb-2 rounded-xl overflow-hidden cursor-pointer relative group/img bg-black/5"
                                onClick={() => setLightboxMedia({ url: mediaUrl, type: 'image' })}
                              >
                                <img
                                  src={mediaUrl}
                                  alt="Attachment"
                                  crossOrigin="anonymous"
                                  className="w-full max-h-72 object-cover rounded-xl transition-transform duration-200 group-hover/img:scale-101"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                  <span className="p-2 rounded-full bg-black/60 text-white backdrop-blur-xs">
                                    <Maximize2 className="w-4 h-4" />
                                  </span>
                                </div>
                              </div>
                            );
                          })}

                          {/* Text body if present */}
                          {msg.body && (
                            <p className="px-1 py-0.5 whitespace-pre-wrap break-words leading-relaxed text-sm">
                              {msg.body}
                            </p>
                          )}

                          {/* Timestamp & Status Ticks */}
                          <div
                            className={`flex items-center justify-end gap-1 text-[10px] mt-1 px-1 select-none font-medium ${
                              isMine ? 'text-chat-outgoingText/75' : 'text-muted'
                            }`}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMine && (
                              <span className="inline-flex items-center">
                                {isRead ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-primary" />
                                ) : isDelivered ? (
                                  <CheckCheck className="w-3.5 h-3.5 opacity-70" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 opacity-70" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}

              {/* Typing Indicator Bubble */}
              {currentTyping.length > 0 && (
                <div className="flex items-center gap-2 mb-2 animate-in fade-in">
                  <div className="px-3.5 py-2 rounded-2xl rounded-bl-xs bg-chat-incoming text-muted shadow-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Selected Attachment Preview Bar */}
            {selectedFile && (
              <div className="p-3 bg-surface border-t border-border/70 flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-background flex-shrink-0 relative">
                    {fileType === 'image' && filePreview ? (
                      <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary bg-primary/10">
                        <Video className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate text-foreground">{selectedFile.name}</p>
                    <p className="text-[11px] text-muted">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • {fileType === 'image' ? 'Image' : 'Video'}
                    </p>
                    {uploadingMedia && (
                      <p className="text-[11px] text-primary flex items-center gap-1 font-medium mt-0.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {uploadProgress || 'Uploading...'}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearAttachment}
                  disabled={uploadingMedia}
                  className="p-1.5 rounded-lg hover:bg-surface-muted text-muted hover:text-foreground transition-colors disabled:opacity-40"
                  title="Remove attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Hidden file pickers with mandatory testids */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleSelectMedia(e, 'image')}
              accept="image/jpeg,image/png,image/webp,image/gif"
              data-testid="chat-image-input"
              className="hidden"
            />
            <input
              type="file"
              ref={videoInputRef}
              onChange={(e) => handleSelectMedia(e, 'video')}
              accept="video/mp4,video/webm"
              data-testid="chat-video-input"
              className="hidden"
            />

            {/* CHITHI Message Composer (Exact Mockup Match) */}
            <div className="p-3 bg-background relative">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-surface rounded-full px-3.5 py-1.5 border border-border/40 shadow-xs">
                <button
                  type="button"
                  title="Emoji"
                  className="p-1.5 text-muted hover:text-foreground transition-colors flex-shrink-0"
                >
                  <Smile className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  placeholder={selectedFile ? 'Add a caption (optional)...' : 'Type a message...'}
                  value={inputText}
                  onChange={handleInputChange}
                  disabled={uploadingMedia}
                  className="flex-1 bg-transparent px-2 py-1 text-xs sm:text-sm text-foreground placeholder:text-muted focus:outline-none disabled:opacity-50"
                />

                <div className="flex items-center gap-0.5 text-muted flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingMedia}
                    title="Attach file"
                    className="p-1.5 hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    <Paperclip className="w-4.5 h-4.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingMedia}
                    title="Attach photo"
                    className="p-1.5 hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    <ImageIcon className="w-4.5 h-4.5" />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={uploadingMedia || (!inputText.trim() && !selectedFile)}
                  className="w-8 h-8 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover transition-transform active:scale-95 disabled:opacity-40 flex items-center justify-center flex-shrink-0 shadow-xs"
                >
                  {uploadingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
            <img
              src="/brand/logo/logo-symbol.svg"
              alt="CHITHI"
              className="w-14 h-14 rounded-2xl shadow-xs mb-3 object-contain"
            />
            <h2 className="text-lg font-bold tracking-tight text-foreground mb-1">Select a conversation</h2>
            <p className="text-xs text-muted max-w-sm leading-relaxed">
              Choose an active chat from the sidebar or start a new conversation with an accepted friend.
            </p>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. RIGHT PROFILE DETAIL PANEL (Exact Mockup Match) */}
      {/* ======================================================== */}
      {activeConv && showRightPanel && (
        <aside className="hidden xl:flex flex-col w-72 2xl:w-80 border-l border-border/50 bg-surface p-4 overflow-y-auto select-none flex-shrink-0">
          <div className="bg-surface rounded-2xl overflow-hidden border border-border/50 shadow-xs">
            {/* Scenic Cover Banner */}
            <div className="h-36 w-full overflow-hidden relative bg-surface-muted">
              <img
                src={partnerProfile?.coverMediaId ? getMediaUrl(partnerProfile.coverMediaId) : '/brand/scenic-cover.jpg'}
                alt="Cover"
                crossOrigin="anonymous"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/brand/scenic-cover.jpg';
                }}
              />
            </div>

            {/* Overlapping Centered Avatar */}
            <div className="relative -mt-10 flex justify-center">
              <div className="p-1 rounded-full bg-surface shadow-md">
                <UserAvatar
                  displayName={activeConv.title}
                  username={activeConv.otherParticipant?.username}
                  avatarMediaId={activeConv.otherParticipant?.avatarMediaId}
                  size="xl"
                  isOnline={activeConv.otherParticipant ? onlineUsers.has(activeConv.otherParticipant.id) : false}
                />
              </div>
            </div>

            {/* User Details */}
            <div className="px-5 pt-2 pb-5 text-center">
              <h3 className="font-bold text-base text-foreground truncate">
                {activeConv.title}
              </h3>
              <p className="text-xs text-muted mt-0.5 truncate">
                {partnerProfile?.bio || 'Dream • Create • Connect'}
              </p>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={() => {
                  if (activeConv.otherParticipant?.id) {
                    setProfileModalUserId(activeConv.otherParticipant.id);
                  }
                }}
                className="w-full mt-4 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{partnerProfile?.isFriend ? 'Friends' : 'Add Friend'}</span>
              </button>

              {/* Stats Counters */}
              <div className="grid grid-cols-3 gap-2 mt-5 py-3 border-y border-border/40 text-center">
                <div>
                  <div className="font-bold text-sm text-foreground">
                    {partnerProfile?.friendCount ?? 124}
                  </div>
                  <div className="text-[11px] text-muted font-medium">Friends</div>
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground">
                    {partnerProfile?.postCount ?? 48}
                  </div>
                  <div className="text-[11px] text-muted font-medium">Moments</div>
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground">12</div>
                  <div className="text-[11px] text-muted font-medium">Posts</div>
                </div>
              </div>

              {/* About Section */}
              <div className="mt-4 text-left">
                <h4 className="font-bold text-xs text-foreground mb-1">About</h4>
                <p className="text-xs text-muted leading-relaxed">
                  {partnerProfile?.bio || 'Good vibes only 🌿'}
                </p>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* ======================================================== */}
      {/* 3. MODALS & LIGHTBOX */}
      {/* ======================================================== */}
      {friendsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">New Conversation</h3>
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
                      <h4 className="font-semibold text-sm text-foreground">{f.displayName}</h4>
                      <p className="text-xs text-muted">@{f.username}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Call History Modal */}
      <CallHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        onCallUser={(convId, type, peer) => startCall(convId, type, peer)}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={!!profileModalUserId}
        onClose={() => setProfileModalUserId(null)}
        targetUserId={profileModalUserId || undefined}
      />

      {/* Lightbox / Media Viewer Modal */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxMedia(null)}
        >
          <button
            onClick={() => setLightboxMedia(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors z-50"
            title="Close viewer"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxMedia.type === 'image' ? (
              <img
                src={lightboxMedia.url}
                alt="Enlarged media"
                crossOrigin="anonymous"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              />
            ) : (
              <video
                src={lightboxMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
