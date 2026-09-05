/**
 * healthConnect.ts — Singleton Health Connect cache layer
 *
 * Prevents redundant Health Connect reads on every screen mount.
 * All screens call getHealthSnapshot() — the first caller triggers
 * a real read; subsequent callers in the same session get the cached result.
 *
 * Call refreshHealthSnapshot() explicitly (e.g. Dashboard pull-to-refresh)
 * to force a new HC read.
 */

import { syncHealthConnectData, HealthSnapshot } from '../services/healthService';

let _cache: HealthSnapshot | null = null;
let _fetchPromise: Promise<HealthSnapshot> | null = null;

export const getHealthSnapshot = async (): Promise<HealthSnapshot> => {
  if (_cache) {
    return _cache;
  }
  // Deduplicate concurrent callers — only one network read in flight at a time
  if (!_fetchPromise) {
    _fetchPromise = syncHealthConnectData().then(snapshot => {
      _cache = snapshot;
      _fetchPromise = null;
      return snapshot;
    }).catch(err => {
      _fetchPromise = null;
      throw err;
    });
  }
  return _fetchPromise;
};

export const refreshHealthSnapshot = async (): Promise<HealthSnapshot> => {
  _cache = null;
  _fetchPromise = null;
  return getHealthSnapshot();
};

export const clearHealthCache = () => {
  _cache = null;
  _fetchPromise = null;
};
