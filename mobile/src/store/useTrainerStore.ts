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
  StrategyProfile,
  DayMacroTarget,
  GoalType,
  CoachingMode,
  DietStyle,
  ProteinPreference,
  CheckInResult,
} from '../types/schema';
import { WorkoutPlan, DietPlan, SleepGoal } from '../types/plans';
import { HealthSnapshot } from '../services/healthService';
import {
  sendBiometricsAndMessage,
  computeReadiness,
  logMealToServer,
  getTodayNutrition,
  syncProfileToServer,
  logWeighIn,
  getTodayFitness,
  getHabitsHistory,
  logFitnessMeal,
  getStrategyProfile,
  updateStrategyGoal,
  updateStrategyMode,
  updateDietStyle as apiUpdateDietStyle,
  updateScheduleTargets as apiUpdateScheduleTargets,
  updateManualTargets as apiUpdateManualTargets,
  performWeeklyCheckIn as apiPerformWeeklyCheckIn,
} from '../api/coachApi';
import type { MealItem } from '../api/coachApi';
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

function getActiveUserId(): string {
  const raw = storage.getString('user');
  if (raw) {
    try {
      const u = JSON.parse(raw);
      if (u?.userId) return u.userId;
    } catch {}
  }
  return 'usr_dev_1';
}


// ─── Store Interface ──────────────────────────────────────────────────────────

interface MetabolicTargets {
  bmr: number;
  tdee: number;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fats_g: number;
}

export interface WeighInRecord {
  date: string;
  weightKg: number;
}

interface TrainerState {
  // ── Transient ──
  messages: ChatMessage[];
  loading: boolean;
  coachState: Partial<CoachResponse>;
  healthSnapshot: HealthSnapshot | null;
  healthLoading: boolean;
  readinessLoading: boolean;
  planLoading: boolean;
  mealLoading: boolean;

  // ── Nutrition ──
  todayMeals: MealItem[];

  // ── Habits (Dynamic 28-Day Consistency) ──
  weighInHistory: boolean[];
  weighInStat: string;
  foodLogHistory: boolean[];
  foodLogStat: string;
  weighInRecords: WeighInRecord[];

  // ── Persistent (MMKV) ──
  userProfile: UserProfile;
  dailyLog: DailyLog;
  metabolicTargets: MetabolicTargets;
  workoutPlan: WorkoutPlan | null;
  dietPlan: DietPlan | null;
  sleepGoal: SleepGoal | null;

  // ── Strategy Command Center ──
  strategyLoading: boolean;
  checkInLoading: boolean;
  lastCheckInResult: CheckInResult | null;
  checkInModalVisible: boolean;
  strategyProfile: StrategyProfile | null;

  // ── Actions ──
  sendMessage: (text: string, contextDomain?: string) => Promise<void>;
  generatePlan: (type: 'workout' | 'diet' | 'sleep') => Promise<boolean>;
  syncHealth: () => Promise<void>;
  refreshHealth: () => Promise<void>;
  setUserProfile: (profile: UserProfile) => void;
  saveProfile: (profile: UserProfile) => Promise<void>;
  logMeal: (meal: MealItem) => Promise<void>;
  syncTodayNutrition: () => Promise<void>;
  syncHabitsHistory: () => Promise<void>;
  weighIn: (weightKg: number) => Promise<void>;
  syncCurrentWeight: (weightKg: number) => void;
  resetChat: () => void;

  // Strategy Actions
  fetchStrategyProfile: () => Promise<void>;
  updateGoal: (params: {
    goal_type: GoalType;
    target_weight_kg: number;
    starting_weight_kg?: number;
    current_weight_kg?: number;
    weekly_rate_percent: number;
  }) => Promise<void>;
  setCoachingMode: (mode: CoachingMode) => Promise<void>;
  setDietStyle: (params: {
    diet_style: DietStyle;
    protein_preference?: ProteinPreference;
    use_day_variation?: boolean;
    training_days?: string[];
  }) => Promise<void>;
  setScheduleTargets: (schedule: DayMacroTarget[]) => Promise<void>;
  setManualTargets: (targets: {
    target_calories: number;
    target_protein_g: number;
    target_carbs_g: number;
    target_fats_g: number;
  }) => Promise<void>;
  runWeeklyCheckIn: () => Promise<CheckInResult | null>;
  setCheckInModalVisible: (visible: boolean) => void;
}

// ─── Store Implementation ─────────────────────────────────────────────────────

export const useTrainerStore = create<TrainerState>((set, get) => ({
  // Transient defaults
  messages: [
    { sender: 'coach', text: 'FitMatrix initialized. How can I guide your training today?' },
  ],
  loading: false,
  mealLoading: false,
  coachState: { readiness_score: null as unknown as number, fatigue_flag: null, prescribed_workout: null },
  healthSnapshot: null,
  healthLoading: false,
  readinessLoading: false,
  planLoading: false,
  todayMeals: [],
  strategyLoading: false,
  checkInLoading: false,
  lastCheckInResult: null,
  checkInModalVisible: false,

  // Hydrate persistent state from MMKV on store creation
  weighInHistory: hydrate<boolean[]>('weigh_in_history', Array(28).fill(false)),
  weighInStat: hydrate<string>('weigh_in_stat', '0/7'),
  foodLogHistory: hydrate<boolean[]>('food_log_history', Array(28).fill(false)),
  foodLogStat: hydrate<string>('food_log_stat', '0/7'),
  weighInRecords: hydrate<WeighInRecord[]>('weigh_in_records', []),

  userProfile: hydrate<UserProfile>('user_profile', {}),
  dailyLog: hydrate<DailyLog>('daily_log', {}),
  metabolicTargets: hydrate<MetabolicTargets>('metabolic_targets', {
    bmr: 0, tdee: 0,
    target_calories: 2400,
    target_protein_g: 160,
    target_carbs_g: 250,
    target_fats_g: 70,
  }),
  workoutPlan: hydrate<WorkoutPlan | null>('workout_plan', null),
  dietPlan: hydrate<DietPlan | null>('diet_plan', null),
  sleepGoal: hydrate<SleepGoal | null>('sleep_goal', null),
  strategyProfile: hydrate<StrategyProfile | null>('strategy_profile', null),

  // ── _applyReadiness: fires /api/v1/readiness from a fresh snapshot ──
  // Internal helper — always call after updating healthSnapshot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _applyReadiness: async (snapshot: HealthSnapshot) => {
    set({ readinessLoading: true });
    try {
      const result = await computeReadiness(
        snapshot.steps,
        snapshot.sleepMinutes > 0 ? snapshot.sleepMinutes : 420,
        snapshot.activeCaloriesBurned,
        snapshot.restingHeartRateBpm,
      );
      set(state => ({
        readinessLoading: false,
        coachState: {
          ...state.coachState,
          readiness_score: result.readiness_score,
          fatigue_flag: result.fatigue_flag,
        },
      }));
    } catch (err) {
      // Backend unreachable — degrade gracefully, compute dynamically
      console.warn('Readiness endpoint unavailable, computing locally:', err);
      const sleepMins = snapshot.sleepMinutes || 420;
      let sleepPts = 35;
      if (sleepMins < 360) {
        sleepPts = Math.max(10, Math.round((sleepMins / 360.0) * 35));
      } else if (sleepMins <= 510) {
        sleepPts = 35 + Math.round(((sleepMins - 360) / 150.0) * 15);
      } else {
        sleepPts = 46;
      }

      let rhrPts = 22;
      const rhr = snapshot.restingHeartRateBpm;
      if (rhr > 0) {
        if (rhr < 58) rhrPts = 30;
        else if (rhr <= 68) rhrPts = 26;
        else if (rhr <= 78) rhrPts = 18;
        else rhrPts = 10;
      }

      let actPts = 20;
      if (snapshot.steps < 2500) actPts = 14;
      else if (snapshot.steps > 16000) actPts = 8;
      else if (snapshot.steps > 12000) actPts = 16;

      let score = sleepPts + rhrPts + actPts;
      score = Math.max(20, Math.min(99, score));
      set(state => ({
        readinessLoading: false,
        coachState: {
          ...state.coachState,
          readiness_score: score,
          fatigue_flag: score < 60 ? 'high_fatigue' : 'nominal',
        },
      }));
    }
  },

  // ── syncHealth: initial Health Connect read (uses cached result) ──
  syncHealth: async () => {
    set({ healthLoading: true });
    try {
      const snapshot = await getHealthSnapshot();
      set({ healthSnapshot: snapshot, healthLoading: false });
      // Immediately compute live readiness from real biometrics
      await (get() as any)._applyReadiness(snapshot);
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
      // Immediately compute live readiness from fresh biometrics
      await (get() as any)._applyReadiness(snapshot);
    } catch (err) {
      console.error('refreshHealth failed:', err);
      set({ healthLoading: false });
    }
  },

  // ── sendMessage: conversational chat ──
  sendMessage: async (text: string, contextDomain?: string) => {
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
        sleep_minutes: (healthSnapshot?.sleepMinutes && healthSnapshot.sleepMinutes > 0) ? healthSnapshot.sleepMinutes : 420,
        active_calories_burned: healthSnapshot?.activeCaloriesBurned ?? 0,
        resting_heart_rate_bpm: healthSnapshot?.restingHeartRateBpm ?? 0,
        logged_workouts: healthSnapshot?.workouts ?? [],
        history: recentHistory,
        readiness_score: coachState.readiness_score,
        prescribed_workout: coachState.prescribed_workout,
        user_profile: userProfile,
        daily_log: dailyLog,
        context_domain: contextDomain,
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
      sleep_minutes: (healthSnapshot?.sleepMinutes && healthSnapshot.sleepMinutes > 0) ? healthSnapshot.sleepMinutes : 420,
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
      return true;
    } catch (err) {
      console.error(`generatePlan(${type}) failed:`, err);
      set({ planLoading: false });
      return false;
    }
  },

  // ── setUserProfile: called from ProfileScreen (local only) ──
  setUserProfile: (profile: UserProfile) => {
    persist('user_profile', profile);
    set({ userProfile: profile });
  },

  // ── saveProfile: syncs to MongoDB Atlas and receives computed macro targets ──
  saveProfile: async (profile: UserProfile) => {
    persist('user_profile', profile);
    set({ userProfile: profile });
    try {
      const res = await syncProfileToServer(profile as Record<string, unknown>);
      if (res?.targets) {
        const targets = {
          bmr: res.targets.bmr,
          tdee: res.targets.tdee,
          target_calories: res.targets.target_calories,
          target_protein_g: res.targets.target_protein_g,
          target_carbs_g: res.targets.target_carbs_g,
          target_fats_g: res.targets.target_fats_g,
        };
        persist('metabolic_targets', targets);
        // Also update user_profile with server-computed targets for MacroCard
        const updatedProfile = {
          ...profile,
          target_calories: res.targets.target_calories,
          target_protein_g: res.targets.target_protein_g,
        };
        persist('user_profile', updatedProfile);
        set({ metabolicTargets: targets, userProfile: updatedProfile });
      }
    } catch (err) {
      console.warn('[saveProfile] Server sync failed (offline?). Local state saved:', err);
    }
  },

  // ── logMeal: optimistic UI update + MMKV + MongoDB Atlas background sync ──
  logMeal: async (meal: MealItem) => {
    set({ mealLoading: true });

    // 1. Optimistic local update (instant UI feedback)
    const currentLog = get().dailyLog;
    const newCalories = (currentLog.calories_logged ?? 0) + meal.calories;
    const newProtein = (currentLog.protein_logged_g ?? 0) + meal.protein_g;
    const updatedLog: DailyLog = {
      ...currentLog,
      calories_logged: newCalories,
      protein_logged_g: newProtein,
    };
    const updatedMeals = [...get().todayMeals, meal];

    // Optimistically activate today's dot in foodLogHistory (last element)
    const currentFoodHistory = [...get().foodLogHistory];
    if (currentFoodHistory.length > 0) {
      currentFoodHistory[currentFoodHistory.length - 1] = true;
    }
    const foodCount = currentFoodHistory.slice(-7).filter(Boolean).length;
    const newFoodStat = `${foodCount}/7`;

    persist('daily_log', updatedLog);
    persist('food_log_history', currentFoodHistory);
    persist('food_log_stat', newFoodStat);

    // Record to smart frequent foods tracker
    try {
      const { recordLoggedFood } = require('../services/nutritionOfflineStorage');
      recordLoggedFood(meal);
    } catch (e) {
      // safe fallback
    }

    set({
      dailyLog: updatedLog,
      todayMeals: updatedMeals,
      foodLogHistory: currentFoodHistory,
      foodLogStat: newFoodStat,
      mealLoading: false,
    });

    // 2. Background sync to MongoDB Atlas
    try {
      const serverDay = await logFitnessMeal('usr_dev_1', meal);
      const reconciledLog: DailyLog = {
        ...get().dailyLog,
        calories_logged: serverDay.total_calories_consumed,
        protein_logged_g: serverDay.total_protein_g,
      };
      persist('daily_log', reconciledLog);
      set({ dailyLog: reconciledLog, todayMeals: serverDay.meals });
    } catch (err) {
      console.warn('[logMeal] Server sync failed (offline?). Local state preserved:', err);
    }
  },

  // ── syncHabitsHistory: queries 28-day habits consistency for Weigh-In and Food Logging ──
  syncHabitsHistory: async () => {
    try {
      const habits = await getHabitsHistory('usr_dev_1', 28);
      persist('weigh_in_history', habits.weigh_in_history);
      persist('weigh_in_stat', habits.weigh_in_stat);
      persist('food_log_history', habits.food_log_history);
      persist('food_log_stat', habits.food_log_stat);
      set({
        weighInHistory: habits.weigh_in_history,
        weighInStat: habits.weigh_in_stat,
        foodLogHistory: habits.food_log_history,
        foodLogStat: habits.food_log_stat,
      });
    } catch (err) {
      console.warn('[syncHabitsHistory] Error:', err);
    }
  },

  // ── syncTodayNutrition: fetches today's unified fitness doc + habits on app open ──
  syncTodayNutrition: async () => {
    try {
      const todayData = await getTodayFitness('usr_dev_1');
      const updatedLog: DailyLog = {
        ...get().dailyLog,
        calories_logged: todayData.total_calories_consumed,
        protein_logged_g: todayData.total_protein_g,
      };
      persist('daily_log', updatedLog);
      set({ dailyLog: updatedLog, todayMeals: todayData.meals });

      // Reconcile habits history
      get().syncHabitsHistory();
    } catch (err) {
      console.warn('[syncTodayNutrition] Could not fetch from server. Using local log:', err);
    }
  },

  // ── syncCurrentWeight: single source of truth for body weight ──
  syncCurrentWeight: (weightKg: number) => {
    const state = get();
    const updatedProfile = { ...state.userProfile, weight_kg: weightKg };
    persist('user_profile', updatedProfile);

    let updatedStrategy = state.strategyProfile;
    if (updatedStrategy) {
      const curGoal = updatedStrategy.goal_type;
      const targetWeight = updatedStrategy.target_weight_kg;
      const ratePct = updatedStrategy.weekly_rate_percent || -0.75;

      const rateSign = curGoal === 'fat_loss' ? -1.0 : 1.0;
      const weeklyDeltaKg = curGoal === 'maintenance'
        ? 0.0
        : Math.round(rateSign * (weightKg * (Math.abs(ratePct) / 100)) * 100) / 100;

      const weightGap = Math.abs(targetWeight - weightKg);
      const weeksToGoal = (curGoal === 'maintenance' || Math.abs(weeklyDeltaKg) < 0.01 || weightGap < 0.1)
        ? 0.0
        : Math.round((weightGap / Math.abs(weeklyDeltaKg)) * 10) / 10;

      let estDate: string | null = null;
      if (weeksToGoal > 0) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + Math.round(weeksToGoal * 7));
        estDate = targetDate.toISOString().split('T')[0];
      }

      updatedStrategy = {
        ...updatedStrategy,
        current_weight_kg: weightKg,
        weekly_weight_delta_kg: weeklyDeltaKg,
        weeks_to_goal: weeksToGoal,
        estimated_completion_date: estDate,
      };
      persist('strategy_profile', updatedStrategy);
    }

    set({
      userProfile: updatedProfile,
      strategyProfile: updatedStrategy,
    });
  },

  // ── weighIn: optimistic update + MMKV + MongoDB Atlas background sync ──
  weighIn: async (weightKg: number) => {
    // 1. Sync weight across both userProfile and strategyProfile instantly
    get().syncCurrentWeight(weightKg);

    // 2. Optimistically activate today's dot in weighInHistory (last element)
    const currentWeighHistory = [...get().weighInHistory];
    if (currentWeighHistory.length > 0) {
      currentWeighHistory[currentWeighHistory.length - 1] = true;
    }
    const weighCount = currentWeighHistory.slice(-7).filter(Boolean).length;
    const newWeighStat = `${weighCount}/7`;

    persist('weigh_in_history', currentWeighHistory);
    persist('weigh_in_stat', newWeighStat);

    // 3. Record timestamped weigh-in into weighInRecords
    const todayStr = new Date().toISOString().split('T')[0];
    const prevRecords = get().weighInRecords || [];
    const filteredRecords = prevRecords.filter(r => r.date !== todayStr);
    const updatedRecords = [...filteredRecords, { date: todayStr, weightKg }].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    persist('weigh_in_records', updatedRecords);

    set({
      weighInHistory: currentWeighHistory,
      weighInStat: newWeighStat,
      weighInRecords: updatedRecords,
    });

    try {
      await logWeighIn(getActiveUserId(), weightKg);
    } catch (err) {
      console.warn('[weighIn] Server sync failed (offline?):', err);
    }
  },

  // ── resetChat: clears messages but keeps profile/plans ──
  resetChat: () => {
    set({
      messages: [{ sender: 'coach', text: 'FitMatrix initialized. How can I guide your training today?' }],
      coachState: { readiness_score: 80, fatigue_flag: 'nominal', prescribed_workout: null },
    });
  },

  // ── Strategy Command Center Actions ──

  fetchStrategyProfile: async () => {
    set({ strategyLoading: true });
    try {
      const activeId = getActiveUserId();
      const profile = await getStrategyProfile(activeId);
      if (profile) {
        const localUserWeight = get().userProfile?.weight_kg;
        if (localUserWeight && Math.abs(localUserWeight - profile.current_weight_kg) > 0.05) {
          profile.current_weight_kg = localUserWeight;
        }
        persist('strategy_profile', profile);
        const updatedTargets: MetabolicTargets = {
          ...get().metabolicTargets,
          tdee: profile.current_expenditure_tdee,
          target_calories: profile.target_calories,
          target_protein_g: profile.target_protein_g,
          target_carbs_g: profile.target_carbs_g,
          target_fats_g: profile.target_fats_g,
        };
        persist('metabolic_targets', updatedTargets);
        set({ strategyProfile: profile, metabolicTargets: updatedTargets });
      }
    } catch (err) {
      console.warn('[fetchStrategyProfile] Failed to fetch strategy profile:', err);
    } finally {
      set({ strategyLoading: false });
    }
  },

  updateGoal: async (params) => {
    set({ strategyLoading: true });
    try {
      const updated = await updateStrategyGoal(params);
      persist('strategy_profile', updated);
      const updatedTargets: MetabolicTargets = {
        ...get().metabolicTargets,
        target_calories: updated.target_calories,
        target_protein_g: updated.target_protein_g,
        target_carbs_g: updated.target_carbs_g,
        target_fats_g: updated.target_fats_g,
      };
      persist('metabolic_targets', updatedTargets);
      set({ strategyProfile: updated, metabolicTargets: updatedTargets });
    } catch (err) {
      console.warn('[updateGoal] Failed to update goal:', err);
    } finally {
      set({ strategyLoading: false });
    }
  },

  setCoachingMode: async (mode: CoachingMode) => {
    set({ strategyLoading: true });
    const cur = get().strategyProfile;
    if (cur) {
      const optimistic = { ...cur, coaching_mode: mode };
      set({ strategyProfile: optimistic });
    }
    try {
      const updated = await updateStrategyMode(getActiveUserId(), mode);
      persist('strategy_profile', updated);
      set({ strategyProfile: updated });
    } catch (err) {
      console.warn('[setCoachingMode] Error updating coaching mode:', err);
    } finally {
      set({ strategyLoading: false });
    }
  },

  setDietStyle: async (params) => {
    set({ strategyLoading: true });
    try {
      const updated = await apiUpdateDietStyle({
        ...params,
        userId: getActiveUserId(),
      });
      persist('strategy_profile', updated);
      const updatedTargets: MetabolicTargets = {
        ...get().metabolicTargets,
        target_calories: updated.target_calories,
        target_protein_g: updated.target_protein_g,
        target_carbs_g: updated.target_carbs_g,
        target_fats_g: updated.target_fats_g,
      };
      persist('metabolic_targets', updatedTargets);
      set({ strategyProfile: updated, metabolicTargets: updatedTargets });
    } catch (err) {
      console.warn('[setDietStyle] Failed to update diet style:', err);
    } finally {
      set({ strategyLoading: false });
    }
  },

  setScheduleTargets: async (schedule: DayMacroTarget[]) => {
    set({ strategyLoading: true });
    const cur = get().strategyProfile;
    if (cur) {
      const optimistic = { ...cur, schedule_targets: schedule };
      set({ strategyProfile: optimistic });
    }
    try {
      const updated = await apiUpdateScheduleTargets(getActiveUserId(), schedule);
      persist('strategy_profile', updated);
      set({ strategyProfile: updated });
    } catch (err) {
      console.warn('[setScheduleTargets] Failed to update schedule:', err);
    } finally {
      set({ strategyLoading: false });
    }
  },

  setManualTargets: async (targets) => {
    set({ strategyLoading: true });
    try {
      const updated = await apiUpdateManualTargets(getActiveUserId(), targets);
      persist('strategy_profile', updated);
      const updatedTargets: MetabolicTargets = {
        ...get().metabolicTargets,
        target_calories: targets.target_calories,
        target_protein_g: targets.target_protein_g,
        target_carbs_g: targets.target_carbs_g,
        target_fats_g: targets.target_fats_g,
      };
      persist('metabolic_targets', updatedTargets);
      set({ strategyProfile: updated, metabolicTargets: updatedTargets });
    } catch (err) {
      console.warn('[setManualTargets] Failed to update manual targets:', err);
    } finally {
      set({ strategyLoading: false });
    }
  },

  runWeeklyCheckIn: async () => {
    set({ checkInLoading: true });
    try {
      const res = await apiPerformWeeklyCheckIn(getActiveUserId());
      if (res && res.success && res.updated_profile) {
        persist('strategy_profile', res.updated_profile);
        const updatedTargets: MetabolicTargets = {
          ...get().metabolicTargets,
          tdee: res.new_expenditure,
          target_calories: res.new_targets.calories,
          target_protein_g: res.new_targets.protein_g,
          target_carbs_g: res.new_targets.carbs_g,
          target_fats_g: res.new_targets.fats_g,
        };
        persist('metabolic_targets', updatedTargets);
        set({
          strategyProfile: res.updated_profile,
          metabolicTargets: updatedTargets,
          lastCheckInResult: res,
          checkInModalVisible: true,
        });
      }
      return res;
    } catch (err) {
      console.warn('[runWeeklyCheckIn] Check-in failed:', err);
      return null;
    } finally {
      set({ checkInLoading: false });
    }
  },

  setCheckInModalVisible: (visible: boolean) => {
    set({ checkInModalVisible: visible });
  },
}));
