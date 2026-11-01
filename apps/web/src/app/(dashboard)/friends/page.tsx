'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth.store';
import { useChatStore } from '../../../stores/chat.store';
import {
  Users,
  UserPlus,
  UserCheck,
  Search,
  MessageSquare,
  UserMinus,
  Ban,
  Check,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import UserAvatar from '../../../components/ui/UserAvatar';
import UserProfileModal from '../../../components/profile/UserProfileModal';

export default function FriendsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setActiveConversationId } = useChatStore();

  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add'>('friends');
  const [friends, setFriends] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile modal state
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);
  const [profileModalUsername, setProfileModalUsername] = useState<string | null>(null);

  // Exact username search state
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [searchSearched, setSearchSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [requestSentSuccess, setRequestSentSuccess] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [friendsData, incomingData, outgoingData] = await Promise.all([
        apiFetch<any[]>('/friends'),
        apiFetch<any[]>('/friend-requests/incoming'),
        apiFetch<any[]>('/friend-requests/outgoing'),
      ]);
      setFriends(friendsData);
      setIncomingRequests(incomingData);
      setOutgoingRequests(outgoingData);
    } catch (err) {
      console.error('Failed to load friends data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchExact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResult(null);
    setSearchSearched(false);
    setRequestSentSuccess(false);

    try {
      const res = await apiFetch<any>(`/users/search?username=${encodeURIComponent(searchUsername.trim())}`);
      setSearchResult(res.user);
      setSearchSearched(true);
    } catch (err: any) {
      setSearchError(err?.message || 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendRequest = async (receiverId: string) => {
    try {
      await apiFetch('/friend-requests', {
        method: 'POST',
        body: { receiverId },
      });
      setRequestSentSuccess(true);
      if (searchResult) {
        setSearchResult({ ...searchResult, friendshipStatus: 'pending_sent' });
      }
      loadData();
    } catch (err: any) {
      setSearchError(err?.message || 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await apiFetch(`/friend-requests/${requestId}/accept`, { method: 'POST' });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await apiFetch(`/friend-requests/${requestId}/reject`, { method: 'POST' });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelOutgoing = async (requestId: string) => {
    try {
      await apiFetch(`/friend-requests/${requestId}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnfriend = async (friendId: string) => {
    if (!confirm('Are you sure you want to unfriend this user?')) return;
    try {
      await apiFetch(`/friends/${friendId}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlock = async (friendId: string) => {
    if (!confirm('Are you sure you want to block this user?')) return;
    try {
      await apiFetch(`/users/${friendId}/block`, { method: 'POST' });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const startChat = async (friendId: string) => {
    try {
      const conv = await apiFetch<any>('/conversations/direct', {
        method: 'POST',
        body: { friendId },
      });
      setActiveConversationId(conv.id);
      router.push('/chats');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-surface-muted flex items-center justify-center text-primary">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Friends</h1>
          <p className="text-xs text-muted">Manage your connections and incoming requests</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border/50 pb-3 mb-6">
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            activeTab === 'friends'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted hover:text-foreground hover:bg-surface-muted'
          }`}
        >
          My Friends ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'requests'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted hover:text-foreground hover:bg-surface-muted'
          }`}
        >
          Requests
          {incomingRequests.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {incomingRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'add'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted hover:text-foreground hover:bg-surface-muted'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Add Friend
        </button>
      </div>

      {/* Tab: My Friends */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted">Loading friends...</div>
          ) : friends.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center bg-surface border border-border rounded-2xl gap-3">
              <div className="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center text-muted">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-base">No friends yet</h3>
              <p className="text-xs text-muted max-w-sm">
                Add friends using their exact username to start messaging and seeing their Moments.
              </p>
              <button
                onClick={() => setActiveTab('add')}
                className="mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-md shadow-primary/20 transition-all"
              >
                Add Your First Friend
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friends.map((f) => (
                <div key={f.friendId} className="bg-surface border border-border/60 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:border-border/80 transition-colors">
                  <button
                    onClick={() => setProfileModalUserId(f.friendId)}
                    className="flex items-center gap-3 min-w-0 text-left hover:opacity-85 transition-opacity"
                    title="View Profile"
                  >
                    <UserAvatar
                      displayName={f.displayName}
                      username={f.username}
                      avatarMediaId={f.avatarMediaId}
                      size="md"
                    />
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm truncate hover:underline text-foreground">
                        {f.displayName}
                      </h4>
                      <p className="text-xs text-muted truncate">@{f.username}</p>
                      {f.bio && <p className="text-xs text-muted/80 truncate mt-0.5">{f.bio}</p>}
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                    <button
                      onClick={() => startChat(f.friendId)}
                      className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                      title="Send Message"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleUnfriend(f.friendId)}
                      className="p-2 rounded-xl hover:bg-destructive/10 text-muted hover:text-destructive transition-colors"
                      title="Unfriend"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleBlock(f.friendId)}
                      className="p-2 rounded-xl hover:bg-destructive/10 text-muted hover:text-destructive transition-colors"
                      title="Block User"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Incoming */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-3">
              Incoming Requests ({incomingRequests.length})
            </h3>
            {incomingRequests.length === 0 ? (
              <p className="text-xs text-muted italic bg-surface p-4 rounded-xl border border-border">
                No incoming friend requests.
              </p>
            ) : (
              <div className="space-y-3">
                {incomingRequests.map((req) => (
                  <div key={req.id} className="bg-surface border border-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <button
                      onClick={() => setProfileModalUserId(req.sender?.id)}
                      className="flex items-center gap-3 text-left hover:opacity-85 transition-opacity"
                    >
                      <UserAvatar
                        displayName={req.sender?.profile?.displayName}
                        username={req.sender?.username}
                        avatarMediaId={req.sender?.profile?.avatarMediaId}
                        size="md"
                      />
                      <div>
                        <h4 className="font-bold text-sm text-foreground hover:underline">
                          {req.sender?.profile?.displayName || req.sender?.username}
                        </h4>
                        <p className="text-xs text-muted">@{req.sender?.username}</p>
                      </div>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcceptRequest(req.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="px-3.5 py-1.5 rounded-xl border border-border text-xs font-semibold hover:bg-surface-muted flex items-center gap-1 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-3">
              Sent Requests ({outgoingRequests.length})
            </h3>
            {outgoingRequests.length === 0 ? (
              <p className="text-xs text-muted italic bg-surface p-4 rounded-xl border border-border">
                No outgoing requests awaiting response.
              </p>
            ) : (
              <div className="space-y-3">
                {outgoingRequests.map((req) => (
                  <div key={req.id} className="bg-surface border border-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <button
                      onClick={() => setProfileModalUserId(req.receiver?.id)}
                      className="flex items-center gap-3 text-left hover:opacity-85 transition-opacity"
                    >
                      <UserAvatar
                        displayName={req.receiver?.profile?.displayName}
                        username={req.receiver?.username}
                        avatarMediaId={req.receiver?.profile?.avatarMediaId}
                        size="md"
                      />
                      <div>
                        <h4 className="font-bold text-sm text-foreground hover:underline">
                          {req.receiver?.profile?.displayName || req.receiver?.username}
                        </h4>
                        <p className="text-xs text-muted">@{req.receiver?.username}</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleCancelOutgoing(req.id)}
                      className="px-3 py-1.5 rounded-xl border border-border text-xs text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Cancel Request
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Add Friend (Exact Username Search) */}
      {activeTab === 'add' && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-base mb-1">Find Someone by Username</h3>
            <p className="text-xs text-muted mb-5 leading-relaxed">
              CHITHI connects you with people you already know. Enter their exact username to view their preview and send a connection request.
            </p>

            <form onSubmit={handleSearchExact} className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Enter exact username..."
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button
                type="submit"
                disabled={searchLoading || !searchUsername.trim()}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-md shadow-primary/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </button>
            </form>

            {searchError && (
              <div className="p-3.5 rounded-xl bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {requestSentSuccess && (
              <div className="p-3.5 rounded-xl bg-success/10 text-success text-xs flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>Friend request sent successfully!</span>
              </div>
            )}

            {searchSearched && !searchResult && (
              <div className="p-8 text-center text-sm text-muted">
                No user found matching &quot;{searchUsername}&quot;. Check the spelling and try again.
              </div>
            )}

            {searchResult && (
              <div className="mt-6 p-4 rounded-2xl border border-border bg-surface flex items-center justify-between shadow-sm">
                <button
                  onClick={() => setProfileModalUserId(searchResult.id)}
                  className="flex items-center gap-3.5 text-left hover:opacity-85 transition-opacity"
                >
                  <UserAvatar
                    displayName={searchResult.displayName}
                    username={searchResult.username}
                    avatarMediaId={searchResult.avatarMediaId}
                    size="md"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-foreground hover:underline">
                      {searchResult.displayName}
                    </h4>
                    <p className="text-xs text-muted">@{searchResult.username}</p>
                  </div>
                </button>

                <div>
                  {searchResult.friendshipStatus === 'self' ? (
                    <span className="text-xs text-muted font-medium">This is you</span>
                  ) : searchResult.friendshipStatus === 'friends' ? (
                    <span className="text-xs text-success font-semibold flex items-center gap-1">
                      <UserCheck className="w-4 h-4" />
                      Already Friends
                    </span>
                  ) : searchResult.friendshipStatus === 'pending_sent' ? (
                    <span className="text-xs text-muted font-medium">Request Pending</span>
                  ) : searchResult.friendshipStatus === 'pending_received' ? (
                    <span className="text-xs text-primary font-medium">Sent you a request</span>
                  ) : searchResult.friendshipStatus === 'blocked' ? (
                    <span className="text-xs text-destructive font-medium">Blocked</span>
                  ) : (
                    <button
                      onClick={() => handleSendRequest(searchResult.id)}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-md shadow-primary/20 flex items-center gap-1.5 transition-all"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add Friend
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={!!(profileModalUserId || profileModalUsername)}
        onClose={() => {
          setProfileModalUserId(null);
          setProfileModalUsername(null);
        }}
        targetUserId={profileModalUserId || undefined}
        username={profileModalUsername || undefined}
      />
    </div>
  );
}
