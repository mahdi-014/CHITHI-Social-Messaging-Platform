'use client';

import React from 'react';
import Link from 'next/link';

export interface BrandLogoProps {
  variant?: 'symbol' | 'primary' | 'compact' | 'wordmark';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'auto' | 'light' | 'dark' | 'white' | 'black';
  className?: string;
  withLink?: boolean;
  href?: string;
  showSubtitle?: boolean;
}

const SIZE_MAP = {
  xs: { symbol: 'w-7 h-7', primary: 'h-6', compact: 'h-6', text: 'text-base' },
  sm: { symbol: 'w-8 h-8', primary: 'h-8', compact: 'h-7', text: 'text-lg' },
  md: { symbol: 'w-10 h-10', primary: 'h-10', compact: 'h-9', text: 'text-xl' },
  lg: { symbol: 'w-12 h-12', primary: 'h-12', compact: 'h-11', text: 'text-2xl' },
  xl: { symbol: 'w-16 h-16', primary: 'h-16', compact: 'h-14', text: 'text-3xl' },
};

export default function BrandLogo({
  variant = 'symbol',
  size = 'md',
  theme = 'auto',
  className = '',
  withLink = false,
  href = '/chats',
  showSubtitle = true,
}: BrandLogoProps) {
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;

  let content: React.ReactNode = null;

  if (variant === 'symbol') {
    content = (
      <img
        src="/brand/logo/logo-symbol.svg"
        alt="CHITHI"
        className={`${sizeClasses.symbol} rounded-2xl shadow-sm object-contain select-none flex-shrink-0 ${className}`}
      />
    );
  } else if (variant === 'wordmark') {
    content = (
      <img
        src={theme === 'light' ? '/brand/logo/logo-wordmark.svg' : '/brand/logo/logo-wordmark.svg'}
        alt="CHITHI"
        className={`${sizeClasses.primary} object-contain select-none ${className}`}
      />
    );
  } else if (variant === 'compact') {
    if (theme === 'auto') {
      content = (
        <div className={`inline-flex items-center gap-2 select-none ${className}`}>
          {/* Light Theme Logo */}
          <img
            src="/brand/logo/logo-compact.svg"
            alt="CHITHI"
            className={`dark:hidden ${sizeClasses.compact} object-contain`}
          />
          {/* Dark Theme Logo */}
          <img
            src="/brand/logo/logo-compact.svg"
            alt="CHITHI"
            className={`hidden dark:block ${sizeClasses.compact} object-contain`}
          />
        </div>
      );
    } else {
      content = (
        <img
          src="/brand/logo/logo-compact.svg"
          alt="CHITHI"
          className={`${sizeClasses.compact} object-contain select-none ${className}`}
        />
      );
    }
  } else {
    // Primary Horizontal Logo
    if (theme === 'auto') {
      content = (
        <div className={`inline-flex items-center gap-3 select-none ${className}`}>
          {/* Light Theme Logo */}
          <img
            src="/brand/logo/logo-light.svg"
            alt="CHITHI Social Messaging"
            className={`dark:hidden ${sizeClasses.primary} object-contain`}
          />
          {/* Dark Theme Logo */}
          <img
            src="/brand/logo/logo-dark.svg"
            alt="CHITHI Social Messaging"
            className={`hidden dark:block ${sizeClasses.primary} object-contain`}
          />
        </div>
      );
    } else if (theme === 'light') {
      content = (
        <img
          src="/brand/logo/logo-light.svg"
          alt="CHITHI Social Messaging"
          className={`${sizeClasses.primary} object-contain select-none ${className}`}
        />
      );
    } else if (theme === 'white') {
      content = (
        <img
          src="/brand/logo/logo-white.svg"
          alt="CHITHI Social Messaging"
          className={`${sizeClasses.primary} object-contain select-none ${className}`}
        />
      );
    } else if (theme === 'black') {
      content = (
        <img
          src="/brand/logo/logo-black.svg"
          alt="CHITHI Social Messaging"
          className={`${sizeClasses.primary} object-contain select-none ${className}`}
        />
      );
    } else {
      content = (
        <img
          src="/brand/logo/logo-dark.svg"
          alt="CHITHI Social Messaging"
          className={`${sizeClasses.primary} object-contain select-none ${className}`}
        />
      );
    }
  }

  if (withLink) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none group">
        {content}
      </Link>
    );
  }

  return content;
}

