import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

/**
 * LAZY LOAD Notifications to prevent SDK 53 crash in Expo Go
 */
const getNotifications = () => {
    if (Constants.appOwnership === 'expo') return null;
    try {
        return require('expo-notifications');
    } catch (e) {
        return null;
    }
};

export async function registerForPushNotificationsAsync() {
  // 1. SILENT EXIT for Expo Go - This prevents the Side-Effect crash
  if (Constants.appOwnership === 'expo' && !Device.isDevice) {
    return null;
  }

  const Notifications = getNotifications();
  if (!Notifications) {
    return null;
  }

  if (!Device.isDevice) {
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // 2. Fetch NATIVE Device Token (Direct FCM)
    const token = (await Notifications.getDevicePushTokenAsync()).data;
    console.log('Native FCM Token:', token);
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('high-priority', {
        name: 'School Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4f46e5',
        showBadge: true,
      });
    }

    // 3. Sync token with backend (only if logged in and not synced recently)
    try {
      const { getToken } = require('./auth');
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const apiToken = await getToken();
      
      if (apiToken) {
        const LAST_SYNC_KEY = 'last_fcm_sync_time';
        const LAST_TOKEN_KEY = 'last_fcm_token';
        
        const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
        const lastToken = await AsyncStorage.getItem(LAST_TOKEN_KEY);
        const now = Date.now();
        
        // Only sync if token changed OR 24 hours passed
        if (token !== lastToken || !lastSync || now - parseInt(lastSync) > 86400000) {
          await api.post('/students/device-token', { token: token });
          await AsyncStorage.setItem(LAST_SYNC_KEY, now.toString());
          await AsyncStorage.setItem(LAST_TOKEN_KEY, token);
          console.log('FCM: Token synced successfully (Fresh Sync)');
        } else {
          console.log('FCM: Token already up-to-date (Skipping Sync)');
        }
      }
    } catch (error) {
       console.warn('FCM: Sync failed', error);
    }

    return token;
  } catch (err) {
    console.warn('FCM: Registration failed', err);
    return null;
  }
}

export function setupNotificationHandlers() {
  const Notifications = getNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
