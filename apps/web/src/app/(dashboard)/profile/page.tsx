'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, uploadMediaFile, getMediaUrl } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth.store';
import UserAvatar from '../../../components/ui/UserAvatar';
import ImageCropperModal from '../../../components/ui/ImageCropperModal';
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
  Eye,
  Crop,
  Trash2,
  MoreVertical,
  Maximize2,
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
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [coverMenuOpen, setCoverMenuOpen] = useState(false);

  // Cropper & Lightbox State
  const [cropperState, setCropperState] = useState<{
    isOpen: boolean;
    imageSrc: string;
    cropShape: 'circle' | 'rect';
    aspectRatio: number;
    title: string;
    type: 'avatar' | 'cover';
  }>({
    isOpen: false,
    imageSrc: '',
    cropShape: 'circle',
    aspectRatio: 1,
    title: '',
    type: 'avatar',
  });
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; title: string } | null>(null);

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

  // Reset cover error when coverMediaId changes
  useEffect(() => {
    setCoverError(false);
  }, [profileData?.coverMediaId, coverPreview, user?.coverMediaId]);

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

  // Avatar Selection -> direct upload with preview
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarMenuOpen(false);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setUploadingAvatar(true);
    try {
      const media = await uploadMediaFile(file, 'avatar');
      await apiFetch<any>('/profiles/me', {
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
      e.target.value = '';
    }
  };

  // Cover Selection -> direct upload with preview
  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverMenuOpen(false);
    const previewUrl = URL.createObjectURL(file);
    setCoverPreview(previewUrl);
    setCoverError(false);
    setUploadingCover(true);
    try {
      const media = await uploadMediaFile(file, 'cover');
      await apiFetch<any>('/profiles/me', {
        method: 'PATCH',
        body: { coverMediaId: media.id },
      });

      updateUser({ coverMediaId: media.id });
      setProfileData((prev: any) => ({
        ...prev,
        coverMediaId: media.id,
      }));
    } catch (err: any) {
      alert(`Cover upload failed: ${err.message || 'Error uploading cover'}`);
      setCoverPreview(null);
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  // Upload cropped file
  const handleCropComplete = async (croppedFile: File) => {
    if (cropperState.type === 'avatar') {
      const previewUrl = URL.createObjectURL(croppedFile);
      setAvatarPreview(previewUrl);
      setUploadingAvatar(true);
      try {
        const media = await uploadMediaFile(croppedFile, 'avatar');
        await apiFetch<any>('/profiles/me', {
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
    } else {
      const previewUrl = URL.createObjectURL(croppedFile);
      setCoverPreview(previewUrl);
      setCoverError(false);
      setUploadingCover(true);
      try {
        const media = await uploadMediaFile(croppedFile, 'cover');
        await apiFetch<any>('/profiles/me', {
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
    }
  };

  // Remove Avatar
  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) return;
    setUploadingAvatar(true);
    setAvatarMenuOpen(false);
    try {
      await apiFetch('/profiles/me/avatar', { method: 'DELETE' });
      updateUser({ avatarMediaId: undefined });
      setProfileData((prev: any) => ({
        ...prev,
        avatarMediaId: null,
      }));
      setAvatarPreview(null);
    } catch (err: any) {
      alert(`Failed to remove avatar: ${err.message || 'Error'}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Remove Cover
  const handleRemoveCover = async () => {
    if (!confirm('Are you sure you want to remove your cover photo?')) return;
    setUploadingCover(true);
    setCoverMenuOpen(false);
    try {
      await apiFetch('/profiles/me/cover', { method: 'DELETE' });
      updateUser({ coverMediaId: undefined });
      setProfileData((prev: any) => ({
        ...prev,
        coverMediaId: null,
      }));
      setCoverPreview(null);
      setCoverError(false);
    } catch (err: any) {
      alert(`Failed to remove cover photo: ${err.message || 'Error'}`);
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

  const rawCoverMediaId = profileData?.coverMediaId || user?.coverMediaId;
  const coverUrl = rawCoverMediaId ? getMediaUrl(rawCoverMediaId) : null;
  const activeCover = coverPreview || (coverUrl && !coverError ? coverUrl : null);

  const rawAvatarMediaId = profileData?.avatarMediaId || user?.avatarMediaId;
  const avatarUrl = rawAvatarMediaId ? getMediaUrl(rawAvatarMediaId) : null;

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
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightboxMedia({ url: activeCover, title: 'Cover Photo' })}
                onError={() => setCoverError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center opacity-30">
                <span className="font-extrabold text-4xl sm:text-7xl tracking-widest text-white">চিঠি CHITHI</span>
              </div>
            )}

            {/* Hidden File Input for Cover */}
            <input
              type="file"
              ref={coverInputRef}
              onChange={handleCoverFileChange}
              accept="image/jpeg,image/png,image/webp"
              data-testid="cover-file-input"
              className="hidden"
            />

            {/* Cover Management Controls */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCoverMenuOpen((o) => !o)}
                disabled={uploadingCover}
                className="px-3.5 py-2 rounded-2xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md text-xs font-semibold flex items-center gap-2 transition-all shadow-lg active:scale-95 border border-white/10"
              >
                {uploadingCover ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <span>Change Cover Photo</span>
              </button>

              {/* Cover Dropdown Menu */}
              {coverMenuOpen && (
                <div className="absolute right-0 bottom-12 w-52 bg-surface/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl p-1.5 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      coverInputRef.current?.click();
                      setCoverMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium rounded-xl hover:bg-surface-muted flex items-center gap-2.5 text-foreground transition-colors"
                  >
                    <Camera className="w-4 h-4 text-primary" />
                    <span>Upload New Cover</span>
                  </button>

                  {activeCover && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setCropperState({
                            isOpen: true,
                            imageSrc: activeCover,
                            cropShape: 'rect',
                            aspectRatio: 2.8,
                            title: 'Reposition Cover Banner',
                            type: 'cover',
                          });
                          setCoverMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-medium rounded-xl hover:bg-surface-muted flex items-center gap-2.5 text-foreground transition-colors"
                      >
                        <Crop className="w-4 h-4 text-blue-500" />
                        <span>Reposition / Crop</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLightboxMedia({ url: activeCover, title: 'Cover Photo' });
                          setCoverMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-medium rounded-xl hover:bg-surface-muted flex items-center gap-2.5 text-foreground transition-colors"
                      >
                        <Eye className="w-4 h-4 text-emerald-500" />
                        <span>View Cover Photo</span>
                      </button>

                      <div className="my-1 border-t border-border/60" />

                      <button
                        type="button"
                        onClick={handleRemoveCover}
                        className="w-full px-3 py-2 text-left text-xs font-medium rounded-xl hover:bg-destructive/10 text-destructive flex items-center gap-2.5 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Remove Cover</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Profile Identity Info Bar */}
          <div className="px-6 pb-6 relative">
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 sm:-mt-20 mb-4 gap-4">
              {/* Avatar with Management Overlay */}
              <div className="relative group">
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  data-testid="avatar-file-input"
                  className="hidden"
                />
                <div
                  className="rounded-full p-1 bg-surface shadow-2xl cursor-pointer"
                  onClick={() => {
                    if (avatarUrl) setLightboxMedia({ url: avatarUrl, title: 'Profile Picture' });
                  }}
                  title={avatarUrl ? 'Click to view photo' : undefined}
                >
                  <UserAvatar
                    displayName={profileData?.displayName || user?.displayName}
                    username={user?.username}
                    avatarMediaId={rawAvatarMediaId}
                    previewUrl={avatarPreview}
                    size="2xl"
                    isOnline={true}
                  />
                </div>

                {/* Avatar Action Button */}
                <button
                  type="button"
                  onClick={() => setAvatarMenuOpen((o) => !o)}
                  disabled={uploadingAvatar}
                  title="Change profile photo"
                  className="absolute bottom-1 right-1 p-2.5 rounded-full bg-primary hover:bg-primary-hover text-white shadow-lg border-2 border-surface transition-transform hover:scale-110 active:scale-95"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>

                {/* Avatar Dropdown Menu */}
                {avatarMenuOpen && (
                  <div className="absolute left-0 sm:left-full top-full sm:top-0 sm:ml-3 mt-2 sm:mt-0 w-52 bg-surface/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl p-1.5 z-30 animate-in fade-in duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        avatarInputRef.current?.click();
                        setAvatarMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium rounded-xl hover:bg-surface-muted flex items-center gap-2.5 text-foreground transition-colors"
                    >
                      <Camera className="w-4 h-4 text-primary" />
                      <span>Upload New Avatar</span>
                    </button>

                    {(avatarPreview || avatarUrl) && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setCropperState({
                              isOpen: true,
                              imageSrc: avatarPreview || avatarUrl!,
                              cropShape: 'circle',
                              aspectRatio: 1,
                              title: 'Crop & Reposition Avatar',
                              type: 'avatar',
                            });
                            setAvatarMenuOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-medium rounded-xl hover:bg-surface-muted flex items-center gap-2.5 text-foreground transition-colors"
                        >
                          <Crop className="w-4 h-4 text-blue-500" />
                          <span>Crop / Reposition</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setLightboxMedia({
                              url: avatarPreview || avatarUrl!,
                              title: `${profileData?.displayName || user?.displayName}'s Profile Picture`,
                            });
                            setAvatarMenuOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-medium rounded-xl hover:bg-surface-muted flex items-center gap-2.5 text-foreground transition-colors"
                        >
                          <Eye className="w-4 h-4 text-emerald-500" />
                          <span>View Profile Picture</span>
                        </button>

                        <div className="my-1 border-t border-border/60" />

                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="w-full px-3 py-2 text-left text-xs font-medium rounded-xl hover:bg-destructive/10 text-destructive flex items-center gap-2.5 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Remove Picture</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
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

            {/* Success Notification */}
            {successNote && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>Profile updated successfully</span>
              </div>
            )}

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
                <p className="text-sm text-foreground/90 mt-3 max-w-xl leading-relaxed whitespace-pre-wrap">
                  {profileData.bio}
                </p>
              ) : (
                <p className="text-xs text-muted italic mt-2">
                  No bio added yet. Click &quot;Edit Profile&quot; to tell friends about yourself.
                </p>
              )}
            </div>

            {/* Social Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-border">
              <button
                onClick={() => setActiveTab('friends')}
                className="p-3 rounded-2xl bg-surface-muted/50 hover:bg-surface-muted text-center transition-colors group border border-border/40"
              >
                <div className="text-xl font-black text-foreground group-hover:text-primary transition-colors">
                  {profileData?.friendCount ?? myFriends.length}
                </div>
                <div className="text-xs text-muted font-medium flex items-center justify-center gap-1 mt-0.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Friends</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('moments')}
                className="p-3 rounded-2xl bg-surface-muted/50 hover:bg-surface-muted text-center transition-colors group border border-border/40"
              >
                <div className="text-xl font-black text-foreground group-hover:text-primary transition-colors">
                  {profileData?.postCount ?? myPosts.length}
                </div>
                <div className="text-xs text-muted font-medium flex items-center justify-center gap-1 mt-0.5">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Moments</span>
                </div>
              </button>

              <div className="p-3 rounded-2xl bg-surface-muted/50 text-center col-span-2 sm:col-span-1 border border-border/40">
                <div className="text-xs font-bold text-foreground truncate">
                  {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' }) : 'Active'}
                </div>
                <div className="text-xs text-muted font-medium flex items-center justify-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Joined</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Navigation Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-border pb-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted hover:text-foreground hover:bg-surface-muted'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Overview & About</span>
          </button>

          <button
            onClick={() => setActiveTab('moments')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'moments'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted hover:text-foreground hover:bg-surface-muted'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>My Moments</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {profileData?.postCount ?? myPosts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'friends'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted hover:text-foreground hover:bg-surface-muted'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Friends List</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {profileData?.friendCount ?? myFriends.length}
            </span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-150">
            {/* About Card */}
            <div className="md:col-span-2 bg-surface border border-border rounded-3xl p-6 shadow-sm">
              <h3 className="font-bold text-sm mb-4 text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>About Me</span>
              </h3>
              <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap">
                {profileData?.bio || 'You haven\'t added a biography yet. Share a few lines about your interests, passions, or greeting to friends.'}
              </p>

              <div className="mt-6 pt-6 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted">Primary Email</p>
                    <p className="text-xs font-semibold text-foreground truncate">{user?.email || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted">Account Privacy</p>
                    <p className="text-xs font-semibold text-foreground">Friends-Only Shield Active</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm mb-2 text-foreground">Profile Shortcuts</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Fast access to manage your social presence, security settings, and conversation hub.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-full p-2.5 rounded-2xl bg-surface-muted hover:bg-surface border border-border text-xs font-semibold text-foreground text-left flex items-center justify-between transition-colors shadow-xs"
                >
                  <span className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-primary" />
                    <span>Edit Profile Details</span>
                  </span>
                  <span className="text-muted">→</span>
                </button>

                <Link
                  href="/chats"
                  className="w-full p-2.5 rounded-2xl bg-surface-muted hover:bg-surface border border-border text-xs font-semibold text-foreground text-left flex items-center justify-between transition-colors shadow-xs"
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    <span>Go to Direct Chats</span>
                  </span>
                  <span className="text-muted">→</span>
                </Link>

                <Link
                  href="/settings"
                  className="w-full p-2.5 rounded-2xl bg-surface-muted hover:bg-surface border border-border text-xs font-semibold text-foreground text-left flex items-center justify-between transition-colors shadow-xs"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-amber-500" />
                    <span>Privacy & Settings</span>
                  </span>
                  <span className="text-muted">→</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY MOMENTS */}
        {activeTab === 'moments' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {loadingPosts ? (
              <div className="p-12 text-center text-sm text-muted">Loading your moments...</div>
            ) : myPosts.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center bg-surface border border-border rounded-3xl gap-3">
                <Compass className="w-8 h-8 text-muted" />
                <h4 className="font-bold text-sm text-foreground">You haven&apos;t posted any moments yet</h4>
                <p className="text-xs text-muted max-w-sm">
                  Share life updates, photos, or short video clips exclusively with your accepted friends.
                </p>
                <Link
                  href="/moments"
                  className="mt-2 px-4 py-2 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary-hover transition-all"
                >
                  Create First Moment
                </Link>
              </div>
            ) : (
              myPosts.map((post) => (
                <div key={post.id} className="bg-surface border border-border rounded-3xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Friends Only</span>
                    </div>
                  </div>

                  {post.contentText && (
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">{post.contentText}</p>
                  )}

                  {post.media?.length > 0 && (
                    <div className="rounded-2xl overflow-hidden bg-black/10">
                      {post.media.map((pm: any) => {
                        const mId = pm.mediaAssetId || pm.mediaAsset?.id;
                        const isVid = pm.mediaAsset?.mimeType?.startsWith('video/') || post.postType === 'video';
                        const url = getMediaUrl(mId);

                        if (isVid) {
                          return (
                            <video
                              key={mId}
                              src={url}
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full max-h-72 object-contain rounded-2xl bg-black"
                            />
                          );
                        }

                        return (
                          <img
                            key={mId}
                            src={url}
                            alt="Moment"
                            crossOrigin="anonymous"
                            className="w-full max-h-72 object-cover rounded-2xl cursor-pointer"
                            onClick={() => setLightboxMedia({ url, title: 'Moment Photo' })}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: FRIENDS */}
        {activeTab === 'friends' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {loadingFriends ? (
              <div className="p-12 text-center text-sm text-muted">Loading friends list...</div>
            ) : myFriends.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center bg-surface border border-border rounded-3xl gap-3">
                <Users className="w-8 h-8 text-muted" />
                <h4 className="font-bold text-sm text-foreground">No mutual friends yet</h4>
                <p className="text-xs text-muted max-w-sm">
                  Search friends by their exact username to send a connection request.
                </p>
                <Link
                  href="/friends"
                  className="mt-2 px-4 py-2 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary-hover transition-all"
                >
                  Find Friends
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myFriends.map((f) => (
                  <div
                    key={f.friendId}
                    className="p-4 rounded-3xl bg-surface border border-border flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        displayName={f.displayName}
                        username={f.username}
                        avatarMediaId={f.avatarMediaId}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate text-foreground">{f.displayName}</p>
                        <p className="text-[11px] text-muted truncate">@{f.username}</p>
                      </div>
                    </div>

                    <Link
                      href="/chats"
                      className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors flex-shrink-0"
                      title="Send message"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit Profile Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-surface border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-foreground">Edit Profile</h3>
                  <p className="text-xs text-muted mt-0.5">Update your display name and personal bio</p>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 rounded-full text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={80}
                    className="w-full px-4 py-2.5 rounded-2xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                    placeholder="Enter display name"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-foreground">Bio / About</label>
                    <span className="text-[10px] text-muted">{bio.length}/300</span>
                  </div>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={300}
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-2xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground resize-none"
                    placeholder="Write a brief introduction..."
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-2xl bg-surface-muted hover:bg-border text-xs font-semibold text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !displayName.trim()}
                    className="px-5 py-2 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-md shadow-primary/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Interactive Image Cropper / Repositioner Modal */}
        {cropperState.isOpen && (
          <ImageCropperModal
            isOpen={cropperState.isOpen}
            imageSrc={cropperState.imageSrc}
            cropShape={cropperState.cropShape}
            aspectRatio={cropperState.aspectRatio}
            title={cropperState.title}
            onClose={() => setCropperState((prev) => ({ ...prev, isOpen: false }))}
            onCropComplete={handleCropComplete}
          />
        )}

        {/* High-Resolution Lightbox Viewer Modal */}
        {lightboxMedia && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setLightboxMedia(null)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightboxMedia(null)}
                title="Close viewer"
                className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={lightboxMedia.url}
                alt={lightboxMedia.title}
                crossOrigin="anonymous"
                className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
              />
              <p className="text-white/80 text-xs font-medium mt-3">{lightboxMedia.title}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
