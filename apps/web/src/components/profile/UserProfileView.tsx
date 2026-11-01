'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';
import { useChatStore } from '../../stores/chat.store';
import { useWebRTCCall } from '../../hooks/useWebRTCCall';
import UserAvatar from '../ui/UserAvatar';
import {
  MessageSquare,
  Phone,
  Video,
  UserPlus,
  UserCheck,
  UserX,
  ShieldAlert,
  Calendar,
  Users,
  Compass,
  Check,
  Loader2,
  AlertCircle,
  X,
  MoreHorizontal,
  Clock,
  Sparkles,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface UserProfileViewProps {
  targetUserId?: string;
  username?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export default function UserProfileView({
  targetUserId,
  username,
  onClose,
  isModal = false,
}: UserProfileViewProps) {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const { setActiveConversationId, onlineUsers } = useChatStore();
  const { startCall } = useWebRTCCall();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [relationshipStatus, setRelationshipStatus] = useState<string>('none');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'moments'>('overview');
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let resolvedUserId = targetUserId;

      // If only username was provided, resolve user preview first
      if (!resolvedUserId && username) {
        const searchRes = await apiFetch<any>(`/users/search?username=${encodeURIComponent(username)}`);
        if (!searchRes?.user) {
          setError('User profile not found');
          setLoading(false);
          return;
        }
        resolvedUserId = searchRes.user.id;
        setRelationshipStatus(searchRes.user.friendshipStatus || 'none');
      }

      if (!resolvedUserId) {
        setError('No user identifier provided');
        setLoading(false);
        return;
      }

      // Fetch full profile
      const data = await apiFetch<any>(`/profiles/${resolvedUserId}`);
      setProfile(data);

      // Determine relationship if not already set
      if (!username || relationshipStatus === 'none') {
        const preview = await apiFetch<any>(`/users/${resolvedUserId}/preview`);
        if (preview) {
          setRelationshipStatus(preview.friendshipStatus || 'none');
        }
      }

      // If pending received, look up request ID
      if (relationshipStatus === 'pending_received' || (!data.isFriend && !data.isSelf)) {
        try {
          const incoming = await apiFetch<any[]>('/friend-requests/incoming');
          const match = incoming.find((r) => r.senderId === resolvedUserId || r.sender?.id === resolvedUserId);
          if (match) {
            setPendingRequestId(match.id);
            setRelationshipStatus('pending_received');
          }
        } catch {}
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError(err?.message || 'Could not load profile');
    } finally {
      setLoading(false);
    }
  }, [targetUserId, username, relationshipStatus]);

  useEffect(() => {
    fetchProfileData();
  }, [targetUserId, username]);

  // Load user moments if friends or self
  useEffect(() => {
    if (profile?.isFriend || profile?.isSelf) {
      setLoadingPosts(true);
      apiFetch<any>('/feed?limit=30')
        .then((res) => {
          const filtered = (res.posts || []).filter((p: any) => p.authorId === profile.userId);
          setUserPosts(filtered);
        })
        .catch(console.error)
        .finally(() => setLoadingPosts(false));
    }
  }, [profile]);

  const isOnline = profile ? onlineUsers.has(profile.userId) : false;

  // Actions
  const handleStartMessage = async () => {
    if (!profile) return;
    setActionLoading(true);
    try {
      const conv = await apiFetch<any>('/conversations/direct', {
        method: 'POST',
        body: { friendId: profile.userId },
      });
      setActiveConversationId(conv.id);
      if (onClose) onClose();
      router.push('/chats');
    } catch (err: any) {
      alert(`Could not start chat: ${err.message || 'Direct chat is only available between mutual friends'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartVoiceCall = async () => {
    if (!profile) return;
    try {
      const conv = await apiFetch<any>('/conversations/direct', {
        method: 'POST',
        body: { friendId: profile.userId },
      });
      startCall(conv.id, 'audio', {
        id: profile.userId,
        username: profile.username,
        displayName: profile.displayName,
        avatarMediaId: profile.avatarMediaId,
      });
      if (onClose) onClose();
    } catch (err: any) {
      alert(`Could not initiate call: ${err.message || 'Calls are permitted between mutual friends'}`);
    }
  };

  const handleStartVideoCall = async () => {
    if (!profile) return;
    try {
      const conv = await apiFetch<any>('/conversations/direct', {
        method: 'POST',
        body: { friendId: profile.userId },
      });
      startCall(conv.id, 'video', {
        id: profile.userId,
        username: profile.username,
        displayName: profile.displayName,
        avatarMediaId: profile.avatarMediaId,
      });
      if (onClose) onClose();
    } catch (err: any) {
      alert(`Could not initiate video call: ${err.message || 'Calls are permitted between mutual friends'}`);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!profile) return;
    setActionLoading(true);
    try {
      await apiFetch('/friend-requests', {
        method: 'POST',
        body: { receiverId: profile.userId },
      });
      setRelationshipStatus('pending_sent');
    } catch (err: any) {
      alert(err.message || 'Could not send friend request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!pendingRequestId) return;
    setActionLoading(true);
    try {
      await apiFetch(`/friend-requests/${pendingRequestId}/accept`, { method: 'POST' });
      setRelationshipStatus('friends');
      setProfile((prev: any) => ({ ...prev, isFriend: true }));
    } catch (err: any) {
      alert(err.message || 'Failed to accept friend request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!profile || !confirm(`Are you sure you want to unfriend ${profile.displayName}?`)) return;
    setActionLoading(true);
    try {
      await apiFetch(`/friends/${profile.userId}`, { method: 'DELETE' });
      setRelationshipStatus('none');
      setProfile((prev: any) => ({ ...prev, isFriend: false }));
      setActionMenuOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to unfriend');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!profile || !confirm(`Block ${profile.displayName}? They will no longer be able to message or call you.`)) return;
    setActionLoading(true);
    try {
      await apiFetch(`/users/${profile.userId}/block`, { method: 'POST' });
      setRelationshipStatus('blocked');
      setProfile((prev: any) => ({ ...prev, isFriend: false }));
      setActionMenuOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to block user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!profile) return;
    setActionLoading(true);
    try {
      await apiFetch(`/users/${profile.userId}/block`, { method: 'DELETE' });
      setRelationshipStatus('none');
      setActionMenuOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to unblock user');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted">Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-12 text-center flex flex-col items-center max-w-sm mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground mb-1">Profile Unavailable</h3>
        <p className="text-xs text-muted mb-6">{error || 'This user does not exist or has been deactivated.'}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-muted hover:bg-border text-xs font-semibold"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  const isSelf = profile.isSelf || profile.userId === currentUser?.id;
  const isFriends = profile.isFriend || relationshipStatus === 'friends';
  const coverUrl = profile.coverMediaId ? `${API_URL}/media/${profile.coverMediaId}/file` : null;

  return (
    <div className={`w-full flex flex-col ${isModal ? 'max-h-[85vh] overflow-y-auto' : ''}`}>
      {/* Cover Banner */}
      <div className="relative h-44 sm:h-56 md:h-64 w-full bg-gradient-to-r from-indigo-700 via-primary to-purple-700 overflow-hidden select-none">
        {coverUrl ? (
          <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-25">
            <span className="font-extrabold text-4xl sm:text-6xl tracking-widest text-white">CHITHI চিঠি</span>
          </div>
        )}

        {isModal && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors z-10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Profile Header & Identity Info */}
      <div className="px-6 pb-6 relative bg-surface border-b border-border/70">
        <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 sm:-mt-20 mb-5 gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className="rounded-full p-1 bg-surface shadow-2xl">
              <UserAvatar
                displayName={profile.displayName}
                username={profile.username}
                avatarMediaId={profile.avatarMediaId}
                size="2xl"
                isOnline={isOnline}
              />
            </div>
          </div>

          {/* Quick Action Buttons (Messenger Styled) */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
            {isSelf ? (
              <button
                onClick={() => router.push('/settings')}
                className="px-4 py-2.5 rounded-2xl bg-surface-muted hover:bg-border text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
              >
                <span>Edit in Settings</span>
              </button>
            ) : (
              <>
                {/* 1. Direct Message */}
                {isFriends && (
                  <button
                    onClick={handleStartMessage}
                    disabled={actionLoading}
                    className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-md shadow-primary/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                    title="Send Direct Message"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Message</span>
                  </button>
                )}

                {/* 2. Voice Call */}
                {isFriends && (
                  <button
                    onClick={handleStartVoiceCall}
                    className="p-2.5 rounded-2xl bg-surface-muted hover:bg-primary/10 hover:text-primary text-foreground transition-all shadow-sm"
                    title="Audio Call"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                )}

                {/* 3. Video Call */}
                {isFriends && (
                  <button
                    onClick={handleStartVideoCall}
                    className="p-2.5 rounded-2xl bg-surface-muted hover:bg-primary/10 hover:text-primary text-foreground transition-all shadow-sm"
                    title="Video Call"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                )}

                {/* 4. Relationship Primary Action */}
                {isFriends ? (
                  <div className="relative">
                    <button
                      onClick={() => setActionMenuOpen(!actionMenuOpen)}
                      className="px-4 py-2.5 rounded-2xl bg-surface-muted hover:bg-border text-foreground text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <UserCheck className="w-4 h-4 text-emerald-500" />
                      <span>Friends</span>
                    </button>
                    {actionMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-surface border border-border shadow-xl p-1.5 z-30 animate-in fade-in zoom-in-95">
                        <button
                          onClick={handleUnfriend}
                          className="w-full px-3 py-2 text-left text-xs font-semibold rounded-xl text-destructive hover:bg-destructive/10 flex items-center gap-2"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Unfriend {profile.displayName}
                        </button>
                        <button
                          onClick={handleBlockUser}
                          className="w-full px-3 py-2 text-left text-xs font-semibold rounded-xl text-destructive hover:bg-destructive/10 flex items-center gap-2"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Block User
                        </button>
                      </div>
                    )}
                  </div>
                ) : relationshipStatus === 'pending_sent' ? (
                  <button
                    disabled
                    className="px-4 py-2.5 rounded-2xl bg-surface-muted text-muted text-xs font-semibold flex items-center gap-2 cursor-default"
                  >
                    <Clock className="w-4 h-4 animate-spin text-primary" />
                    <span>Request Sent</span>
                  </button>
                ) : relationshipStatus === 'pending_received' ? (
                  <button
                    onClick={handleAcceptRequest}
                    disabled={actionLoading}
                    className="px-4 py-2.5 rounded-2xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Accept Request</span>
                  </button>
                ) : relationshipStatus === 'blocked' ? (
                  <button
                    onClick={handleUnblockUser}
                    disabled={actionLoading}
                    className="px-4 py-2.5 rounded-2xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold flex items-center gap-1.5"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>Unblock User</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSendFriendRequest}
                    disabled={actionLoading}
                    className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-md shadow-primary/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Friend</span>
                  </button>
                )}

                {/* More Options */}
                {!isFriends && relationshipStatus !== 'blocked' && (
                  <button
                    onClick={handleBlockUser}
                    className="p-2.5 rounded-2xl bg-surface-muted hover:bg-destructive/10 hover:text-destructive text-muted transition-colors"
                    title="Block User"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* User Identity Details */}
        <div className="text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {profile.displayName}
            </h1>
            {isOnline && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold self-center sm:self-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Now
              </span>
            )}
          </div>
          <p className="text-xs text-muted font-medium mt-0.5">@{profile.username}</p>

          {profile.bio ? (
            <p className="text-sm mt-3 text-foreground/90 max-w-2xl leading-relaxed whitespace-pre-wrap">
              {profile.bio}
            </p>
          ) : (
            <p className="text-xs text-muted/70 italic mt-3">No bio written yet.</p>
          )}

          {/* Messenger Badges Row */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 mt-5 pt-4 border-t border-border/60 text-xs text-muted">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Users className="w-4 h-4 text-primary" />
              <span>{profile.friendCount || 0}</span>
              <span className="text-muted font-normal">Friends</span>
            </div>
            {profile.postCount !== null && (
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Compass className="w-4 h-4 text-primary" />
                <span>{profile.postCount || 0}</span>
                <span className="text-muted font-normal">Moments</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 font-normal">
              <Calendar className="w-4 h-4 text-muted" />
              <span>
                Joined {new Date(profile.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 px-6 border-b border-border bg-surface sticky top-0 z-10 text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3.5 border-b-2 transition-all ${
            activeTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          About & Overview
        </button>
        {(isFriends || isSelf) && (
          <button
            onClick={() => setActiveTab('moments')}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'moments'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            <span>Moments</span>
            {userPosts.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
                {userPosts.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Tab Contents */}
      <div className="p-6 bg-background space-y-4">
        {activeTab === 'overview' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-surface border border-border shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">About</h4>
              <p className="text-xs text-foreground/80 leading-relaxed mb-3">
                {profile.bio || `${profile.displayName} is a member of the CHITHI private messaging network.`}
              </p>
              <div className="pt-3 border-t border-border/50 text-xs space-y-2 text-muted">
                <div className="flex justify-between">
                  <span>Username:</span>
                  <span className="font-semibold text-foreground">@{profile.username}</span>
                </div>
                <div className="flex justify-between">
                  <span>Network:</span>
                  <span className="font-semibold text-foreground">CHITHI Social</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-surface border border-border shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Friendship & Privacy</h4>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Connection Status:</span>
                  <span className="font-bold text-foreground capitalize">
                    {isSelf ? 'You' : isFriends ? 'Mutual Friends' : relationshipStatus.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Direct Messaging:</span>
                  <span className={`font-semibold ${isFriends || isSelf ? 'text-emerald-500' : 'text-muted'}`}>
                    {isFriends || isSelf ? 'Enabled' : 'Mutual Friends Only'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Audio / Video Calls:</span>
                  <span className={`font-semibold ${isFriends || isSelf ? 'text-emerald-500' : 'text-muted'}`}>
                    {isFriends || isSelf ? 'Available' : 'Mutual Friends Only'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Moments Tab */
          <div>
            {loadingPosts ? (
              <div className="p-12 text-center text-xs text-muted">Loading moments...</div>
            ) : userPosts.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted bg-surface border border-border rounded-3xl">
                No moments shared by {profile.displayName} yet.
              </div>
            ) : (
              <div className="space-y-4 max-w-xl mx-auto">
                {userPosts.map((post) => (
                  <div key={post.id} className="p-5 rounded-3xl bg-surface border border-border shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          displayName={profile.displayName}
                          username={profile.username}
                          avatarMediaId={profile.avatarMediaId}
                          size="sm"
                        />
                        <div>
                          <h5 className="font-bold text-xs">{profile.displayName}</h5>
                          <p className="text-[10px] text-muted">
                            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {post.contentText}
                    </p>

                    <div className="pt-2 border-t border-border/50 flex items-center gap-4 text-xs text-muted">
                      <span>{post.reactionCount || 0} Reactions</span>
                      <span>•</span>
                      <span>{post.commentCount || 0} Comments</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
