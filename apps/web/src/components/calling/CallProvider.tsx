'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useCallStore, CallType, PeerUser, ActiveCallData, CallStatus } from '../../stores/call.store';
import { getSocket } from '../../lib/socket';
import IncomingCallModal from './IncomingCallModal';
import ActiveCallModal from './ActiveCallModal';

interface CallContextType {
  status: CallStatus;
  activeCall: ActiveCallData | null;
  incomingCall: ActiveCallData | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerMuted: boolean;
  callDuration: number;
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  remoteStreamRef: React.MutableRefObject<MediaStream | null>;
  startCall: (conversationId: string, callType: CallType, peerUser: PeerUser) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  cancelCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const {
    status,
    activeCall,
    incomingCall,
    iceServers,
    isMuted,
    isVideoOff,
    isSpeakerMuted,
    callDuration,
    setStatus,
    setActiveCall,
    setIncomingCall,
    setIceServers,
    setIsMuted,
    setIsVideoOff,
    setCallDuration,
    setConnectionQuality,
    resetCall,
  } = useCallStore();

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Web Audio Context for synthesized sound cues (ringback & ringtones)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundNodesRef = useRef<{ osc1?: OscillatorNode; osc2?: OscillatorNode; gain?: GainNode; interval?: NodeJS.Timeout } | null>(null);

  // --- Web Audio Synthesized Ringtones ---
  const stopTone = useCallback(() => {
    if (soundNodesRef.current) {
      if (soundNodesRef.current.interval) {
        clearInterval(soundNodesRef.current.interval);
      }
      try {
        soundNodesRef.current.osc1?.stop();
        soundNodesRef.current.osc2?.stop();
        soundNodesRef.current.osc1?.disconnect();
        soundNodesRef.current.osc2?.disconnect();
      } catch {
        // Ignore if already stopped
      }
      soundNodesRef.current = null;
    }
  }, []);

  const playRingbackTone = useCallback(() => {
    stopTone();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioCtxRef.current || new AudioCtx();
      audioCtxRef.current = ctx;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      gain.gain.value = 0.05;

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      let on = true;
      const interval = setInterval(() => {
        if (!gain.gain) return;
        on = !on;
        gain.gain.setValueAtTime(on ? 0.05 : 0, ctx.currentTime);
      }, 2000);

      soundNodesRef.current = { osc1, osc2, gain, interval };
    } catch (e) {
      console.warn('AudioContext playback error:', e);
    }
  }, [stopTone]);

  const playIncomingRingtone = useCallback(() => {
    stopTone();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioCtxRef.current || new AudioCtx();
      audioCtxRef.current = ctx;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.value = 853;
      osc2.frequency.value = 960;
      gain.gain.value = 0.08;

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      let on = true;
      const interval = setInterval(() => {
        if (!gain.gain) return;
        on = !on;
        gain.gain.setValueAtTime(on ? 0.08 : 0, ctx.currentTime);
      }, 1500);

      soundNodesRef.current = { osc1, osc2, gain, interval };
    } catch (e) {
      console.warn('AudioContext ringtone error:', e);
    }
  }, [stopTone]);

  // Clean teardown helper
  const cleanupMediaAndPeer = useCallback(() => {
    stopTone();

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      remoteStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch {}
      peerConnectionRef.current = null;
    }

    pendingIceCandidatesRef.current = [];
  }, [stopTone]);

  // Acquire local media streams
  const acquireLocalMedia = useCallback(async (callType: CallType): Promise<MediaStream> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia is not supported by your browser');
    }

    const audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };

    if (callType === 'video') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
        });
        localStreamRef.current = stream;
        return stream;
      } catch (err) {
        console.warn('Video access failed, falling back to audio only:', err);
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        localStreamRef.current = audioStream;
        setIsVideoOff(true);
        return audioStream;
      }
    } else {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
      localStreamRef.current = stream;
      return stream;
    }
  }, [setIsVideoOff]);

  // Create and configure RTCPeerConnection
  const createPeerConnection = useCallback((callId: string, peerId: string) => {
    const socket = getSocket();

    const pc = new RTCPeerConnection({
      iceServers: iceServers && iceServers.length > 0 ? iceServers : [
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      ],
      iceCandidatePoolSize: 2,
    });

    peerConnectionRef.current = pc;

    // Attach local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Remote track arrived
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
      } else {
        const newStream = new MediaStream();
        newStream.addTrack(event.track);
        remoteStreamRef.current = newStream;
      }
      setConnectionQuality('excellent');
    };

    // Trickle ICE candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && socket && socket.connected) {
        socket.emit('call:ice-candidate', {
          callId,
          targetUserId: peerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Connection state monitoring
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        setConnectionQuality('excellent');
      } else if (state === 'disconnected') {
        setConnectionQuality('poor');
      } else if (state === 'failed') {
        setConnectionQuality('poor');
        pc.restartIce();
      }
    };

    return pc;
  }, [iceServers, setConnectionQuality]);

  // Start outgoing call
  const startCall = useCallback(async (conversationId: string, callType: CallType, peerUser: PeerUser) => {
    cleanupMediaAndPeer();

    try {
      const socket = getSocket();
      if (!socket.connected) {
        socket.connect();
      }

      // Immediately set outgoing call state so ActiveCallModal displays instantly
      setActiveCall({
        id: '',
        conversationId,
        callType,
        peerUser,
        isCaller: true,
      });
      setStatus('outgoing');

      // 1. Acquire local microphone and optional camera
      await acquireLocalMedia(callType);

      // 2. Play ringback tone while waiting
      playRingbackTone();

      // 3. Emit invite to backend
      socket.emit(
        'call:invite',
        { conversationId, callType },
        (ack: { success: boolean; call?: any; iceServers?: any[]; error?: string }) => {
          if (!ack || !ack.success) {
            stopTone();
            cleanupMediaAndPeer();
            resetCall();
            alert(`Call failed: ${ack?.error || 'Unable to connect'}`);
            return;
          }

          if (ack.iceServers) {
            setIceServers(ack.iceServers);
          }

          setActiveCall({
            id: ack.call.id,
            conversationId,
            callType,
            peerUser,
            isCaller: true,
          });
        },
      );
    } catch (err: any) {
      stopTone();
      cleanupMediaAndPeer();
      resetCall();
      alert(`Could not start call: ${err.message || 'Device access denied'}`);
    }
  }, [acquireLocalMedia, cleanupMediaAndPeer, playRingbackTone, resetCall, setActiveCall, setIceServers, setStatus, stopTone]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    stopTone();

    const call = incomingCall;
    setIncomingCall(null);

    try {
      // 1. Acquire media
      await acquireLocalMedia(call.callType);

      // 2. Setup peer connection
      const pc = createPeerConnection(call.id, call.peerUser.id);

      // 3. Emit accept
      const socket = getSocket();
      socket.emit('call:accept', { callId: call.id }, (ack: any) => {
        if (!ack || !ack.success) {
          cleanupMediaAndPeer();
          resetCall();
          return;
        }

        setActiveCall(call);
        setStatus('connected');

        // Start duration counter
        if (durationTimerRef.current) clearInterval(durationTimerRef.current);
        durationTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      });
    } catch (err: any) {
      cleanupMediaAndPeer();
      resetCall();
      alert(`Could not accept call: ${err.message}`);
    }
  }, [acquireLocalMedia, cleanupMediaAndPeer, createPeerConnection, incomingCall, resetCall, setActiveCall, setCallDuration, setIncomingCall, setStatus, stopTone]);

  // Reject incoming call
  const rejectCall = useCallback((reason = 'declined') => {
    stopTone();
    if (incomingCall) {
      const socket = getSocket();
      socket.emit('call:reject', { callId: incomingCall.id, reason });
      setIncomingCall(null);
    }
  }, [incomingCall, setIncomingCall, stopTone]);

  // Cancel outgoing call before answered
  const cancelCall = useCallback(() => {
    stopTone();
    if (activeCall && activeCall.isCaller && activeCall.id) {
      const socket = getSocket();
      socket.emit('call:cancel', { callId: activeCall.id });
    }
    cleanupMediaAndPeer();
    resetCall();
  }, [activeCall, cleanupMediaAndPeer, resetCall, stopTone]);

  // End active call
  const endCall = useCallback(() => {
    stopTone();
    if (activeCall && activeCall.id) {
      const socket = getSocket();
      socket.emit('call:end', { callId: activeCall.id });
    }
    cleanupMediaAndPeer();
    resetCall();
  }, [activeCall, cleanupMediaAndPeer, resetCall, stopTone]);

  // Toggle Microphone
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  }, [isMuted, setIsMuted]);

  // Toggle Camera
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  }, [isVideoOff, setIsVideoOff]);

  // Global socket listener bindings for calling signaling
  useEffect(() => {
    const socket = getSocket();

    const handleIncoming = (data: {
      callId: string;
      conversationId: string;
      callType: CallType;
      caller: PeerUser;
      iceServers?: any[];
    }) => {
      if (data.iceServers) {
        setIceServers(data.iceServers);
      }

      if (activeCall || incomingCall) {
        socket.emit('call:reject', { callId: data.callId, reason: 'busy' });
        return;
      }

      setIncomingCall({
        id: data.callId,
        conversationId: data.conversationId,
        callType: data.callType,
        peerUser: data.caller,
        isCaller: false,
      });

      playIncomingRingtone();
      socket.emit('call:ringing', { callId: data.callId });
    };

    const handleRinging = (data: { callId: string }) => {
      setStatus('ringing');
    };

    const handleAccepted = async (data: { callId: string; callee: PeerUser }) => {
      stopTone();
      setStatus('connected');

      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      if (activeCall) {
        const pc = createPeerConnection(data.callId, data.callee.id);
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: activeCall.callType === 'video',
          });
          await pc.setLocalDescription(offer);

          socket.emit('call:offer', {
            callId: data.callId,
            receiverId: data.callee.id,
            sdp: offer,
          });
        } catch (err) {
          console.error('Error creating WebRTC offer:', err);
        }
      }
    };

    const handleOffer = async (data: { callId: string; callerId: string; sdp: RTCSessionDescriptionInit }) => {
      let pc = peerConnectionRef.current;
      if (!pc && activeCall) {
        pc = createPeerConnection(data.callId, data.callerId);
      }
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

        while (pendingIceCandidatesRef.current.length > 0) {
          const candidate = pendingIceCandidatesRef.current.shift();
          if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('call:answer', {
          callId: data.callId,
          callerId: data.callerId,
          sdp: answer,
        });
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
      }
    };

    const handleAnswer = async (data: { callId: string; calleeId: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

        while (pendingIceCandidatesRef.current.length > 0) {
          const candidate = pendingIceCandidatesRef.current.shift();
          if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error setting remote description from answer:', err);
      }
    };

    const handleIceCandidate = async (data: { callId: string; fromUserId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.warn('Error adding ICE candidate:', err);
        }
      } else {
        pendingIceCandidatesRef.current.push(data.candidate);
      }
    };

    const handleRejected = (data: { callId: string; reason?: string }) => {
      stopTone();
      cleanupMediaAndPeer();
      resetCall();
      alert(`Call was declined (${data.reason || 'declined'})`);
    };

    const handleCancelled = (data: { callId: string }) => {
      stopTone();
      setIncomingCall(null);
      cleanupMediaAndPeer();
      resetCall();
    };

    const handleEnded = (data: { callId: string; durationSeconds?: number; reason?: string }) => {
      stopTone();
      cleanupMediaAndPeer();
      resetCall();
    };

    socket.on('call:incoming', handleIncoming);
    socket.on('call:ringing', handleRinging);
    socket.on('call:accepted', handleAccepted);
    socket.on('call:offer', handleOffer);
    socket.on('call:answer', handleAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:rejected', handleRejected);
    socket.on('call:cancelled', handleCancelled);
    socket.on('call:ended', handleEnded);

    return () => {
      socket.off('call:incoming', handleIncoming);
      socket.off('call:ringing', handleRinging);
      socket.off('call:accepted', handleAccepted);
      socket.off('call:offer', handleOffer);
      socket.off('call:answer', handleAnswer);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:rejected', handleRejected);
      socket.off('call:cancelled', handleCancelled);
      socket.off('call:ended', handleEnded);
    };
  }, [activeCall, incomingCall, setIncomingCall, playIncomingRingtone, setStatus, stopTone, setCallDuration, createPeerConnection, cleanupMediaAndPeer, resetCall, setIceServers]);

  const value: CallContextType = {
    status,
    activeCall,
    incomingCall,
    isMuted,
    isVideoOff,
    isSpeakerMuted,
    callDuration,
    localStreamRef,
    remoteStreamRef,
    startCall,
    acceptCall,
    rejectCall,
    cancelCall,
    endCall,
    toggleMute,
    toggleVideo,
  };

  return (
    <CallContext.Provider value={value}>
      {children}
      <IncomingCallModal />
      <ActiveCallModal />
    </CallContext.Provider>
  );
}

export function useWebRTCCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useWebRTCCall must be used within a CallProvider');
  }
  return context;
}
