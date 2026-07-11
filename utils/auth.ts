import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';
const PROFILE_KEY = 'full_profile_data';
const SCHOOL_KEY = 'school_data';
// Short-lived server-side parent_session token issued by /parents/verify-otp.
// The backend now requires this on /parents/login-as-student and
// /parents/students; without it the endpoints respond 401. Lives 30 minutes
// server-side, so we don't need to extend it client-side.
const PARENT_TOKEN_KEY = 'parent_session_token';

export const saveToken = async (token: string) => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

export const getToken = async () => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

export const deleteToken = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error deleting token:', error);
  }
};

export const saveParentToken = async (token: string) => {
  try {
    await SecureStore.setItemAsync(PARENT_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving parent token:', error);
  }
};

export const getParentToken = async () => {
  try {
    return await SecureStore.getItemAsync(PARENT_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting parent token:', error);
    return null;
  }
};

export const deleteParentToken = async () => {
  try {
    await SecureStore.deleteItemAsync(PARENT_TOKEN_KEY);
  } catch (error) {
    console.error('Error deleting parent token:', error);
  }
};

export const saveUser = async (user: any) => {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user data:', error);
  }
};

export const getUser = async () => {
  try {
    const legacy = await SecureStore.getItemAsync(USER_KEY);
    if (legacy) {
      await AsyncStorage.setItem(USER_KEY, legacy);
      await SecureStore.deleteItemAsync(USER_KEY);
      return JSON.parse(legacy);
    }
    const user = await AsyncStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

export const saveFullProfile = async (profile: any) => {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Error saving full profile:', error);
  }
};

export const getFullProfile = async () => {
  try {
    const legacy = await SecureStore.getItemAsync(PROFILE_KEY);
    if (legacy) {
      await AsyncStorage.setItem(PROFILE_KEY, legacy);
      await SecureStore.deleteItemAsync(PROFILE_KEY);
      return JSON.parse(legacy);
    }
    const profile = await AsyncStorage.getItem(PROFILE_KEY);
    return profile ? JSON.parse(profile) : null;
  } catch (error) {
    console.error('Error getting full profile:', error);
    return null;
  }
};

export const clearFullProfile = async () => {
  try {
    await AsyncStorage.removeItem(PROFILE_KEY);
  } catch (error) {
    console.error('Error clearing full profile:', error);
  }
};

export const saveSchoolData = async (school: any) => {
  try {
    await AsyncStorage.setItem(SCHOOL_KEY, JSON.stringify(school));
  } catch (error) {
    console.error('Error saving school data:', error);
  }
};

export const getSchoolData = async () => {
  try {
    // Attempt to migrate from SecureStore if it exists
    const legacy = await SecureStore.getItemAsync(SCHOOL_KEY);
    if (legacy) {
        await AsyncStorage.setItem(SCHOOL_KEY, legacy);
        await SecureStore.deleteItemAsync(SCHOOL_KEY);
        return JSON.parse(legacy);
    }
    const school = await AsyncStorage.getItem(SCHOOL_KEY);
    return school ? JSON.parse(school) : null;
  } catch (error) {
    console.error('Error getting school data:', error);
    return null;
  }
};

import { apiCache } from './cache';

export const clearAuth = async () => {
  try {
    apiCache.clear();
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(PARENT_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    await AsyncStorage.removeItem(PROFILE_KEY);
    // Note: We intentionally don't clear SCHOOL_KEY here to maintain branding
  } catch (error) {
    console.error('Error clearing auth:', error);
  }
};
