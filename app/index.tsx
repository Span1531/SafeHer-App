// app/index.tsx
// ✅ Enhanced version with background shake detection

import { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Vibration } from 'react-native';
import { router } from 'expo-router';
import { authService } from '@/services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Shield } from 'lucide-react-native';
import { backgroundShakeService } from '@/services/backgroundShakeService';

export default function Index() {
  useEffect(() => {
    initializeApp();

    // Start background shake service
    (async () => {
      try {
        console.log('⚙️ Starting background shake service...');
        await backgroundShakeService.start();
      } catch (err) {
        console.error('❌ Failed to start background service:', err);
      }
    })();

    return () => {
      backgroundShakeService.stop();
    };
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing app...');

      const onboardingComplete = await AsyncStorage.getItem('onboardingComplete');
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');

      console.log('App state:', { onboardingComplete, hasLaunched });

      if (hasLaunched === null) {
        console.log('→ First launch, showing onboarding');
        await AsyncStorage.setItem('hasLaunched', 'true');
        router.replace('/auth/onboarding');
        return;
      }

      if (onboardingComplete !== 'true') {
        console.log('→ Onboarding not complete, checking auth...');
        const isAuthenticated = await authService.isAuthenticated();

        if (isAuthenticated) {
          console.log('→ Authenticated but no permissions, showing permissions screen');
          router.replace('/auth/permissions');
        } else {
          console.log('→ Not authenticated, showing login');
          router.replace('/auth/login');
        }
        return;
      }

      console.log('→ Onboarding complete, checking auth...');
      const isAuthenticated = await authService.isAuthenticated();

      if (isAuthenticated) {
        console.log('→ Authenticated, going to tabs');
        router.replace('/(tabs)');
      } else {
        console.log('→ Not authenticated, showing login');
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('❌ App initialization error:', error);
      router.replace('/auth/login');
    }
  };

  return (
    <View style={styles.container}>
      <Shield size={64} color="#DC2626" />
      <ActivityIndicator size="large" color="#DC2626" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loader: {
    marginTop: 20,
  },
});
