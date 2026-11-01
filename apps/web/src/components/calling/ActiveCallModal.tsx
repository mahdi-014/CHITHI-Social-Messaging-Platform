'use client';

import React, { useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Signal,
} from 'lucide-react';
import { useWebRTCCall } from '../../hooks/useWebRTCCall';
import { useCallStore } from '../../stores/call.store';

export default function ActiveCallModal() {
  const {
    status,
    activeCall,
    isMuted,
    isVideoOff,
    callDuration,
    localStreamRef,
    remoteStreamRef,
    cancelCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useWebRTCCall();

  const { isPiP, togglePiP } = useCallStore();

  const localVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoElementRef = useRef<HTMLVideoElement | null>(null);

  // Bind local & remote video elements whenever streams change or modal mounts
  useEffect(() => {
    if (localVideoElementRef.current && localStreamRef.current) {
      localVideoElementRef.current.srcObject = localStreamRef.current;
    }
  }, [localStreamRef, status]);

  useEffect(() => {
    const checkRemote = setInterval(() => {
      if (remoteVideoElementRef.current && remoteStreamRef.current) {
        if (remoteVideoElementRef.current.srcObject !== remoteStreamRef.current) {
          remoteVideoElementRef.current.srcObject = remoteStreamRef.current;
        }
      }
    }, 500);

    return () => clearInterval(checkRemote);
  }, [remoteStreamRef, status]);

  if (!activeCall || status === 'idle') return null;

  const isVideo = activeCall.callType === 'video';
  const peerName = activeCall.peerUser.displayName || activeCall.peerUser.username;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. OUTGOING / RINGING SCREEN
  if (status === 'outgoing' || status === 'ringing') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="bg-surface border border-border shadow-2xl rounded-3xl p-8 max-w-sm w-full text-center flex flex-col items-center">
          {/* Avatar with outgoing pulse wave */}
          <div className="relative mb-6">
            <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping duration-1000" />
            <div className="relative w-28 h-28 rounded-full bg-primary/20 text-primary border-4 border-surface flex items-center justify-center font-bold text-4xl shadow-xl">
              {peerName ? peerName[0].toUpperCase() : 'U'}
            </div>
          </div>

          <h3 className="text-2xl font-bold text-foreground mb-1">{peerName}</h3>
          <p className="text-sm text-muted mb-4">@{activeCall.peerUser.username}</p>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-muted text-primary text-xs font-semibold mb-8">
            <Signal className="w-3.5 h-3.5 animate-pulse" />
            {status === 'ringing' ? 'Ringing...' : 'Calling...'}
          </div>

          {/* End / Cancel Button */}
          <button
            onClick={cancelCall}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="w-14 h-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg shadow-destructive/30 hover:scale-105 active:scale-95 transition-all">
              <PhoneOff className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-muted group-hover:text-foreground transition-colors">
              Cancel Call
            </span>
          </button>
        </div>
      </div>
    );
  }

  // 2. CONNECTED CALL SCREEN (Video or Audio)
  return (
    <div
      className={`fixed z-50 transition-all duration-300 ${
        isPiP
          ? 'bottom-6 right-6 w-80 h-96 shadow-2xl rounded-2xl overflow-hidden border border-border bg-surface'
          : 'inset-0 flex items-center justify-center bg-black/85 backdrop-blur-md p-4'
      }`}
    >
      <div
        className={`relative flex flex-col bg-surface border border-border shadow-2xl overflow-hidden ${
          isPiP
            ? 'w-full h-full'
            : 'w-full max-w-4xl h-[85vh] rounded-3xl'
        }`}
      >
        {/* Top Header / Status bar */}
        <div className="absolute top-0 inset-x-0 z-20 p-4 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 text-primary border border-white/20 flex items-center justify-center font-bold text-sm">
              {peerName ? peerName[0].toUpperCase() : 'U'}
            </div>
            <div>
              <h4 className="font-bold text-sm leading-tight text-white drop-shadow-sm">{peerName}</h4>
              <div className="flex items-center gap-1.5 text-[11px] text-white/80">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{formatDuration(callDuration)}</span>
                <span className="opacity-40">•</span>
                <span className="flex items-center gap-0.5 opacity-80">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  E2E Encrypted (DTLS)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={togglePiP}
              title={isPiP ? 'Expand' : 'Picture-in-Picture'}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
            >
              {isPiP ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Media Presentation View */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {isVideo ? (
            <>
              {/* Remote Video Stream */}
              <video
                ref={remoteVideoElementRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Local Video Stream Preview (Picture-in-Picture inset) */}
              <div className="absolute bottom-24 right-4 w-32 h-44 sm:w-40 sm:h-56 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-zinc-900 z-10">
                <video
                  ref={localVideoElementRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
                />
                {isVideoOff && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 text-muted p-2 text-center text-xs">
                    <VideoOff className="w-6 h-6 mb-1 text-muted" />
                    Camera Off
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Audio Call UI */
            <div className="flex flex-col items-center justify-center text-center p-8">
              <div className="relative mb-6">
                <span className="absolute -inset-4 rounded-full bg-primary/10 animate-pulse duration-1000" />
                <span className="absolute -inset-8 rounded-full bg-primary/5 animate-pulse duration-700" />
                <div className="relative w-32 h-32 rounded-full bg-primary/20 text-primary border-4 border-white/10 flex items-center justify-center font-bold text-5xl shadow-2xl">
                  {peerName ? peerName[0].toUpperCase() : 'U'}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{peerName}</h3>
              <p className="text-sm text-zinc-400 mb-4">Audio Call in Progress</p>
              <div className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-emerald-400 font-mono text-sm tracking-wider">
                {formatDuration(callDuration)}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="absolute bottom-0 inset-x-0 z-20 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-center gap-4">
          {/* Mute Mic */}
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            className={`p-3.5 rounded-2xl backdrop-blur-md transition-all ${
              isMuted
                ? 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Camera (for video calls or upgrade) */}
          <button
            onClick={toggleVideo}
            title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
            className={`p-3.5 rounded-2xl backdrop-blur-md transition-all ${
              isVideoOff
                ? 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={endCall}
            title="End Call"
            className="px-6 py-3.5 rounded-2xl bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-xl shadow-destructive/30 flex items-center gap-2 font-bold text-sm hover:scale-105 active:scale-95 transition-all"
          >
            <PhoneOff className="w-5 h-5" />
            <span>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}

