'use client';

import React from 'react';
import UserProfileView from './UserProfileView';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId?: string;
  username?: string;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  targetUserId,
  username,
}: UserProfileModalProps) {
  if (!isOpen || (!targetUserId && !username)) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border shadow-2xl rounded-3xl max-w-2xl w-full overflow-hidden">
        <UserProfileView
          targetUserId={targetUserId}
          username={username}
          onClose={onClose}
          isModal={true}
        />
      </div>
    </div>
  );
}

