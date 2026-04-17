import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  
  if (!projectId) {
    console.warn('EAS Project ID not found. Ensure you have a projectId in app.json or run "eas project:init".');
    return null;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId
    })).data;

    console.log('Expo Push Token:', token);
    
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Send token to backend
    try {
      await api.post('/students/device-token', { token });
      console.log('Push token saved to backend');
    } catch (error) {
      console.error('Failed to save push token', error);
    }

    return token;
  } catch (err) {
    console.warn('Could not get Expo Push Token. Note: Push notifications are not supported in Expo Go on SDK 53+.', err);
    return null;
  }
}

export function setupNotificationHandlers() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}
