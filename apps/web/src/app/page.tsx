'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, Users, Image as ImageIcon, Shield, Moon, Sun, ArrowRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '../stores/auth.store';

export default function WelcomePage() {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, initializeAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/chats');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg shadow-primary/20">
              চি
            </div>
            <span className="text-xl font-bold tracking-tight">CHITHI</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-surface-muted transition-colors text-muted hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium hover:text-primary transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover shadow-md shadow-primary/25 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-20 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-8">
          Private • Fast • Real-time
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
          Connect with Friends. <br />
          <span className="text-primary">Chat Freely.</span> Share Moments.
        </h1>
        <p className="text-lg md:text-xl text-muted max-w-2xl mb-10 leading-relaxed">
          CHITHI is a private social messaging platform built for genuine connections. 
          No public discovery feeds. No stranger algorithms. Pure real-time chat and permanent moments for the people you actually know.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary-hover shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-all"
          >
            Create Your Account
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-border bg-surface font-semibold text-base hover:bg-surface-muted transition-all"
          >
            Sign In
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left w-full">
          <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-2">Real-Time Messaging</h3>
            <p className="text-sm text-muted leading-relaxed">
              Fast, persistent one-to-one messaging with delivery receipts, read status, typing indicators, and media sharing.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-2">Mutual Friendships</h3>
            <p className="text-sm text-muted leading-relaxed">
              Find known people via exact username lookup. Conversations and Moments unlock only after mutual friend request acceptance.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-2">Friends-Only Moments</h3>
            <p className="text-sm text-muted leading-relaxed">
              Share permanent photos, text, and short videos with your accepted friends. Chronological, distraction-free feed.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        <p>© 2026 CHITHI. All rights reserved. Private Social Messaging Platform.</p>
      </footer>
    </div>
  );
}
