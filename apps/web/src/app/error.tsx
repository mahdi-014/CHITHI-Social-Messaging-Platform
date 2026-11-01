'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw, Home } from 'lucide-react';
import BrandLogo from '../components/ui/BrandLogo';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('CHITHI application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground text-center">
      <div className="flex flex-col items-center max-w-md w-full bg-surface border border-border shadow-xl rounded-3xl p-8 sm:p-10 animate-in fade-in duration-200">
        <BrandLogo variant="symbol" size="xl" className="mb-6 shadow-md shadow-primary/20" />
        <span className="text-xs font-bold uppercase tracking-widest text-destructive mb-2">Error Occurred</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">Something Went Wrong</h1>
        <p className="text-sm text-muted mb-8 leading-relaxed">
          We encountered an unexpected connection issue. Your private conversations and account are safe.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={() => reset()}
            className="w-full py-3 px-5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-hover shadow-md shadow-primary/25 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/chats"
            className="w-full py-3 px-5 rounded-2xl border border-border bg-surface-muted hover:bg-border text-foreground font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>

      <footer className="mt-8 text-xs text-muted">
        CHITHI Social Messaging Platform • Secure DTLS & WebRTC
      </footer>
    </div>
  );
}

