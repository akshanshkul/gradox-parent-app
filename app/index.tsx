import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { APP_CONFIG } from '../constants';
import { getToken } from '../utils/auth';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedWelcome, setHasCompletedWelcome] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const token = await getToken();
      if (token) {
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    }
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  // If authenticated, go straight to dashboard
  if (isAuthenticated) {
    return <Redirect href="/(dashboard)" />;
  }

  if (!hasCompletedWelcome) {
    return <Redirect href="/welcome1" />;
  }

  // If Single School Mode, go straight to login with pre-configured params
  if (!APP_CONFIG.isGlobalApp) {
    return (
      <Redirect 
        href={{
          pathname: "/(auth)/login",
          params: { 
            schoolId: APP_CONFIG.defaultSchool.id,
            schoolSlug: APP_CONFIG.defaultSchool.slug,
            schoolName: APP_CONFIG.defaultSchool.name,
            logoPath: APP_CONFIG.defaultSchool.logo
          }
        }} 
      />
    );
  }

  return <Redirect href="/select-school" />;
}
