import { create } from 'zustand';
import { createMMKV, type MMKV } from 'react-native-mmkv';
import { syncGymCheckIn } from '../api/coachApi';

const storage: MMKV = createMMKV({ id: 'fitmatrix-gym-checkin' });

export interface GymCheckInRecord {
  id: string;
  gymName: string;
  checkInTime: string; // ISO string
  checkOutTime?: string;
  durationMinutes?: number;
  date: string; // YYYY-MM-DD
}

interface GymCheckInState {
  activeCheckIn: GymCheckInRecord | null;
  history: GymCheckInRecord[];

  // Actions
  toggleCheckIn: (gymName?: string) => void;
  checkIn: (gymName?: string) => void;
  checkOut: () => void;
  getTodayCheckIn: () => GymCheckInRecord | null;
}

const loadHistoryFromStorage = (): GymCheckInRecord[] => {
  try {
    const raw = storage.getString('gym_checkin_history');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[useGymCheckInStore] Failed to load history from MMKV', e);
  }
  return [];
};

const loadActiveFromStorage = (): GymCheckInRecord | null => {
  try {
    const raw = storage.getString('active_gym_checkin');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[useGymCheckInStore] Failed to load active check-in from MMKV', e);
  }
  return null;
};

const saveToStorage = (history: GymCheckInRecord[], active: GymCheckInRecord | null) => {
  try {
    storage.set('gym_checkin_history', JSON.stringify(history));
    if (active) {
      storage.set('active_gym_checkin', JSON.stringify(active));
    } else {
      storage.remove('active_gym_checkin');
    }
  } catch (e) {
    console.warn('[useGymCheckInStore] Failed to persist to MMKV', e);
  }
};

export const useGymCheckInStore = create<GymCheckInState>((set, get) => ({
  activeCheckIn: loadActiveFromStorage(),
  history: loadHistoryFromStorage(),

  toggleCheckIn: (gymName = 'FitMatrix Partner Gym') => {
    const { activeCheckIn } = get();
    if (activeCheckIn) {
      get().checkOut();
    } else {
      get().checkIn(gymName);
    }
  },

  checkIn: (gymName = 'FitMatrix Partner Gym') => {
    const now = new Date();
    const newRecord: GymCheckInRecord = {
      id: `checkin_${Date.now()}`,
      gymName,
      checkInTime: now.toISOString(),
      date: now.toISOString().split('T')[0],
    };

    set(state => {
      saveToStorage(state.history, newRecord);
      return { activeCheckIn: newRecord };
    });

    syncGymCheckIn(newRecord).catch(err => {
      console.warn('[useGymCheckInStore] Background gym check-in sync failed:', err);
    });
  },

  checkOut: () => {
    const { activeCheckIn, history } = get();
    if (!activeCheckIn) return;

    const checkOutTime = new Date().toISOString();
    const duration = Math.max(
      1,
      Math.round(
        (new Date(checkOutTime).getTime() - new Date(activeCheckIn.checkInTime).getTime()) / 60000
      )
    );

    const completedRecord: GymCheckInRecord = {
      ...activeCheckIn,
      checkOutTime,
      durationMinutes: duration,
    };

    const updatedHistory = [completedRecord, ...history];
    saveToStorage(updatedHistory, null);
    set({ activeCheckIn: null, history: updatedHistory });

    syncGymCheckIn(completedRecord).catch(err => {
      console.warn('[useGymCheckInStore] Background gym check-out sync failed:', err);
    });
  },

  getTodayCheckIn: () => {
    const today = new Date().toISOString().split('T')[0];
    const { activeCheckIn, history } = get();
    if (activeCheckIn && activeCheckIn.date === today) {
      return activeCheckIn;
    }
    return history.find(h => h.date === today) || null;
  },
}));

export default useGymCheckInStore;
