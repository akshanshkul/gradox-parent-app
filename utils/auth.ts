import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';
const SCHOOL_KEY = 'school_data';

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

export const saveUser = async (user: any) => {
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user data:', error);
  }
};

export const getUser = async () => {
  try {
    const user = await SecureStore.getItemAsync(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

export const saveSchoolData = async (school: any) => {
  try {
    await SecureStore.setItemAsync(SCHOOL_KEY, JSON.stringify(school));
  } catch (error) {
    console.error('Error saving school data:', error);
  }
};

export const getSchoolData = async () => {
  try {
    const school = await SecureStore.getItemAsync(SCHOOL_KEY);
    return school ? JSON.parse(school) : null;
  } catch (error) {
    console.error('Error getting school data:', error);
    return null;
  }
};

export const clearAuth = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    // Note: We intentionally don't clear SCHOOL_KEY here to maintain branding
  } catch (error) {
    console.error('Error clearing auth:', error);
  }
};
