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
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl animate-pulse shadow-lg shadow-primary/25">
            চি
          </div>
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
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Desktop Navigation Sidebar */}
      <aside className="hidden md:flex flex-col justify-between w-20 lg:w-64 border-r border-border bg-surface p-4 z-40">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <Link href="/chats" className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shadow-md shadow-primary/20 flex-shrink-0">
              চি
            </div>
            <span className="hidden lg:inline text-xl font-bold tracking-tight">CHITHI</span>
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
                  className={`flex items-center gap-3.5 px-3 py-3 rounded-xl font-medium text-sm transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'text-muted hover:text-foreground hover:bg-surface-muted'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Area */}
        <div className="flex flex-col gap-2 pt-4 border-t border-border">
          <div className="flex items-center justify-between px-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl hover:bg-surface-muted text-muted hover:text-foreground transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={() => logout().then(() => router.push('/login'))}
              className="p-2 rounded-xl hover:bg-destructive/10 text-muted hover:text-destructive transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-surface-muted/50">
            <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
              {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden lg:flex flex-col min-w-0">
              <span className="font-semibold text-xs truncate">{user?.displayName}</span>
              <span className="text-[11px] text-muted truncate">@{user?.username}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center justify-around px-2 z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
                isActive ? 'text-primary' : 'text-muted'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
