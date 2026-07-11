import * as SecureStore from 'expo-secure-store';

/**
 * High-performance Cache Utility for Student App
 * Prevents redundant API calls for data that changes infrequently.
 */

interface CacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_PREFIX = 'app_cache_';

/**
 * Save data to local cache
 * @param key Unique key for the endpoint
 * @param data The API response data
 */
export const setCache = async (key: string, data: any) => {
  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now()
    };
    await SecureStore.setItemAsync(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

/**
 * Get data from local cache
 * @param key Unique key for the endpoint
 * @param maxAge Max age in milliseconds (e.g., 3600000 for 1 hour)
 */
export const getCache = async (key: string, maxAge: number) => {
  try {
    const entryStr = await SecureStore.getItemAsync(`${CACHE_PREFIX}${key}`);
    if (!entryStr) return null;

    const entry: CacheEntry = JSON.parse(entryStr);
    const now = Date.now();

    // Check if cache is still fresh
    if (now - entry.timestamp < maxAge) {
      console.log(`📦 [Cache Hit] ${key}`);
      return entry.data;
    }
    
    console.log(`🕒 [Cache Stale] ${key}`);
    return null;
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
};

/**
 * Clear specific cache entry
 */
export const clearCache = async (key: string) => {
  try {
    await SecureStore.deleteItemAsync(`${CACHE_PREFIX}${key}`);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

/**
 * Cache Timing Presets (ms)
 */
export const CACHE_TIMES = {
  SUBJECTS: 3600000, // 1 Hour
  DOCUMENTS: 1800000, // 30 Minutes
  PROFILE: 900000,    // 15 Minutes
  TIMETABLE: 300000,  // 5 Minutes (Timetable can change during the day)
};
