'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, uploadMediaFile } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth.store';
import UserAvatar from '../../../components/ui/UserAvatar';
import {
  Camera,
  Edit3,
  Calendar,
  Users,
  Compass,
  Check,
  Loader2,
  AlertCircle,
  Settings,
  Mail,
  ShieldCheck,
  X,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function MyProfilePage() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [profileData, setProfileData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState(false);

  // Photo Upload & Preview State
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverError, setCoverError] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // Content Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'moments' | 'friends'>('overview');
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [myFriends, setMyFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiFetch<any>(`/profiles/${user.id}`);
      setProfileData(data);
      setDisplayName(data.displayName || user.displayName);
      setBio(data.bio || '');
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  // Load user's moments
  useEffect(() => {
    if (activeTab === 'moments' && user) {
      setLoadingPosts(true);
      apiFetch<any>('/feed?limit=40')
        .then((res) => {
          const mine = (res.posts || []).filter((p: any) => p.authorId === user.id);
          setMyPosts(mine);
        })
        .catch(console.error)
        .finally(() => setLoadingPosts(false));
    } else if (activeTab === 'friends') {
      setLoadingFriends(true);
      apiFetch<any[]>('/friends')
        .then((res) => setMyFriends(res || []))
        .catch(console.error)
        .finally(() => setLoadingFriends(false));
    }
  }, [activeTab, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const updated = await apiFetch<any>('/profiles/me', {
        method: 'PATCH',
        body: {
          displayName: displayName.trim(),
          bio: bio.trim(),
        },
      });

      updateUser({
        displayName: updated.displayName,
        bio: updated.bio,
      });

      setProfileData((prev: any) => ({
        ...prev,
        displayName: updated.displayName,
        bio: updated.bio,
      }));

      setSuccessNote(true);
      setTimeout(() => setSuccessNote(false), 2500);
      setIsEditModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Direct Avatar Upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show immediate preview
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setUploadingAvatar(true);
    try {
      const media = await uploadMediaFile(file, 'avatar');
      const updated = await apiFetch<any>('/profiles/me', {
        method: 'PATCH',
        body: { avatarMediaId: media.id },
      });

      updateUser({ avatarMediaId: media.id });
      setProfileData((prev: any) => ({
        ...prev,
        avatarMediaId: media.id,
      }));
    } catch (err: any) {
      alert(`Avatar upload failed: ${err.message || 'Error uploading image'}`);
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Direct Cover Upload
  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show immediate preview
    const previewUrl = URL.createObjectURL(file);
    setCoverPreview(previewUrl);
    setCoverError(false);
    setUploadingCover(true);
    try {
      const media = await uploadMediaFile(file, 'cover');
      const updated = await apiFetch<any>('/profiles/me', {
        method: 'PATCH',
        body: { coverMediaId: media.id },
      });

      updateUser({ coverMediaId: media.id });
      setProfileData((prev: any) => ({
        ...prev,
        coverMediaId: media.id,
      }));
    } catch (err: any) {
      alert(`Cover upload failed: ${err.message || 'Error uploading image'}`);
      setCoverPreview(null);
    } finally {
      setUploadingCover(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted">Loading your profile...</p>
      </div>
    );
  }

  const coverUrl = profileData?.coverMediaId ? `${API_URL}/media/${profileData.coverMediaId}/file` : null;
  const activeCover = coverPreview || (coverUrl && !coverError ? coverUrl : null);

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto py-4 sm:py-6 px-3 sm:px-6">
        {/* Main Messenger Profile Card */}
        <div className="bg-surface border border-border shadow-sm rounded-3xl overflow-hidden mb-6">
          {/* Cover Photo Banner */}
          <div className="relative h-44 sm:h-60 md:h-72 w-full bg-gradient-to-r from-indigo-700 via-primary to-purple-800 overflow-hidden group select-none">
            {activeCover ? (
              <img
                src={activeCover}
                alt="Cover"
                crossOrigin="anonymous"
                className="w-full h-full object-cover"
                onError={() => setCoverError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center opacity-30">
                <span className="font-extrabold text-4xl sm:text-7xl tracking-widest text-white">চিঠি CHITHI</span>
              </div>
            )}

            {/* Change Cover Button Overlay */}
            <input
              type="file"
              ref={coverInputRef}
              onChange={handleCoverFileChange}
              accept="image/jpeg,image/png,image/webp"
              data-testid="cover-file-input"
              className="hidden"
            />
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="absolute bottom-4 right-4 px-3.5 py-2 rounded-2xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md text-xs font-semibold flex items-center gap-2 transition-all shadow-lg active:scale-95"
            >
              {uploadingCover ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Change Cover Photo</span>
            </button>
          </div>

          {/* Profile Identity Info Bar */}
          <div className="px-6 pb-6 relative">
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 sm:-mt-20 mb-4 gap-4">
              {/* Avatar with Camera Overlay */}
              <div className="relative group">
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  data-testid="avatar-file-input"
                  className="hidden"
                />
                <div className="rounded-full p-1 bg-surface shadow-2xl">
                  <UserAvatar
                    displayName={profileData?.displayName || user?.displayName}
                    username={user?.username}
                    avatarMediaId={profileData?.avatarMediaId || user?.avatarMediaId}
                    previewUrl={avatarPreview}
                    size="2xl"
                    isOnline={true}
                  />
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="Update profile picture"
                  className="absolute bottom-1 right-1 p-2.5 rounded-full bg-primary hover:bg-primary-hover text-white shadow-lg border-2 border-surface transition-transform hover:scale-110 active:scale-95"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-md shadow-primary/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>

                <Link
                  href="/settings"
                  className="p-2.5 rounded-2xl bg-surface-muted hover:bg-border text-foreground transition-colors shadow-sm"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Name, Username, Bio */}
            <div className="text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  {profileData?.displayName || user?.displayName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold self-center sm:self-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Now
                </span>
              </div>
              <p className="text-xs text-muted font-medium mt-0.5">@{user?.username}</p>

              {profileData?.bio ? (
                <p className="text-sm mt-3 text-foreground/90 max-w-2xl leading-relaxed whitespace-pre-wrap">
                  {profileData.bio}
                </p>
              ) : (
                <p className="text-xs text-muted/70 italic mt-3">
                  Tap &quot;Edit Profile&quot; to add a bio and tell your friends about yourself.
                </p>
              )}

              {/* Stats Badges */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-5 mt-5 pt-4 border-t border-border/60 text-xs text-muted">
                <button
                  onClick={() => setActiveTab('friends')}
                  className="flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition-colors"
                >
                  <Users className="w-4 h-4 text-primary" />
                  <span>{profileData?.friendCount || 0}</span>
                  <span className="text-muted font-normal">Friends</span>
                </button>

                <button
                  onClick={() => setActiveTab('moments')}
                  className="flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition-colors"
                >
                  <Compass className="w-4 h-4 text-primary" />
                  <span>{profileData?.postCount || 0}</span>
                  <span className="text-muted font-normal">Moments</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Joined {new Date(profileData?.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-6 px-6 border-t border-border bg-surface text-xs font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3.5 border-b-2 transition-all ${
                activeTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              Overview & About
            </button>
            <button
              onClick={() => setActiveTab('moments')}
              className={`py-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'moments'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              <span>My Moments</span>
              {profileData?.postCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
                  {profileData.postCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`py-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'friends'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              <span>Friends List</span>
              {profileData?.friendCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
                  {profileData.friendCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Overview & About Cards */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account Details Card */}
            <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Account Credentials</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted">Username:</span>
                  <span className="font-semibold text-foreground font-mono">@{user?.username}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted">Email Address:</span>
                  <span className="font-semibold text-foreground">{user?.email || 'Not configured'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted">Status:</span>
                  <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Active & Verified
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted">Encryption:</span>
                  <span className="font-semibold text-foreground">DTLS-SRTP / Argon2id</span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Privacy Card */}
            <div className="p-6 rounded-3xl bg-surface border border-border shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>Social Network Stats</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted">Connected Friends:</span>
                  <span className="font-bold text-foreground">{profileData?.friendCount || 0} mutual friends</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted">Published Moments:</span>
                  <span className="font-bold text-foreground">{profileData?.postCount || 0} posts</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted">Profile Visibility:</span>
                  <span className="font-semibold text-primary">Friends Only</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: My Moments Feed */}
        {activeTab === 'moments' && (
          <div className="space-y-4">
            {loadingPosts ? (
              <div className="p-12 text-center text-xs text-muted">Loading your moments...</div>
            ) : myPosts.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center bg-surface border border-border rounded-3xl">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Compass className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-foreground mb-1">No Moments Yet</h4>
                <p className="text-xs text-muted mb-4">Share your photos and updates with accepted friends.</p>
                <Link
                  href="/moments"
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-md shadow-primary/20"
                >
                  Create Moment
                </Link>
              </div>
            ) : (
              myPosts.map((post) => (
                <div key={post.id} className="p-6 rounded-3xl bg-surface border border-border shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        displayName={user?.displayName}
                        username={user?.username}
                        avatarMediaId={user?.avatarMediaId}
                        size="sm"
                      />
                      <div>
                        <h4 className="font-bold text-xs">{user?.displayName}</h4>
                        <p className="text-[10px] text-muted">
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {post.contentText}
                  </p>
                  <div className="pt-2 border-t border-border/50 flex items-center gap-4 text-xs text-muted font-medium">
                    <span>{post.reactionCount || 0} Reactions</span>
                    <span>•</span>
                    <span>{post.commentCount || 0} Comments</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Friends Grid */}
        {activeTab === 'friends' && (
          <div>
            {loadingFriends ? (
              <div className="p-12 text-center text-xs text-muted">Loading friends...</div>
            ) : myFriends.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center bg-surface border border-border rounded-3xl">
                <Users className="w-8 h-8 text-muted mb-2" />
                <p className="text-xs text-muted mb-4">You have not connected with any friends yet.</p>
                <Link
                  href="/friends"
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover"
                >
                  Find Friends
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myFriends.map((f) => (
                  <div
                    key={f.id || f.friendId}
                    className="p-3.5 rounded-2xl bg-surface border border-border shadow-sm flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        displayName={f.displayName}
                        username={f.username}
                        avatarMediaId={f.avatarMediaId}
                        size="md"
                      />
                      <div>
                        <h4 className="font-bold text-xs text-foreground">{f.displayName}</h4>
                        <p className="text-[10px] text-muted">@{f.username}</p>
                      </div>
                    </div>
                    <Link
                      href={`/profile/${f.username}`}
                      className="px-3 py-1.5 rounded-xl bg-surface-muted hover:bg-border text-xs font-semibold text-foreground transition-colors"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Profile Modal Dialog */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border shadow-2xl rounded-3xl max-w-lg w-full p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">Edit Profile</h3>
                <p className="text-xs text-muted">Update your display name and personal bio</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={80}
                  className="w-full px-4 py-3 rounded-2xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={300}
                  rows={4}
                  placeholder="Share something about yourself with your friends..."
                  className="w-full px-4 py-3 rounded-2xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground resize-none"
                />
                <span className="text-[10px] text-muted text-right block mt-1">{bio.length}/300 characters</span>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-border text-xs font-semibold hover:bg-surface-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !displayName.trim()}
                  className="px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-md shadow-primary/20 flex items-center gap-2 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successNote && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-xl flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-bottom duration-200">
          <Check className="w-4 h-4" />
          <span>Profile updated successfully</span>
        </div>
      )}
    </div>
  );
}
