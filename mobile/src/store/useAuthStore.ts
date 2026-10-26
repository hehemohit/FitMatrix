import { create } from 'zustand';
import { createMMKV, type MMKV } from 'react-native-mmkv';
import {
  registerApi,
  loginApi,
  submitOnboardingApi,
  AuthResponse,
  OnboardingPayload,
} from '../api/authApi';
import { setAuthToken } from '../api/coachApi';
import { useTrainerStore } from './useTrainerStore';

export interface AuthUser {
  userId: string;
  email: string;
  fullName: string;
  isOnboarded: boolean;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  loading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, fullName: string) => Promise<boolean>;
  logout: () => void;
  submitOnboarding: (payload: OnboardingPayload) => Promise<boolean>;
  clearError: () => void;
}

const storage: MMKV = createMMKV({ id: 'fitmatrix-auth-store' });

function hydrate<T>(key: string, fallback: T): T {
  const raw = storage.getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function persist<T>(key: string, val: T): void {
  storage.set(key, JSON.stringify(val));
}

const initialToken = hydrate<string | null>('token', null);
const initialUser = hydrate<AuthUser | null>('user', null);
const initialIsOnboarded = initialUser?.isOnboarded ?? hydrate<boolean>('is_onboarded', false);

// Initialize token on module load
if (initialToken) {
  setAuthToken(initialToken);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: initialToken,
  user: initialUser,
  isAuthenticated: !!initialToken,
  isOnboarded: initialIsOnboarded,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const res = await loginApi(email, password);
      const authUser: AuthUser = {
        userId: res.user_id,
        email: res.email,
        fullName: res.full_name,
        isOnboarded: res.is_onboarded,
      };

      setAuthToken(res.access_token);
      persist('token', res.access_token);
      persist('user', authUser);
      persist('is_onboarded', res.is_onboarded);

      set({
        token: res.access_token,
        user: authUser,
        isAuthenticated: true,
        isOnboarded: res.is_onboarded,
        loading: false,
      });

      // Synchronize trainer store for active user
      const trainer = useTrainerStore.getState();
      trainer.loadUserData(res.user_id);
      trainer.fetchStrategyProfile();
      trainer.syncHabitsHistory();
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      set({ error: msg, loading: false });
      return false;
    }
  },

  register: async (email: string, password: string, fullName: string) => {
    set({ loading: true, error: null });
    try {
      const res = await registerApi(email, password, fullName);
      const authUser: AuthUser = {
        userId: res.user_id,
        email: res.email,
        fullName: res.full_name,
        isOnboarded: false,
      };

      setAuthToken(res.access_token);
      persist('token', res.access_token);
      persist('user', authUser);
      persist('is_onboarded', false);

      useTrainerStore.getState().resetUserData();

      set({
        token: res.access_token,
        user: authUser,
        isAuthenticated: true,
        isOnboarded: false,
        loading: false,
      });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Registration failed. Please try again.';
      set({ error: msg, loading: false });
      return false;
    }
  },

  logout: () => {
    setAuthToken(null);
    storage.remove('token');
    storage.remove('user');
    storage.remove('is_onboarded');

    useTrainerStore.getState().resetUserData();

    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isOnboarded: false,
      error: null,
    });
  },

  submitOnboarding: async (payload: OnboardingPayload) => {
    set({ loading: true, error: null });
    try {
      const currentUser = get().user;
      const res = await submitOnboardingApi({
        ...payload,
        user_id: currentUser?.userId,
      });

      if (res.success) {
        const updatedUser: AuthUser = {
          userId: currentUser?.userId || '',
          email: currentUser?.email || '',
          fullName: payload.full_name,
          isOnboarded: true,
        };

        persist('user', updatedUser);
        persist('is_onboarded', true);

        // Update trainer store with initial calibrated profile & strategy
        const trainerStore = useTrainerStore.getState();
        trainerStore.loadUserData(updatedUser.userId);
        trainerStore.syncCurrentWeight(payload.current_weight_kg);
        if (res.strategy_profile) {
          trainerStore.setScheduleTargets(res.strategy_profile.schedule_targets);
          trainerStore.fetchStrategyProfile();
        }

        set({
          user: updatedUser,
          isOnboarded: true,
          loading: false,
        });
        return true;
      }
      return false;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Onboarding calibration failed.';
      set({ error: msg, loading: false });
      return false;
    }
  },
}));
