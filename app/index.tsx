// app/index.tsx
// FIXED VERSION - Properly checks onboarding completion

import { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { authService } from '@/services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Shield } from 'lucide-react-native';

export default function Index() {
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing app...');
      
      // Check if onboarding is complete
      const onboardingComplete = await AsyncStorage.getItem('onboardingComplete');
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      
      console.log('App state:', { onboardingComplete, hasLaunched });

      // First time user - show onboarding
      if (hasLaunched === null) {
        console.log('→ First launch, showing onboarding');
        await AsyncStorage.setItem('hasLaunched', 'true');
        router.replace('/auth/onboarding');
        return;
      }

      // Check if user completed onboarding
      if (onboardingComplete !== 'true') {
        console.log('→ Onboarding not complete, checking auth...');
        
        // Check if authenticated
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

      // Onboarding complete - check authentication
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