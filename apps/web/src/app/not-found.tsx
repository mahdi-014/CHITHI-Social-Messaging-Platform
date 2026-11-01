'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import BrandLogo from '../components/ui/BrandLogo';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground text-center">
      <div className="flex flex-col items-center max-w-md w-full bg-surface border border-border shadow-xl rounded-3xl p-8 sm:p-10 animate-in fade-in duration-200">
        <BrandLogo variant="symbol" size="xl" className="mb-6 shadow-md shadow-primary/20" />
        <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2">404 • Not Found</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">Page Not Found</h1>
        <p className="text-sm text-muted mb-8 leading-relaxed">
          The personal message or page you are looking for doesn&apos;t exist or has moved.
        </p>

        <Link
          href="/chats"
          className="w-full py-3.5 px-6 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-hover shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to CHITHI</span>
        </Link>
      </div>

      <footer className="mt-8 text-xs text-muted">
        CHITHI Social Messaging Platform • চিঠি
      </footer>
    </div>
  );
}
