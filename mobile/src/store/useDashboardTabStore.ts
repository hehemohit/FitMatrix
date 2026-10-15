import { create } from 'zustand';
import { createMMKV, type MMKV } from 'react-native-mmkv';

export type DashboardTab = 'nutrition' | 'workout';

interface DashboardTabState {
  activeDashboard: DashboardTab;
  setActiveDashboard: (tab: DashboardTab) => void;
  toggleDashboard: () => void;
}

const storage: MMKV = createMMKV({ id: 'fitmatrix-dashboard-tab' });
const STORAGE_KEY = 'active_dashboard_tab';

export const useDashboardTabStore = create<DashboardTabState>((set, get) => ({
  activeDashboard: (storage.getString(STORAGE_KEY) as DashboardTab) || 'nutrition',

  setActiveDashboard: (tab: DashboardTab) => {
    storage.set(STORAGE_KEY, tab);
    set({ activeDashboard: tab });
  },

  toggleDashboard: () => {
    const nextTab: DashboardTab = get().activeDashboard === 'nutrition' ? 'workout' : 'nutrition';
    storage.set(STORAGE_KEY, nextTab);
    set({ activeDashboard: nextTab });
  },
}));
