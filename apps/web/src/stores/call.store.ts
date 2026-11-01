import { create } from 'zustand';

export type CallStatus =
  | 'idle'
  | 'outgoing'
  | 'ringing'
  | 'incoming'
  | 'connected'
  | 'reconnecting'
  | 'ended';

export type CallType = 'audio' | 'video';

export interface PeerUser {
  id: string;
  username: string;
  displayName?: string;
  avatarMediaId?: string;
}

export interface ActiveCallData {
  id: string;
  conversationId: string;
  callType: CallType;
  peerUser: PeerUser;
  isCaller: boolean;
  acceptedAt?: Date | null;
}

interface CallStoreState {
  status: CallStatus;
  activeCall: ActiveCallData | null;
  incomingCall: ActiveCallData | null;
  iceServers: RTCIceServer[];
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerMuted: boolean;
  isPiP: boolean;
  callDuration: number; // in seconds
  connectionQuality: 'excellent' | 'good' | 'poor' | 'connecting';

  // Actions
  setIncomingCall: (call: ActiveCallData | null) => void;
  setActiveCall: (call: ActiveCallData | null) => void;
  setStatus: (status: CallStatus) => void;
  setIceServers: (servers: RTCIceServer[]) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeakerMute: () => void;
  togglePiP: () => void;
  setIsMuted: (muted: boolean) => void;
  setIsVideoOff: (videoOff: boolean) => void;
  setCallDuration: (duration: number | ((prev: number) => number)) => void;
  setConnectionQuality: (quality: 'excellent' | 'good' | 'poor' | 'connecting') => void;
  resetCall: () => void;
}

export const useCallStore = create<CallStoreState>((set) => ({
  status: 'idle',
  activeCall: null,
  incomingCall: null,
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ],
  isMuted: false,
  isVideoOff: false,
  isSpeakerMuted: false,
  isPiP: false,
  callDuration: 0,
  connectionQuality: 'connecting',

  setIncomingCall: (call) => set({ incomingCall: call }),
  setActiveCall: (call) => set({ activeCall: call }),
  setStatus: (status) => set({ status }),
  setIceServers: (iceServers) => set({ iceServers }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleVideo: () => set((state) => ({ isVideoOff: !state.isVideoOff })),
  toggleSpeakerMute: () => set((state) => ({ isSpeakerMuted: !state.isSpeakerMuted })),
  togglePiP: () => set((state) => ({ isPiP: !state.isPiP })),
  setIsMuted: (isMuted) => set({ isMuted }),
  setIsVideoOff: (isVideoOff) => set({ isVideoOff }),
  setCallDuration: (duration) =>
    set((state) => ({
      callDuration: typeof duration === 'function' ? duration(state.callDuration) : duration,
    })),
  setConnectionQuality: (connectionQuality) => set({ connectionQuality }),
  resetCall: () =>
    set({
      status: 'idle',
      activeCall: null,
      incomingCall: null,
      isMuted: false,
      isVideoOff: false,
      isSpeakerMuted: false,
      isPiP: false,
      callDuration: 0,
      connectionQuality: 'connecting',
    }),
}));

