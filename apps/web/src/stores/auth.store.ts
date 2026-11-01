import { create } from 'zustand';
import { apiFetch } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  displayName: string;
  bio?: string;
  avatarMediaId?: string;
  coverMediaId?: string;
  themePreference?: string;
  isVerified?: boolean;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (user: UserProfile, token: string) => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  updateUser: (partial: Partial<UserProfile>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chithi_token', token);
    }
    connectSocket(token);
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chithi_token');
    }
    disconnectSocket();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  initializeAuth: async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('chithi_token');
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const data = await apiFetch<any>('/users/me', { token });
      const user: UserProfile = {
        id: data.id,
        username: data.username,
        email: data.email,
        phone: data.phone,
        displayName: data.profile?.displayName || data.username,
        bio: data.profile?.bio,
        avatarMediaId: data.profile?.avatarMediaId,
        coverMediaId: data.profile?.coverMediaId,
        themePreference: data.settings?.themePreference || 'system',
        isVerified: data.isVerified,
      };
      connectSocket(token);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('chithi_token');
      disconnectSocket();
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: (partial) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...partial } });
    }
  },
}));
