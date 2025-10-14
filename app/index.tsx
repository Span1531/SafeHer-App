import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, DeviceEventEmitter, ToastAndroid, Alert, AppState, NativeModules } from 'react-native';
import { router } from 'expo-router';
import { authService } from '@/services/authService';
import { emergencyService } from '@/services/emergencyService';
import { initDB } from '@/services/sqliteService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Shield } from 'lucide-react-native';

const { ShakeControlModule } = NativeModules;

export default function Index() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initDB().catch(err => console.error('Failed to init DB:', err));

    const setupListeners = () => {
      const emergencySubscription = DeviceEventEmitter.addListener(
        'onEmergencyConfirmed', 
        handleEmergencySmsDispatch
      );
      
      let warningSubscription = { remove: () => {} };
      if (Platform.OS === 'android') {
        warningSubscription = DeviceEventEmitter.addListener('onShakeWarning', () => {
          ToastAndroid.show('Shake Detected! Confirm in notification.', ToastAndroid.LONG);
        });
      }
      return { emergencySubscription, warningSubscription };
    };

    let { emergencySubscription, warningSubscription } = setupListeners();

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        emergencySubscription?.remove();
        warningSubscription?.remove();
        const listeners = setupListeners();
        emergencySubscription = listeners.emergencySubscription;
        warningSubscription = listeners.warningSubscription;
      }
    });

    initializeApp();

    return () => {
      emergencySubscription?.remove();
      warningSubscription?.remove();
      appStateSubscription?.remove();
    };
  }, []);

  const handleEmergencySmsDispatch = async () => {
    console.log('🚨 EVENT RECEIVED: User confirmed SOS! Acknowledging and sending SMS...');

    if (ShakeControlModule && ShakeControlModule.acknowledgeEmergencyEvent) {
        ShakeControlModule.acknowledgeEmergencyEvent();
    }
    
    const result = await emergencyService.sendEmergencyAlert();
    
    if (result.success) {
      Alert.alert('✅ Alert Sent', `Emergency alert sent to ${result.sentTo} contacts!`);
    } else {
      Alert.alert('❌ Alert Failed', result.error || 'Failed to send emergency alert.');
    }
  };

  const initializeApp = async () => {
    try {
      const onboardingComplete = await AsyncStorage.getItem('onboardingComplete');
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      
      if (hasLaunched === null) {
        await AsyncStorage.setItem('hasLaunched', 'true');
        router.replace('/auth/onboarding');
        return;
      }

      const isAuthenticated = await authService.isAuthenticated();
      
      if (onboardingComplete !== 'true') {
        if (isAuthenticated) {
          router.replace('/auth/permissions');
        } else {
          router.replace('/auth/login');
        }
        return;
      }

      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('❌ App initialization error:', error);
      router.replace('/auth/login');
    } finally {
      setIsReady(true);
    }
  };

  if (!isReady) {
    return (
      <View style={styles.container}>
        <Shield size={64} color="#DC2626" />
        <ActivityIndicator size="large" color="#DC2626" style={styles.loader} />
      </View>
    );
  }
  
  return null;
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