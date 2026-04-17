import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { 
  useFonts, 
  Inter_400Regular, 
  Inter_500Medium, 
  Inter_600SemiBold, 
  Inter_700Bold 
} from '@expo-google-fonts/inter';
import { useEffect } from 'react';
import { APP_CONFIG } from '../constants';
import { getSchoolData, saveSchoolData } from '../utils/auth';
import axios from 'axios';
import { API_BASE_URL } from '../constants';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    async function initialize() {
      // 1. Handle School Branding for Single-School Mode
      if (!APP_CONFIG.isGlobalApp && APP_CONFIG.defaultSchool.slug) {
        try {
          const cachedSchool = await getSchoolData();
          
          // Fetch if no cache OR if slug in .env changed
          if (!cachedSchool || cachedSchool.slug !== APP_CONFIG.defaultSchool.slug) {
            console.log('Fetching fresh school branding for:', APP_CONFIG.defaultSchool.slug);
            const response = await axios.get(`${API_BASE_URL}/school/public?slug=${APP_CONFIG.defaultSchool.slug}`);
            const school = response.data.data;
            if (school) {
              await saveSchoolData({
                id: school.id,
                name: school.name,
                slug: school.slug,
                logo: school.logo_path,
                theme_color: school.theme_color
              });
            }
          }
        } catch (err) {
          console.error('Failed to pre-fetch school branding', err);
        }
      }

      // 2. Hide Splash Screen once fonts AND branding (if needed) are ready
      if (loaded || error) {
        await SplashScreen.hideAsync();
      }
    }

    initialize();
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
        }}
      />
    </SafeAreaProvider>
  );
}
