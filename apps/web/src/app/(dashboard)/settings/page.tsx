'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { apiFetch, uploadMediaFile } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth.store';
import UserAvatar from '../../../components/ui/UserAvatar';
import MessengerToggle from '../../../components/ui/MessengerToggle';
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  Shield,
  Eye,
  Bell,
  LogOut,
  Check,
  Loader2,
  User,
  Lock,
  MessageSquare,
  Phone,
  Video,
  Ban,
  Smartphone,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
  Camera,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
  KeyRound,
  Mail,
  Calendar,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

type SettingCategory =
  | 'appearance'
  | 'privacy'
  | 'notifications'
  | 'profile'
  | 'account'
  | 'chat'
  | 'blocked'
  | 'sessions';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { logout, user, updateUser } = useAuthStore();

  const [activeCategory, setActiveCategory] = useState<SettingCategory>('appearance');
  const [mobileViewingCategory, setMobileViewingCategory] = useState<boolean>(false);

  // Settings State
  const [settings, setSettings] = useState<{
    showOnlineStatus: boolean;
    showLastSeen: boolean;
    allowFriendRequests: boolean;
    pushNotifications: boolean;
    messageNotifications: boolean;
    themePreference: string;
  }>({
    showOnlineStatus: true,
    showLastSeen: true,
    allowFriendRequests: true,
    pushNotifications: true,
    messageNotifications: true,
    themePreference: 'system',
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedSuccessNote, setSavedSuccessNote] = useState<string | null>(null);

  // Profile Edit State
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessNote, setProfileSuccessNote] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Blocked Users State
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  // Load Settings on Mount
  useEffect(() => {
    setLoadingSettings(true);
    apiFetch<any>('/users/settings')
      .then((data) => {
        if (data) {
          setSettings({
            showOnlineStatus: data.showOnlineStatus ?? true,
            showLastSeen: data.showLastSeen ?? true,
            allowFriendRequests: data.allowFriendRequests ?? true,
            pushNotifications: data.pushNotifications ?? true,
            messageNotifications: data.messageNotifications ?? true,
            themePreference: data.themePreference || 'system',
          });
          if (data.themePreference) {
            setTheme(data.themePreference);
          }
        }
      })
      .catch((err) => console.error('Failed to load settings:', err))
      .finally(() => setLoadingSettings(false));
  }, [setTheme]);

  // Sync profile edit inputs when user store changes
  useEffect(() => {
    if (user) {
      setDisplayNameInput(user.displayName || '');
      setBioInput(user.bio || '');
    }
  }, [user]);

  // Load blocked users when blocked tab is opened
  const loadBlockedUsers = useCallback(async () => {
    setLoadingBlocks(true);
    try {
      const data = await apiFetch<any[]>('/users/blocks/list');
      setBlockedUsers(data || []);
    } catch (err) {
      console.error('Failed to load blocked users:', err);
    } finally {
      setLoadingBlocks(false);
    }
  }, []);

  useEffect(() => {
    if (activeCategory === 'blocked') {
      loadBlockedUsers();
    }
  }, [activeCategory, loadBlockedUsers]);

  const updateSetting = async (key: string, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setSavingKey(key);

    if (key === 'themePreference') {
      setTheme(value);
    }

    try {
      await apiFetch('/users/settings', {
        method: 'PATCH',
        body: { [key]: value },
      });
      setSavedSuccessNote('Changes saved automatically');
      setTimeout(() => setSavedSuccessNote(null), 2500);
    } catch (err) {
      console.error('Failed to update setting:', err);
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const updated = await apiFetch<any>('/profiles/me', {
        method: 'PATCH',
        body: {
          displayName: displayNameInput.trim() || undefined,
          bio: bioInput.trim() || undefined,
        },
      });
      updateUser({
        displayName: updated.displayName,
        bio: updated.bio,
      });
      setProfileSuccessNote(true);
      setTimeout(() => setProfileSuccessNote(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const media = await uploadMediaFile(file, 'avatar');
      const updated = await apiFetch<any>('/profiles/me', {
        method: 'PATCH',
        body: { avatarMediaId: media.id },
      });
      updateUser({
        avatarMediaId: updated.avatarMediaId,
      });
      setSavedSuccessNote('Profile photo updated successfully');
      setTimeout(() => setSavedSuccessNote(null), 2500);
    } catch (err) {
      console.error('Failed to upload avatar:', err);
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingCover(true);
    try {
      const media = await uploadMediaFile(file, 'cover');
      const updated = await apiFetch<any>('/profiles/me', {
        method: 'PATCH',
        body: { coverMediaId: media.id },
      });
      updateUser({
        coverMediaId: updated.coverMediaId,
      });
      setSavedSuccessNote('Cover photo updated successfully');
      setTimeout(() => setSavedSuccessNote(null), 2500);
    } catch (err) {
      console.error('Failed to upload cover:', err);
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleUnblockUser = async (targetUserId: string) => {
    setUnblockingId(targetUserId);
    try {
      await apiFetch(`/users/${targetUserId}/block`, { method: 'DELETE' });
      setBlockedUsers((prev) => prev.filter((b) => b.blockedUserId !== targetUserId && b.id !== targetUserId));
      setSavedSuccessNote('User unblocked successfully');
      setTimeout(() => setSavedSuccessNote(null), 2500);
    } catch (err) {
      console.error('Failed to unblock user:', err);
    } finally {
      setUnblockingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      router.push('/login');
    }
  };

  const categories: {
    id: SettingCategory;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
  }[] = [
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Theme, colors, and visual styles',
      icon: Sun,
    },
    {
      id: 'privacy',
      title: 'Privacy & Visibility',
      description: 'Active status, last seen, friend requests',
      icon: Shield,
    },
    {
      id: 'notifications',
      title: 'Notifications & Sounds',
      description: 'Push alerts and message chimes',
      icon: Bell,
    },
    {
      id: 'profile',
      title: 'Profile Information',
      description: 'Display name, bio, photos',
      icon: User,
    },
    {
      id: 'account',
      title: 'Account & Security',
      description: 'Credentials, username, identity',
      icon: Lock,
    },
    {
      id: 'chat',
      title: 'Chat & Calling',
      description: 'Receipts, call permissions, devices',
      icon: MessageSquare,
    },
    {
      id: 'blocked',
      title: 'Blocked Accounts',
      description: 'Manage users you have blocked',
      icon: Ban,
      badge: blockedUsers.length > 0 ? blockedUsers.length : undefined,
    },
    {
      id: 'sessions',
      title: 'Sessions & Sign Out',
      description: 'Active devices and account exit',
      icon: Smartphone,
    },
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-background">
      {/* Hidden file upload inputs for profile avatar & cover */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarFileChange}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleCoverFileChange}
      />

      {/* ============================================================== */}
      {/* LEFT COLUMN: Messenger-inspired Category List */}
      {/* ============================================================== */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-border bg-surface flex flex-col flex-shrink-0 transition-all ${
          mobileViewingCategory ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Top Header */}
        <div className="p-4 md:p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <span>Settings</span>
            </h1>
          </div>

          {/* User Mini Profile Card */}
          {user && (
            <Link
              href="/profile"
              className="flex items-center gap-3.5 p-3 rounded-2xl bg-surface-muted/60 hover:bg-surface-muted border border-border/50 transition-all group shadow-sm"
              title="Go to My Profile"
            >
              <UserAvatar
                displayName={user.displayName}
                username={user.username}
                avatarMediaId={user.avatarMediaId}
                size="md"
                isOnline={settings.showOnlineStatus}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {user.displayName || user.username}
                  </p>
                  <ExternalLink className="w-3.5 h-3.5 text-muted group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
                <p className="text-xs text-muted truncate">@{user.username}</p>
              </div>
            </Link>
          )}
        </div>

        {/* Categories Navigation */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setMobileViewingCategory(true);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left ${
                  isSelected
                    ? 'bg-primary/10 text-primary font-semibold shadow-xs'
                    : 'text-foreground/80 hover:bg-surface-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                        : 'bg-surface-muted text-muted'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm truncate ${isSelected ? 'font-bold' : 'font-medium'}`}>
                      {cat.title}
                    </p>
                    <p className="text-[11px] text-muted truncate">{cat.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {cat.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                      {cat.badge}
                    </span>
                  )}
                  <ChevronRight
                    className={`w-4 h-4 md:hidden transition-transform ${
                      isSelected ? 'text-primary' : 'text-muted'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer / App Version Info */}
        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted">
          <span>CHITHI v3.5 (Messenger Edition)</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT COLUMN: Active Category Content */}
      {/* ============================================================== */}
      <div
        className={`flex-1 flex flex-col h-full overflow-hidden bg-background ${
          !mobileViewingCategory ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Mobile Top Bar */}
        <div className="md:hidden h-14 border-b border-border bg-surface px-4 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setMobileViewingCategory(false)}
            className="flex items-center gap-2 text-primary font-semibold text-sm hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Settings</span>
          </button>
          <span className="text-sm font-bold text-foreground">
            {categories.find((c) => c.id === activeCategory)?.title}
          </span>
          <div className="w-5" />
        </div>

        {/* Global Save Feedback Floating Toast */}
        {savedSuccessNote && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{savedSuccessNote}</span>
          </div>
        )}

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-3xl w-full mx-auto space-y-6 custom-scrollbar">
          {/* ============================================================== */}
          {/* TAB 1: APPEARANCE */}
          {/* ============================================================== */}
          {activeCategory === 'appearance' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Appearance</h2>
                <p className="text-xs text-muted mt-1">
                  Customize the look and feel of CHITHI to match your style or ambient lighting.
                </p>
              </div>

              {/* Theme Selector Cards */}
              <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">Theme Mode</h3>
                    <p className="text-xs text-muted">Choose your preferred light or dark interface</p>
                  </div>
                  {savingKey === 'themePreference' && (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {/* Light Theme */}
                  <button
                    type="button"
                    onClick={() => updateSetting('themePreference', 'light')}
                    className={`relative p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all text-left ${
                      theme === 'light'
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border/70 bg-surface-muted/50 hover:bg-surface-muted text-muted hover:text-foreground'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Sun className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm">Light Mode</p>
                      <p className="text-[11px] text-muted">Clean bright interface</p>
                    </div>
                    {theme === 'light' && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>

                  {/* Dark Theme */}
                  <button
                    type="button"
                    onClick={() => updateSetting('themePreference', 'dark')}
                    className={`relative p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all text-left ${
                      theme === 'dark'
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border/70 bg-surface-muted/50 hover:bg-surface-muted text-muted hover:text-foreground'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                      <Moon className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm">Dark Mode</p>
                      <p className="text-[11px] text-muted">Easy on the eyes at night</p>
                    </div>
                    {theme === 'dark' && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>

                  {/* System Theme */}
                  <button
                    type="button"
                    onClick={() => updateSetting('themePreference', 'system')}
                    className={`relative p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all text-left ${
                      theme === 'system'
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border/70 bg-surface-muted/50 hover:bg-surface-muted text-muted hover:text-foreground'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                      <Laptop className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm">System Default</p>
                      <p className="text-[11px] text-muted">Syncs with OS settings</p>
                    </div>
                    {theme === 'system' && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Brand Accent Preview */}
              <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm">
                <h3 className="font-semibold text-sm mb-1">Color Palette & Brand</h3>
                <p className="text-xs text-muted mb-4">
                  CHITHI uses a modern Messenger-inspired royal blue accent with sleek rounded geometry.
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shadow-sm shadow-primary/30">
                    চি
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-foreground">Royal Messenger Blue</p>
                    <p className="text-muted">Primary interactive accent</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: PRIVACY & VISIBILITY */}
          {/* ============================================================== */}
          {activeCategory === 'privacy' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Privacy & Visibility</h2>
                <p className="text-xs text-muted mt-1">
                  Control how friends interact with you and manage your visibility status across CHITHI.
                </p>
              </div>

              <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm divide-y divide-border/60 space-y-4">
                {/* Active Status Toggle */}
                <div className="flex items-center justify-between pt-2 first:pt-0">
                  <div className="pr-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">Show Active Status</p>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">
                      Let accepted mutual friends know when you are currently online. When disabled, your active indicator is hidden.
                    </p>
                  </div>
                  <MessengerToggle
                    id="showOnlineStatus"
                    label="Show Active Status"
                    checked={settings.showOnlineStatus}
                    onChange={(val) => updateSetting('showOnlineStatus', val)}
                  />
                </div>

                {/* Last Seen Toggle */}
                <div className="flex items-center justify-between pt-4">
                  <div className="pr-4">
                    <p className="text-sm font-bold text-foreground">Show Last Seen</p>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">
                      Show friends the relative timestamp of your most recent activity when you are not currently active.
                    </p>
                  </div>
                  <MessengerToggle
                    id="showLastSeen"
                    label="Show Last Seen"
                    checked={settings.showLastSeen}
                    onChange={(val) => updateSetting('showLastSeen', val)}
                  />
                </div>

                {/* Allow Friend Requests Toggle */}
                <div className="flex items-center justify-between pt-4">
                  <div className="pr-4">
                    <p className="text-sm font-bold text-foreground">Allow Friend Requests</p>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">
                      Allow users who search your exact username to send you mutual friendship requests.
                    </p>
                  </div>
                  <MessengerToggle
                    id="allowFriendRequests"
                    label="Allow Friend Requests"
                    checked={settings.allowFriendRequests}
                    onChange={(val) => updateSetting('allowFriendRequests', val)}
                  />
                </div>
              </div>

              {/* Privacy Notice Box */}
              <div className="bg-primary/5 border border-primary/15 rounded-3xl p-5 flex items-start gap-3.5">
                <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-foreground">Zero Public Leaks Policy</p>
                  <p className="text-muted leading-relaxed">
                    CHITHI guarantees that your moments, online status, and direct messages are strictly limited to your confirmed mutual friends. Non-friends cannot view your feed or call you.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: NOTIFICATIONS & SOUNDS */}
          {/* ============================================================== */}
          {activeCategory === 'notifications' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Notifications & Sounds</h2>
                <p className="text-xs text-muted mt-1">
                  Configure alert triggers for incoming messages, call rings, and friend requests.
                </p>
              </div>

              <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm divide-y divide-border/60 space-y-4">
                {/* Push Notifications Toggle */}
                <div className="flex items-center justify-between pt-2 first:pt-0">
                  <div className="pr-4">
                    <p className="text-sm font-bold text-foreground">Push Notifications</p>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">
                      Receive browser alerts and system notifications when CHITHI is running in the background.
                    </p>
                  </div>
                  <MessengerToggle
                    id="pushNotifications"
                    label="Push Notifications"
                    checked={settings.pushNotifications}
                    onChange={(val) => updateSetting('pushNotifications', val)}
                  />
                </div>

                {/* Message Notifications Toggle */}
                <div className="flex items-center justify-between pt-4">
                  <div className="pr-4">
                    <p className="text-sm font-bold text-foreground">Message Chimes & Alerts</p>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">
                      Play audio chimes when a new direct message or call rings in an active conversation.
                    </p>
                  </div>
                  <MessengerToggle
                    id="messageNotifications"
                    label="Message Chimes"
                    checked={settings.messageNotifications}
                    onChange={(val) => updateSetting('messageNotifications', val)}
                  />
                </div>
              </div>

              {/* Call Ringtones Card */}
              <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">WebRTC Calling Sounds</h3>
                    <p className="text-xs text-muted">Dynamic synthesized tone generation</p>
                  </div>
                </div>
                <p className="text-xs text-muted leading-relaxed mt-2">
                  CHITHI uses browser-native Web Audio API synthesized frequencies (440Hz / 480Hz US-standard PBX cadence) for incoming and outgoing call ringing, eliminating external media asset latency.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: PROFILE INFORMATION */}
          {/* ============================================================== */}
          {activeCategory === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">Profile Information</h2>
                  <p className="text-xs text-muted mt-1">
                    Manage how your name, avatar, cover photo, and bio appear to friends.
                  </p>
                </div>
                <Link
                  href="/profile"
                  className="px-4 py-2 rounded-2xl bg-surface-muted hover:bg-surface border border-border text-xs font-semibold flex items-center gap-1.5 transition-all text-foreground"
                >
                  <span>Full Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Photo Upload Shortcuts */}
              <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm space-y-5">
                <h3 className="font-semibold text-sm">Photos & Media</h3>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Avatar Upload */}
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative group">
                      <UserAvatar
                        displayName={user?.displayName}
                        username={user?.username}
                        avatarMediaId={user?.avatarMediaId}
                        size="xl"
                      />
                      {uploadingAvatar && (
                        <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-bold text-foreground">Profile Avatar</p>
                      <p className="text-xs text-muted mb-2">JPG, PNG or WebP</p>
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-all flex items-center gap-1.5 shadow-xs"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Change Avatar</span>
                      </button>
                    </div>
                  </div>

                  <div className="hidden sm:block w-px h-16 bg-border" />

                  {/* Cover Upload */}
                  <div className="w-full sm:flex-1">
                    <p className="text-sm font-bold text-foreground">Cover Banner</p>
                    <p className="text-xs text-muted mb-2">Display banner on your profile header</p>
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="px-3.5 py-1.5 rounded-xl bg-surface-muted hover:bg-surface border border-border text-foreground text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs"
                    >
                      {uploadingCover ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5" />
                      )}
                      <span>Change Cover Photo</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Profile Details Form */}
              <form onSubmit={handleSaveProfile} className="bg-surface border border-border rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Personal Details</h3>
                  {profileSuccessNote && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Saved
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Display Name */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      maxLength={80}
                      placeholder="Your full name"
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    />
                    <p className="text-[11px] text-muted mt-1">This is the primary name visible to your friends</p>
                  </div>

                  {/* Bio */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-foreground">About / Bio</label>
                      <span className="text-[11px] text-muted">{bioInput.length}/300</span>
                    </div>
                    <textarea
                      value={bioInput}
                      onChange={(e) => setBioInput(e.target.value)}
                      maxLength={300}
                      rows={3}
                      placeholder="Share a short bio with your friends..."
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary-hover disabled:opacity-50 transition-all flex items-center gap-2 shadow-md shadow-primary/20"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Profile</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: ACCOUNT & SECURITY */}
          {/* ============================================================== */}
          {activeCategory === 'account' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Account & Security</h2>
                <p className="text-xs text-muted mt-1">
                  View credentials, registration details, and security configuration for your CHITHI identity.
                </p>
              </div>

              <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-semibold text-sm mb-2">Account Credentials</h3>

                <div className="space-y-3">
                  {/* Username Card */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-muted/50 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        @
                      </div>
                      <div>
                        <p className="text-xs text-muted">Username</p>
                        <p className="text-sm font-bold text-foreground">@{user?.username}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-primary px-2.5 py-1 rounded-lg bg-primary/10">
                      Unique Handle
                    </span>
                  </div>

                  {/* Email Card */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-muted/50 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted">Registered Email</p>
                        <p className="text-sm font-bold text-foreground">{user?.email}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Verified
                    </span>
                  </div>

                  {/* User ID */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-muted/50 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted">Account UUID</p>
                        <p className="text-xs font-mono text-foreground truncate max-w-[200px] sm:max-w-xs">
                          {user?.id}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Shield Card */}
              <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Password Security & Token Rotation</h3>
                    <p className="text-xs text-muted">Active encryption safeguards</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-surface-muted/40 border border-border/50">
                    <p className="text-xs font-bold text-foreground mb-0.5">Argon2id / Bcrypt</p>
                    <p className="text-[11px] text-muted">Industry-grade salted cryptographic password hashing</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-surface-muted/40 border border-border/50">
                    <p className="text-xs font-bold text-foreground mb-0.5">JWT Token Rotation</p>
                    <p className="text-[11px] text-muted">Single-use refresh token rotation with family revocation</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 6: CHAT & CALLING PREFERENCES */}
          {/* ============================================================== */}
          {activeCategory === 'chat' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Chat & Calling</h2>
                <p className="text-xs text-muted mt-1">
                  Real-time messaging, delivery receipts, and WebRTC hardware communication settings.
                </p>
              </div>

              {/* Messaging Features Overview */}
              <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-semibold text-sm">Real-time Messaging Protocol</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-surface-muted/50 border border-border/50 flex flex-col justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <p className="text-sm font-bold text-foreground">Double-Check Receipts</p>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Single check indicates sent; double check indicates delivered; blue double-check indicates message has been read.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-muted/50 border border-border/50 flex flex-col justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <p className="text-sm font-bold text-foreground">Typing Broadcast</p>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Instant 2-second debounce typing indicators inform friends when you are actively drafting a response.
                    </p>
                  </div>
                </div>
              </div>

              {/* WebRTC Calling Config */}
              <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">WebRTC Calling Relay</h3>
                      <p className="text-xs text-muted">One-to-one voice and video connectivity</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10">
                    Active
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-surface-muted/40 border border-border/50 space-y-2 text-xs">
                  <p className="font-bold text-foreground">Secure ICE Infrastructure</p>
                  <p className="text-muted leading-relaxed">
                    Voice and video streams use encrypted peer-to-peer transmission (DTLS-SRTP) through Google STUN discovery and ephemeral HMAC-SHA1 authenticated Coturn TURN relays. Socket.IO is reserved exclusively for lightweight signaling.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 7: BLOCKED ACCOUNTS */}
          {/* ============================================================== */}
          {activeCategory === 'blocked' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Blocked Accounts</h2>
                <p className="text-xs text-muted mt-1">
                  Blocked users cannot send you messages, place calls, or view your online status and moments.
                </p>
              </div>

              <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm">
                {loadingBlocks ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-xs">Loading blocked accounts...</span>
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center text-muted">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">No Blocked Accounts</p>
                      <p className="text-xs text-muted mt-0.5 max-w-sm">
                        You have not blocked anyone. When you block a user, they will appear here and you can unblock them anytime.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {blockedUsers.map((item) => {
                      const target = item.blockedUser || item.targetUser || item;
                      const targetId = target.id || item.blockedUserId;

                      return (
                        <div
                          key={item.id || targetId}
                          className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <UserAvatar
                              displayName={target.displayName}
                              username={target.username}
                              avatarMediaId={target.avatarMediaId}
                              size="md"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground truncate">
                                {target.displayName || target.username || 'Blocked User'}
                              </p>
                              <p className="text-xs text-muted truncate">@{target.username}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleUnblockUser(targetId)}
                            disabled={unblockingId === targetId}
                            className="px-4 py-2 rounded-xl bg-surface-muted hover:bg-surface border border-border text-foreground hover:text-primary text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs"
                          >
                            {unblockingId === targetId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <span>Unblock</span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 8: SESSIONS & SIGN OUT */}
          {/* ============================================================== */}
          {activeCategory === 'sessions' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Sessions & Sign Out</h2>
                <p className="text-xs text-muted mt-1">
                  Manage active browser sessions and safely sign out of your account on this device.
                </p>
              </div>

              {/* Current Device Session Card */}
              <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-semibold text-sm">Current Active Session</h3>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-muted/50 border border-border/50">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">This Web Browser</p>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <p className="text-xs text-muted mt-0.5">Active now • Local Storage Auth</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10">
                    Current Device
                  </span>
                </div>
              </div>

              {/* Sign Out Card */}
              <div className="bg-surface border border-border rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Sign Out</h3>
                  <p className="text-xs text-muted mt-0.5">
                    Revoke your session tokens and sign out of CHITHI on this browser.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-5 py-2.5 rounded-2xl bg-destructive text-destructive-foreground font-semibold text-xs hover:opacity-90 flex items-center gap-2 transition-all shadow-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out of CHITHI</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
