/**
 * useTrainerStore.ts — FitMatrix Global State (Zustand + MMKV persistence)
 *
 * Architecture:
 * - Transient state (messages, loading): in-memory only — resets on app kill.
 * - Persistent state (userProfile, plan artifacts): MMKV — survives app restarts.
 */

import { create } from 'zustand';
import { createMMKV, type MMKV } from 'react-native-mmkv';
import {
  CoachResponse,
  UserProfile,
  DailyLog,
  ChatHistoryItem,
} from '../types/schema';
import { WorkoutPlan, DietPlan, SleepGoal } from '../types/plans';
import { HealthSnapshot } from '../services/healthService';
import { sendBiometricsAndMessage } from '../api/coachApi';
import {
  generateWorkoutPlan,
  generateDietPlan,
  generateSleepGoal,
} from '../api/agentClient';
import { getHealthSnapshot, refreshHealthSnapshot } from '../api/healthConnect';
import type { ChatMessage } from '../components/ChatView';

// Re-export ChatMessage so consumers can import from the store
export type { ChatMessage } from '../components/ChatView';

// ─── MMKV Instance ────────────────────────────────────────────────────────────

const storage: MMKV = createMMKV({ id: 'fitmatrix-store' });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function persist<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}

function hydrate<T>(key: string, fallback: T): T {
  const raw = storage.getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}


// ─── Store Interface ──────────────────────────────────────────────────────────

interface TrainerState {
  // ── Transient ──
  messages: ChatMessage[];
  loading: boolean;
  coachState: Partial<CoachResponse>;
  healthSnapshot: HealthSnapshot | null;
  healthLoading: boolean;
  planLoading: boolean;

  // ── Persistent (MMKV) ──
  userProfile: UserProfile;
  dailyLog: DailyLog;
  workoutPlan: WorkoutPlan | null;
  dietPlan: DietPlan | null;
  sleepGoal: SleepGoal | null;

  // ── Actions ──
  sendMessage: (text: string) => Promise<void>;
  generatePlan: (type: 'workout' | 'diet' | 'sleep') => Promise<void>;
  syncHealth: () => Promise<void>;
  refreshHealth: () => Promise<void>;
  setUserProfile: (profile: UserProfile) => void;
  resetChat: () => void;
}

// ─── Store Implementation ─────────────────────────────────────────────────────

export const useTrainerStore = create<TrainerState>((set, get) => ({
  // Transient defaults
  messages: [
    { sender: 'coach', text: 'FitMatrix initialized. How can I guide your training today?' },
  ],
  loading: false,
  coachState: { readiness_score: 80, fatigue_flag: 'nominal', prescribed_workout: null },
  healthSnapshot: null,
  healthLoading: false,
  planLoading: false,

  // Hydrate persistent state from MMKV on store creation
  userProfile: hydrate<UserProfile>('user_profile', {}),
  dailyLog: hydrate<DailyLog>('daily_log', {}),
  workoutPlan: hydrate<WorkoutPlan | null>('workout_plan', null),
  dietPlan: hydrate<DietPlan | null>('diet_plan', null),
  sleepGoal: hydrate<SleepGoal | null>('sleep_goal', null),

  // ── syncHealth: initial Health Connect read (uses cached result) ──
  syncHealth: async () => {
    set({ healthLoading: true });
    try {
      const snapshot = await getHealthSnapshot();
      set({ healthSnapshot: snapshot, healthLoading: false });
    } catch (err) {
      console.error('syncHealth failed:', err);
      set({ healthLoading: false });
    }
  },

  // ── refreshHealth: forced re-read (pull-to-refresh) ──
  refreshHealth: async () => {
    set({ healthLoading: true });
    try {
      const snapshot = await refreshHealthSnapshot();
      set({ healthSnapshot: snapshot, healthLoading: false });
    } catch (err) {
      console.error('refreshHealth failed:', err);
      set({ healthLoading: false });
    }
  },

  // ── sendMessage: conversational chat ──
  sendMessage: async (text: string) => {
    const { messages, coachState, userProfile, dailyLog, healthSnapshot } = get();

    const userMsg: ChatMessage = { sender: 'user', text };
    set({ loading: true, messages: [...messages, userMsg] });

    try {
      // Window history to last 2 turns; persistent context lives in userProfile
      const recentHistory: ChatHistoryItem[] = messages
        .slice(-2)
        .map(m => ({ role: m.sender as 'user' | 'coach', text: m.text }));

      const res = await sendBiometricsAndMessage({
        user_id: 'usr_dev_1',
        message: text,
        steps_today: healthSnapshot?.steps ?? 0,
        sleep_minutes: healthSnapshot?.sleepMinutes ?? 420,
        active_calories_burned: healthSnapshot?.activeCaloriesBurned ?? 0,
        resting_heart_rate_bpm: healthSnapshot?.restingHeartRateBpm ?? 0,
        logged_workouts: healthSnapshot?.workouts ?? [],
        history: recentHistory,
        readiness_score: coachState.readiness_score,
        prescribed_workout: coachState.prescribed_workout,
        user_profile: userProfile,
        daily_log: dailyLog,
      });

      const updatedProfile = res.user_profile ?? userProfile;
      const updatedLog = res.daily_log ?? dailyLog;
      persist('user_profile', updatedProfile);
      persist('daily_log', updatedLog);

      set(state => ({
        loading: false,
        messages: [...state.messages, { sender: 'coach', text: res.reply }],
        coachState: {
          readiness_score: res.readiness_score,
          fatigue_flag: res.fatigue_flag,
          prescribed_workout: res.prescribed_workout,
        },
        userProfile: updatedProfile,
        dailyLog: updatedLog,
      }));
    } catch (error: unknown) {
      let errorMsg = 'Error connecting to FitMatrix agent backend.';
      if (error && typeof error === 'object') {
        const e = error as Record<string, unknown>;
        if ((e.code === 'ECONNABORTED') || (typeof e.message === 'string' && e.message.includes('timeout'))) {
          errorMsg = 'Request timed out — the multi-agent chain is taking longer than expected. Please try again.';
        } else if (e.response) {
          const resp = e.response as Record<string, unknown>;
          const data = resp.data as Record<string, unknown> | undefined;
          errorMsg = `Server error: ${data?.detail ?? resp.status}`;
        } else if (e.request) {
          errorMsg = 'Cannot reach backend. Check that the server is running and adb reverse is active.';
        }
      }
      set(state => ({
        loading: false,
        messages: [...state.messages, { sender: 'coach', text: errorMsg }],
      }));
    }
  },

  // ── generatePlan: structured plan generation ──
  generatePlan: async (type: 'workout' | 'diet' | 'sleep') => {
    const { userProfile, dailyLog, healthSnapshot, coachState } = get();
    set({ planLoading: true });

    const planPayload = {
      user_id: 'usr_dev_1',
      steps_today: healthSnapshot?.steps ?? 0,
      sleep_minutes: healthSnapshot?.sleepMinutes ?? 420,
      active_calories_burned: healthSnapshot?.activeCaloriesBurned ?? 0,
      resting_heart_rate_bpm: healthSnapshot?.restingHeartRateBpm ?? 0,
      readiness_score: coachState.readiness_score,
      user_profile: userProfile as Record<string, unknown>,
      daily_log: dailyLog as Record<string, unknown>,
    };

    try {
      if (type === 'workout') {
        const plan = await generateWorkoutPlan(planPayload);
        persist('workout_plan', plan);
        set({ workoutPlan: plan, planLoading: false });
      } else if (type === 'diet') {
        const plan = await generateDietPlan(planPayload);
        persist('diet_plan', plan);
        set({ dietPlan: plan, planLoading: false });
      } else {
        const goal = await generateSleepGoal(planPayload);
        persist('sleep_goal', goal);
        set({ sleepGoal: goal, planLoading: false });
      }
    } catch (err) {
      console.error(`generatePlan(${type}) failed:`, err);
      set({ planLoading: false });
    }
  },

  // ── setUserProfile: called from ProfileScreen ──
  setUserProfile: (profile: UserProfile) => {
    persist('user_profile', profile);
    set({ userProfile: profile });
  },

  // ── resetChat: clears messages but keeps profile/plans ──
  resetChat: () => {
    set({
      messages: [{ sender: 'coach', text: 'FitMatrix initialized. How can I guide your training today?' }],
      coachState: { readiness_score: 80, fatigue_flag: 'nominal', prescribed_workout: null },
    });
  },
}));
