'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth.store';
import {
  User,
  Edit3,
  Calendar,
  Users,
  Compass,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [profileData, setProfileData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiFetch<any>(`/profiles/${user.id}`);
      setProfileData(data);
      setDisplayName(data.displayName || user.displayName);
      setBio(data.bio || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

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

      setSaveSuccess(true);
      setEditing(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-sm text-muted">Loading profile...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-3xl mx-auto w-full">
      {/* Profile Card */}
      <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm mb-8">
        {/* Cover Banner */}
        <div className="h-36 md:h-48 bg-gradient-to-r from-primary/80 to-primary flex items-center justify-center text-primary-foreground/20 font-bold text-4xl select-none">
          চিঠি CHITHI
        </div>

        {/* Profile Info Bar */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 sm:-mt-20 mb-4 gap-4">
            <div className="relative">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-surface border-4 border-surface text-primary flex items-center justify-center font-extrabold text-4xl shadow-xl shadow-black/10">
                {profileData?.displayName ? profileData.displayName[0].toUpperCase() : 'U'}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditing(!editing)}
                className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-surface-muted text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {editing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">{profileData?.displayName || user?.displayName}</h2>
            <p className="text-xs text-muted mt-0.5">@{user?.username}</p>

            {profileData?.bio && (
              <p className="text-sm mt-3 text-foreground/90 max-w-xl leading-relaxed whitespace-pre-wrap">
                {profileData.bio}
              </p>
            )}

            <div className="flex items-center gap-6 mt-5 pt-4 border-t border-border/60 text-xs text-muted">
              <div className="flex items-center gap-1.5 font-medium">
                <Users className="w-4 h-4 text-primary" />
                <span className="font-bold text-foreground">{profileData?.friendCount || 0}</span> Friends
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Compass className="w-4 h-4 text-primary" />
                <span className="font-bold text-foreground">{profileData?.postCount || 0}</span> Moments
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Joined {new Date(profileData?.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      {editing && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm mb-8">
          <h3 className="font-bold text-base mb-4">Edit Profile</h3>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Tell your friends something about yourself..."
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !displayName.trim()}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-md shadow-primary/20 flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
