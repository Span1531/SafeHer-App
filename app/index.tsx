import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, DeviceEventEmitter, ToastAndroid, Alert } from 'react-native';
import { router } from 'expo-router';
import { authService } from '@/services/authService';
import { emergencyService } from '@/services/emergencyService';
import { initDB } from '@/services/sqliteService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Shield } from 'lucide-react-native';

export default function Index() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize SQLite database
    initDB().catch(err => console.error('Failed to init DB:', err));

    // Setup event listeners
    const smsSubscription = DeviceEventEmitter.addListener('onEmergencyConfirmed', handleEmergencySmsDispatch);
    const warningSubscription = setupForegroundShakeListener();

    // Initialize app
    initializeApp();

    return () => {
      smsSubscription.remove();
      warningSubscription();
    };
  }, []);

  const handleEmergencySmsDispatch = async () => {
    console.log('🚨 EVENT RECEIVED: User confirmed SOS from notification! Sending SMS...');
    
    const result = await emergencyService.sendEmergencyAlert();
    
    if (result.success) {
      Alert.alert(
        '✅ Alert Sent',
        `Emergency alert sent to ${result.sentTo} contacts!`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        '❌ Alert Failed',
        result.error || 'Failed to send emergency alert.',
        [{ text: 'OK' }]
      );
    }
  };

  const setupForegroundShakeListener = () => {
    if (Platform.OS === 'android') {
      const warningSubscription = DeviceEventEmitter.addListener('onShakeWarning', () => {
        ToastAndroid.show('Shake Detected! Confirm action in notification bar.', ToastAndroid.LONG);
      });
      return () => warningSubscription.remove();
    }
    return () => {};
  };

  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing app...');
      
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
        const ignoringBattery = await emergencyService.checkBatteryOptimization();
        if (!ignoringBattery) {
          Alert.alert(
            "Important: Background Running",
            "Please disable battery optimization for SafeHer to ensure emergency detection works when the app is closed.",
            [{ text: 'Open Settings', onPress: () => emergencyService.requestBatteryOptimizationExemption() }]
          );
        }
        
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