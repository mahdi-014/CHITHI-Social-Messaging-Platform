'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  MessageSquare,
  Users,
  Compass,
  User,
  Settings,
  Bell,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '../../stores/auth.store';
import { useChatStore } from '../../stores/chat.store';
import { getSocket } from '../../lib/socket';
import { apiFetch } from '../../lib/api';
import { CallProvider } from '../../components/calling/CallProvider';
import UserAvatar from '../../components/ui/UserAvatar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, isLoading, initializeAuth, logout } = useAuthStore();
  const { appendMessage, updateConversationLastMessage, setUserOnline, setUserTyping } = useChatStore();

  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Global socket setup
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    socket.on('message:new', (message: any) => {
      appendMessage(message.conversationId, message);
      updateConversationLastMessage(message.conversationId, message);
    });

    socket.on('presence:update', (data: { userId: string; isOnline: boolean }) => {
      setUserOnline(data.userId, data.isOnline);
    });

    socket.on('typing:start', (data: { conversationId: string; username: string }) => {
      setUserTyping(data.conversationId, data.username, true);
    });

    socket.on('typing:stop', (data: { conversationId: string }) => {
      setUserTyping(data.conversationId, '', false);
    });

    // Fetch unread notifications
    apiFetch<any>('/notifications/unread-count')
      .then((res) => setUnreadNotifications(res.unreadCount))
      .catch(() => {});

    return () => {
      socket.off('message:new');
      socket.off('presence:update');
      socket.off('typing:start');
      socket.off('typing:stop');
    };
  }, [isAuthenticated, user, appendMessage, updateConversationLastMessage, setUserOnline, setUserTyping]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/brand/logo/logo-symbol.svg"
            alt="CHITHI"
            className="w-12 h-12 rounded-2xl shadow-lg shadow-primary/25 animate-pulse object-contain"
          />
          <p className="text-sm text-muted font-medium">Loading CHITHI...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: 'Chats', href: '/chats', icon: MessageSquare },
    { label: 'Moments', href: '/moments', icon: Compass },
    { label: 'Friends', href: '/friends', icon: Users },
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <CallProvider>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        {/* Desktop Navigation Sidebar */}
        <aside className="hidden md:flex flex-col justify-between w-20 lg:w-64 border-r border-border bg-surface p-3 lg:p-4 z-40 flex-shrink-0 transition-all select-none">
          <div className="flex flex-col gap-6">
            {/* Logo */}
            <Link
              href="/chats"
              className="flex items-center gap-3 px-2 py-1 rounded-2xl hover:bg-surface-muted transition-colors group"
            >
              <img
                src="/brand/logo/logo-symbol.svg"
                alt="CHITHI"
                className="w-11 h-11 rounded-2xl shadow-md shadow-primary/25 flex-shrink-0 group-hover:scale-105 transition-transform object-contain"
              />
              <div className="hidden lg:flex flex-col">
                <span className="text-xl font-black tracking-tight text-foreground">CHITHI</span>
                <span className="text-[10px] font-semibold text-primary tracking-widest uppercase -mt-1">
                  Messenger
                </span>
              </div>
            </Link>

            {/* Nav Links */}
            <nav className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-medium text-sm transition-all relative ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 font-bold'
                        : 'text-muted hover:text-foreground hover:bg-surface-muted'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="hidden lg:inline">{item.label}</span>
                    {isActive && (
                      <span className="lg:hidden absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full bg-primary" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom User Area */}
          <div className="flex flex-col gap-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between px-1">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-10 h-10 rounded-xl hover:bg-surface-muted text-muted hover:text-foreground flex items-center justify-center transition-colors"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
              </button>

              <button
                onClick={() => logout().then(() => router.push('/login'))}
                className="w-10 h-10 rounded-xl hover:bg-destructive/10 text-muted hover:text-destructive flex items-center justify-center transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            <Link
              href="/profile"
              className="flex items-center gap-3 p-2 rounded-2xl bg-surface-muted/60 hover:bg-surface-muted border border-border/40 transition-all group"
              title="View my profile"
            >
              <UserAvatar
                displayName={user?.displayName}
                username={user?.username}
                avatarMediaId={user?.avatarMediaId}
                size="sm"
                isOnline={true}
              />
              <div className="hidden lg:flex flex-col min-w-0 flex-1">
                <span className="font-bold text-xs truncate group-hover:text-primary transition-colors">
                  {user?.displayName || user?.username}
                </span>
                <span className="text-[11px] text-muted truncate">@{user?.username}</span>
              </div>
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (Messenger Style) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 z-50">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all relative ${
                  isActive ? 'text-primary font-bold' : 'text-muted hover:text-foreground'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    isActive ? 'bg-primary/10 text-primary' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </CallProvider>
  );
}
