'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import UserProfileView from '../../../../components/profile/UserProfileView';

export default function UserProfilePage() {
  const params = useParams();
  const username = params?.username as string;

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto py-4 sm:py-6 px-2 sm:px-4">
        <div className="rounded-3xl border border-border shadow-sm overflow-hidden bg-surface">
          <UserProfileView username={username} />
        </div>
      </div>
    </div>
  );
}

