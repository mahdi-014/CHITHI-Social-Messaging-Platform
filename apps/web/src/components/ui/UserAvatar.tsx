'use client';

import React, { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface UserAvatarProps {
  displayName?: string;
  username?: string;
  avatarMediaId?: string | null;
  size?: AvatarSize;
  isOnline?: boolean;
  className?: string;
}

const sizeClasses: Record<AvatarSize, { container: string; text: string; badge: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]', badge: 'w-2 h-2 -bottom-0.5 -right-0.5' },
  sm: { container: 'w-8 h-8', text: 'text-xs', badge: 'w-2.5 h-2.5 bottom-0 right-0' },
  md: { container: 'w-10 h-10', text: 'text-sm font-semibold', badge: 'w-3 h-3 bottom-0 right-0' },
  lg: { container: 'w-14 h-14', text: 'text-lg font-bold', badge: 'w-3.5 h-3.5 bottom-0.5 right-0.5' },
  xl: { container: 'w-20 h-20', text: 'text-2xl font-bold', badge: 'w-4 h-4 bottom-1 right-1' },
  '2xl': { container: 'w-32 h-32 md:w-36 md:h-36', text: 'text-4xl font-extrabold', badge: 'w-6 h-6 bottom-2 right-2' },
};

export default function UserAvatar({
  displayName,
  username,
  avatarMediaId,
  size = 'md',
  isOnline = false,
  className = '',
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeConfig = sizeClasses[size];

  const name = displayName || username || 'User';
  const initial = name.trim().charAt(0).toUpperCase();

  // Color generator based on name hash for distinct pleasant avatar colors
  const getGradient = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradients = [
      'from-blue-600 to-indigo-600',
      'from-indigo-600 to-purple-600',
      'from-purple-600 to-pink-600',
      'from-emerald-600 to-teal-600',
      'from-amber-600 to-orange-600',
      'from-cyan-600 to-blue-600',
    ];
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  const avatarUrl = avatarMediaId ? `${API_URL}/media/${avatarMediaId}/file` : null;

  return (
    <div className={`relative flex-shrink-0 select-none ${className}`}>
      <div
        className={`${sizeConfig.container} rounded-full overflow-hidden flex items-center justify-center font-bold transition-transform shadow-sm ${
          avatarUrl && !imgError
            ? 'bg-surface-muted'
            : `bg-gradient-to-tr ${getGradient(name)} text-white`
        }`}
      >
        {avatarUrl && !imgError ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className={sizeConfig.text}>{initial}</span>
        )}
      </div>

      {isOnline && (
        <span
          className={`absolute ${sizeConfig.badge} rounded-full bg-emerald-500 border-2 border-surface shadow-sm`}
          title="Active Now"
        />
      )}
    </div>
  );
}

