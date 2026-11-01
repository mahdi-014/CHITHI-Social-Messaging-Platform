'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { apiFetch } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth.store';
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
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { logout, user } = useAuthStore();

  const [settings, setSettings] = useState<any>({
    showOnlineStatus: true,
    showLastSeen: true,
    allowFriendRequests: true,
    pushNotifications: true,
    themePreference: 'system',
  });
  const [loading, setLoading] = useState(true);
  const [savedNote, setSavedNote] = useState(false);

  useEffect(() => {
    apiFetch<any>('/users/settings')
      .then((data) => {
        if (data) {
          setSettings(data);
          if (data.themePreference) {
            setTheme(data.themePreference);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [setTheme]);

  const updateSetting = async (key: string, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    if (key === 'themePreference') {
      setTheme(value);
    }

    try {
      await apiFetch('/users/settings', {
        method: 'PATCH',
        body: { [key]: value },
      });
      setSavedNote(true);
      setTimeout(() => setSavedNote(false), 2000);
    } catch (err) {
      console.error('Failed to update setting:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-xs text-muted">Manage your appearance, privacy, and account</p>
          </div>
        </div>

        {savedNote && (
          <span className="text-xs text-success font-medium flex items-center gap-1 bg-success/10 px-3 py-1.5 rounded-xl animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            Saved
          </span>
        )}
      </div>

      <div className="space-y-6">
        {/* Appearance Section */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">Appearance</h2>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => updateSetting('themePreference', 'light')}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                theme === 'light'
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border bg-background hover:bg-surface-muted text-muted'
              }`}
            >
              <Sun className="w-6 h-6" />
              <span className="text-xs">Light</span>
            </button>

            <button
              onClick={() => updateSetting('themePreference', 'dark')}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                theme === 'dark'
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border bg-background hover:bg-surface-muted text-muted'
              }`}
            >
              <Moon className="w-6 h-6" />
              <span className="text-xs">Dark</span>
            </button>

            <button
              onClick={() => updateSetting('themePreference', 'system')}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                theme === 'system'
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border bg-background hover:bg-surface-muted text-muted'
              }`}
            >
              <Laptop className="w-6 h-6" />
              <span className="text-xs">System</span>
            </button>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-2">Privacy & Visibility</h2>

          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <div>
              <p className="text-sm font-semibold">Show Online Status</p>
              <p className="text-xs text-muted">Let accepted friends know when you are currently active</p>
            </div>
            <input
              type="checkbox"
              checked={settings.showOnlineStatus}
              onChange={(e) => updateSetting('showOnlineStatus', e.target.checked)}
              className="w-5 h-5 accent-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <div>
              <p className="text-sm font-semibold">Show Last Seen</p>
              <p className="text-xs text-muted">Show when you were last online</p>
            </div>
            <input
              type="checkbox"
              checked={settings.showLastSeen}
              onChange={(e) => updateSetting('showLastSeen', e.target.checked)}
              className="w-5 h-5 accent-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold">Allow Friend Requests</p>
              <p className="text-xs text-muted">Allow people who search your exact username to send requests</p>
            </div>
            <input
              type="checkbox"
              checked={settings.allowFriendRequests}
              onChange={(e) => updateSetting('allowFriendRequests', e.target.checked)}
              className="w-5 h-5 accent-primary cursor-pointer"
            />
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">Account</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Sign Out</p>
              <p className="text-xs text-muted">Sign out of your account on this device</p>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground font-semibold text-xs hover:opacity-90 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
