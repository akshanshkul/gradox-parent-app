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

  // Parents always go to the main login screen
  return <Redirect href="/(auth)/login" />;
}
