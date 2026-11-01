'use client';

import React, { useEffect, useState } from 'react';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video,
  Clock,
  X,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';
import { formatDistanceToNow } from 'date-fns';

interface CallRecord {
  id: string;
  conversationId: string;
  callerId: string;
  receiverId: string;
  callType: 'audio' | 'video';
  status: string;
  endReason?: string;
  durationSeconds: number;
  createdAt: string;
  caller: {
    id: string;
    username: string;
    profile?: { displayName?: string };
  };
  receiver: {
    id: string;
    username: string;
    profile?: { displayName?: string };
  };
}

export default function CallHistoryModal({
  isOpen,
  onClose,
  onCallUser,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCallUser?: (conversationId: string, callType: 'audio' | 'video', peerUser: any) => void;
}) {
  const { user } = useAuthStore();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      apiFetch<{ calls: CallRecord[] }>('/calls/history?limit=30')
        .then((res) => setCalls(res.calls || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatSecs = (sec: number) => {
    if (!sec) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border shadow-2xl rounded-3xl max-w-lg w-full flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Call History</h3>
              <p className="text-xs text-muted">Recent voice & video calls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted">Loading call logs...</div>
          ) : calls.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">No calls recorded yet.</div>
          ) : (
            calls.map((call) => {
              const isCaller = call.callerId === user?.id;
              const peer = isCaller ? call.receiver : call.caller;
              const peerName = peer?.profile?.displayName || peer?.username || 'User';
              const isVideo = call.callType === 'video';
              const isMissed = call.status === 'missed' || call.status === 'busy';

              return (
                <div
                  key={call.id}
                  className="p-3.5 rounded-2xl bg-surface-muted/50 border border-border/40 flex items-center justify-between gap-3 hover:bg-surface-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                        {peerName[0].toUpperCase()}
                      </div>
                      <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-surface">
                        {isMissed ? (
                          <PhoneMissed className="w-3.5 h-3.5 text-destructive" />
                        ) : isCaller ? (
                          <PhoneOutgoing className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{peerName}</span>
                        {isVideo ? (
                          <Video className="w-3.5 h-3.5 text-muted" />
                        ) : (
                          <Phone className="w-3.5 h-3.5 text-muted" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span className="capitalize font-medium">
                          {isMissed ? 'Missed' : call.status}
                        </span>
                        {call.durationSeconds > 0 && (
                          <>
                            <span>•</span>
                            <span>{formatSecs(call.durationSeconds)}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {onCallUser && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onCallUser(call.conversationId, 'audio', peer);
                          onClose();
                        }}
                        title="Voice Call"
                        className="p-2 rounded-xl text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          onCallUser(call.conversationId, 'video', peer);
                          onClose();
                        }}
                        title="Video Call"
                        className="p-2 rounded-xl text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
