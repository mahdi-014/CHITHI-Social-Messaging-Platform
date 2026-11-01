'use client';

import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useWebRTCCall } from '../../hooks/useWebRTCCall';

export default function IncomingCallModal() {
  const { incomingCall, acceptCall, rejectCall } = useWebRTCCall();

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === 'video';
  const callerName = incomingCall.peerUser.displayName || incomingCall.peerUser.username;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border/60 shadow-xl rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center flex flex-col items-center">
        {/* Brand Header */}
        <div className="flex items-center gap-1.5 mb-5 text-[11px] font-medium text-muted tracking-wide uppercase">
          <img src="/brand/logo/logo-symbol.svg" alt="CHITHI" className="w-4 h-4 object-contain rounded-sm" />
          <span>CHITHI Secure Call</span>
        </div>

        {/* Pulsing Avatar */}
        <div className="relative mb-6">
          <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping duration-1000" />
          <span className="absolute -inset-2 rounded-full bg-primary/10 animate-pulse duration-700" />
          <div className="relative w-24 h-24 rounded-full bg-primary/20 text-primary border-4 border-surface flex items-center justify-center font-bold text-3xl shadow-md">
            {callerName ? callerName[0].toUpperCase() : 'U'}
          </div>
        </div>

        {/* Title & Info */}
        <h3 className="text-xl font-bold text-foreground mb-1">{callerName}</h3>
        <p className="text-xs text-muted mb-1">@{incomingCall.peerUser.username}</p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-8">
          {isVideo ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
          Incoming {isVideo ? 'Video' : 'Audio'} Call...
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6 w-full">
          {/* Decline */}
          <button
            onClick={() => rejectCall('declined')}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="w-13 h-13 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:opacity-90 active:scale-95 transition-all">
              <PhoneOff className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-muted group-hover:text-foreground transition-colors">
              Decline
            </span>
          </button>

          {/* Accept */}
          <button
            onClick={acceptCall}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="w-13 h-13 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary-hover active:scale-95 transition-all">
              {isVideo ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </div>
            <span className="text-xs font-medium text-muted group-hover:text-foreground transition-colors">
              Accept
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

