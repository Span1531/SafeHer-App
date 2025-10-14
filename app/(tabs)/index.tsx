import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  NativeModules,
} from "react-native";
import { Shield, MapPin, MessageSquare, AlertCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { sendEmergencyAlert } from "@/services/emergencyService";
import { useShakeDetection } from "@/hooks/useShakeDetection";
import { authService } from "@/services/authService";
import { router } from "expo-router";

export default function HomeScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Enable shake detection
  useShakeDetection(() => {
    handleEmergencyTrigger();
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);


  const { SafeHerStorage } = NativeModules;
  
  useEffect(() => {
  console.log('🧪 Testing direct SafeHerStorage call...');
  if (SafeHerStorage?.setValue) {
    SafeHerStorage.setValue('test_key', 'hello_world');
    console.log('✅ Called SafeHerStorage.setValue("test_key", "hello_world")');
  } else {
    console.log('❌ SafeHerStorage.setValue not available');
  }
}, []);

  useEffect(() => {
    console.log('🔍 === NATIVE MODULES DEBUG ===');
    console.log('Platform:', Platform.OS);
    console.log('Available Native Modules:', Object.keys(NativeModules).sort());
    
    const { SafeHerStorage, ShakeControlModule, AutoSmsModule } = NativeModules;
    
    console.log('SafeHerStorage available:', !!SafeHerStorage);
    console.log('ShakeControlModule available:', !!ShakeControlModule);
    console.log('AutoSmsModule available:', !!AutoSmsModule);
    
    if (SafeHerStorage) {
      console.log('✅ SafeHerStorage methods:', Object.keys(SafeHerStorage));
    } else {
      console.error('❌ SafeHerStorage is NULL!');
    }
    console.log('================================');
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await authService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (!authenticated) {
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyTrigger = async () => {
    if (sending) {
      console.log('⚠️ Already sending emergency alert...');
      return;
    }

    // Haptic feedback
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        console.log('Haptic feedback not available');
      }
    }

    Alert.alert(
      '🚨 Emergency Alert',
      'This will send your location to all emergency contacts via SMS. Continue?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('Emergency cancelled by user')
        },
        { 
          text: 'Send Alert', 
          style: 'destructive',
          onPress: () => sendAlert()
        },
      ],
      { cancelable: true }
    );
  };

  const sendAlert = async () => {
    setSending(true);
    console.log('🚨 User confirmed emergency alert');

    try {
      const result = await sendEmergencyAlert();
      
      if (result.success) {
        console.log('✅ Emergency alert sent successfully');
        
        // Success haptic
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
        }

        Alert.alert(
          '✅ Alert Sent!',
          `Emergency message sent to ${result.sentTo || 'your'} contact${result.sentTo !== 1 ? 's' : ''}.`,
          [{ text: 'OK' }]
        );
      } else {
        console.log('❌ Emergency alert failed:', result.error);
        
        // Error haptic
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error
          );
        }

        Alert.alert(
          '❌ Failed to Send',
          result.error || 'Unknown error occurred. Please check permissions and try again.',
          [
            { text: 'OK' },
            {
              text: 'Check Settings',
              onPress: () => router.push('/(tabs)/settings')
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Shield size={48} color="#DC2626" />
        <Text style={styles.loadingText}>SafeHer</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Shield size={32} color="#DC2626" />
        <Text style={styles.title}>SafeHer</Text>
        <Text style={styles.subtitle}>Your safety companion</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={[
            styles.emergencyButton,
            sending && styles.emergencyButtonDisabled
          ]}
          onPress={handleEmergencyTrigger}
          activeOpacity={0.8}
          disabled={sending}
        >
          <View style={styles.emergencyButtonContent}>
            {sending ? (
              <>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.emergencyButtonText}>SENDING...</Text>
              </>
            ) : (
              <>
                <Shield size={48} color="#FFFFFF" />
                <Text style={styles.emergencyButtonText}>EMERGENCY</Text>
                <Text style={styles.emergencyButtonSubtext}>Tap or shake phone</Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <MapPin size={24} color="#2563EB" />
            <Text style={styles.featureText}>Location Tracking</Text>
          </View>
          <View style={styles.feature}>
            <MessageSquare size={24} color="#2563EB" />
            <Text style={styles.featureText}>Emergency SMS</Text>
          </View>
        </View>

        <View style={styles.instructionsCard}>
          <AlertCircle size={20} color="#DC2626" />
          <Text style={styles.instructions}>
            Press the button or shake your phone to send your exact location to all emergency contacts via SMS.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emergencyButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 48,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  emergencyButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#6B7280',
  },
  emergencyButtonContent: {
    alignItems: 'center',
  },
  emergencyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  emergencyButtonSubtext: {
    fontSize: 12,
    color: '#FCA5A5',
    marginTop: 4,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 32,
  },
  feature: {
    alignItems: 'center',
    flex: 1,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },
  instructionsCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  instructions: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
    marginLeft: 12,
  },
});