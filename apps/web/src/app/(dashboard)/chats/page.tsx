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
  Smile,
  Circle,
  MessageSquare,
  Users,
  Phone,
  Video,
  History,
  Paperclip,
  X,
  Loader2,
  Maximize2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setHistoryModalOpen(true)}
              className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
              title="Call History"
            >
              <History className="w-5 h-5" />
            </button>
            <button
              onClick={openNewChatModal}
              className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              title="Start new conversation"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
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
              <img
                src="/brand/logo/logo-symbol.svg"
                alt="CHITHI"
                className="w-12 h-12 rounded-2xl shadow-sm mb-1 object-contain"
              />
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
                  className={`w-full p-3.5 flex items-start gap-3.5 text-left transition-colors rounded-2xl ${
                    isActive ? 'bg-primary/10' : 'hover:bg-surface-muted/60'
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

                <button
                  onClick={() => {
                    if (activeConv.otherParticipant?.id) {
                      setProfileModalUserId(activeConv.otherParticipant.id);
                    }
                  }}
                  className="flex items-center gap-3 hover:opacity-85 transition-opacity text-left cursor-pointer"
                  title="View user profile"
                >
                  <UserAvatar
                    displayName={activeConv.title}
                    username={activeConv.otherParticipant?.username}
                    avatarMediaId={activeConv.otherParticipant?.avatarMediaId}
                    size="md"
                    isOnline={activeConv.otherParticipant ? onlineUsers.has(activeConv.otherParticipant.id) : false}
                  />

                  <div>
                    <h2 className="font-bold text-sm leading-tight hover:underline flex items-center gap-1.5">
                      <span>{activeConv.title}</span>
                    </h2>
                    <p className="text-xs text-muted">
                      {activeConv.otherParticipant && onlineUsers.has(activeConv.otherParticipant.id)
                        ? 'Active Now'
                        : activeConv.otherParticipant
                        ? `@${activeConv.otherParticipant.username}`
                        : 'Direct Chat'}
                    </p>
                  </div>
                </button>
              </div>

              {/* Calling Action Buttons */}
              {activeConv.otherParticipant && (
                <div className="flex items-center gap-1.5">
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
                    className="p-2.5 rounded-xl text-foreground/80 hover:text-primary hover:bg-primary/10 transition-colors"
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
                    className="p-2.5 rounded-xl text-foreground/80 hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Video className="w-5 h-5" />
                  </button>
                </div>
              )}
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
                  const attachments = msg.attachments || [];

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] p-2.5 rounded-2xl text-sm shadow-sm ${
                          isMine
                            ? 'bg-primary text-primary-foreground rounded-br-xs'
                            : 'bg-surface border border-border text-foreground rounded-bl-xs'
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
                              <div key={att.id || mediaId} className="mb-2 rounded-xl overflow-hidden bg-black/90">
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
                              className="mb-2 rounded-xl overflow-hidden cursor-pointer relative group bg-black/10"
                              onClick={() => setLightboxMedia({ url: mediaUrl, type: 'image' })}
                            >
                              <img
                                src={mediaUrl}
                                alt="Attachment"
                                crossOrigin="anonymous"
                                className="w-full max-h-72 object-cover rounded-xl transition-transform hover:scale-101"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                <span className="p-2 rounded-full bg-black/60 text-white backdrop-blur-xs">
                                  <Maximize2 className="w-4 h-4" />
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {/* Text body if present */}
                        {msg.body && (
                          <p className="px-1.5 py-0.5 whitespace-pre-wrap break-words">{msg.body}</p>
                        )}

                        <div
                          className={`flex items-center justify-end gap-1 text-[10px] mt-1 px-1.5 ${
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

            {/* Selected Attachment Preview Bar */}
            {selectedFile && (
              <div className="p-3 bg-surface border-t border-border flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-background border border-border flex-shrink-0 relative">
                    {fileType === 'image' && filePreview ? (
                      <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary bg-primary/10">
                        <Video className="w-6 h-6" />
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
                  className="p-1.5 rounded-full hover:bg-surface-muted text-muted hover:text-foreground transition-colors disabled:opacity-40"
                  title="Remove attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Hidden file pickers */}
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

            {/* Message Composer */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-surface flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingMedia}
                  title="Attach Photo"
                  className="p-2 rounded-xl text-muted hover:text-primary hover:bg-surface-muted transition-colors disabled:opacity-40"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploadingMedia}
                  title="Attach Video"
                  className="p-2 rounded-xl text-muted hover:text-primary hover:bg-surface-muted transition-colors disabled:opacity-40"
                >
                  <Video className="w-5 h-5" />
                </button>
              </div>

              <input
                type="text"
                placeholder={selectedFile ? 'Add a caption (optional)...' : 'Type a message...'}
                value={inputText}
                onChange={handleInputChange}
                disabled={uploadingMedia}
                className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={uploadingMedia || (!inputText.trim() && !selectedFile)}
                className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-40 flex items-center justify-center"
              >
                {uploadingMedia ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <img
              src="/brand/logo/logo-symbol.svg"
              alt="CHITHI"
              className="w-16 h-16 rounded-2xl shadow-md shadow-primary/20 mb-4 object-contain"
            />
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
