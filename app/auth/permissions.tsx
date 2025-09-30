// app/auth/permissions.tsx
// FIXED VERSION - Properly marks onboarding as complete

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Bell, MapPin, MessageSquare, CircleCheck as CheckCircle, Shield, ArrowRight } from 'lucide-react-native';
import { permissionsService } from '@/services/permissionsService';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PermissionsScreen() {
  const [permissions, setPermissions] = useState({
    notifications: false,
    location: false,
    sms: false,
  });
  const [requesting, setRequesting] = useState(false);

  const requestAllPermissions = async () => {
    setRequesting(true);
    
    try {
      console.log('📋 Requesting permissions...');
      
      const notificationGranted = await permissionsService.requestNotificationPermission();
      const locationGranted = await permissionsService.requestLocationPermission();
      const smsGranted = await permissionsService.requestSMSPermission();

      console.log('Permission results:', { notificationGranted, locationGranted, smsGranted });

      setPermissions({
        notifications: notificationGranted,
        location: locationGranted,
        sms: smsGranted,
      });

      if (notificationGranted && locationGranted && smsGranted) {
        // ✅ CRITICAL FIX: Mark onboarding as complete
        await AsyncStorage.setItem('onboardingComplete', 'true');
        console.log('✅ Onboarding marked complete');
        
        Alert.alert(
          'Setup Complete',
          'All permissions granted! SafeHer is ready to protect you.',
          [{ 
            text: 'Continue', 
            onPress: async () => {
              console.log('Navigating to tabs...');
              router.replace('/(tabs)');
            }
          }]
        );
      } else {
        Alert.alert(
          'Permissions Required',
          'All permissions are required for SafeHer to work properly in emergency situations.',
          [{ text: 'Try Again', onPress: requestAllPermissions }]
        );
      }
    } catch (error) {
      console.error('Permission request error:', error);
      Alert.alert('Error', 'Failed to request permissions. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  const skipForNow = async () => {
    // Allow skipping but warn user
    Alert.alert(
      'Skip Permissions?',
      'SafeHer may not work properly without these permissions. You can grant them later in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip', 
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.setItem('onboardingComplete', 'true');
            router.replace('/(tabs)');
          }
        }
      ]
    );
  };

  const renderPermissionItem = (
    icon: React.ReactNode,
    title: string,
    description: string,
    granted: boolean
  ) => (
    <View style={[styles.permissionCard, granted && styles.permissionGranted]}>
      <View style={styles.permissionIcon}>
        {icon}
      </View>
      <View style={styles.permissionContent}>
        <Text style={styles.permissionTitle}>{title}</Text>
        <Text style={styles.permissionDescription}>{description}</Text>
      </View>
      {granted && (
        <CheckCircle size={24} color="#10B981" />
      )}
    </View>
  );

  const allPermissionsGranted = permissions.notifications && permissions.location && permissions.sms;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Shield size={64} color="#DC2626" />
        <Text style={styles.title}>Setup Permissions</Text>
        <Text style={styles.subtitle}>
          SafeHer needs these permissions to protect you in emergencies
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.permissionsContainer}>
          {renderPermissionItem(
            <Bell size={24} color="#2563EB" />,
            'Notifications',
            'Receive emergency alerts and status updates',
            permissions.notifications
          )}

          {renderPermissionItem(
            <MapPin size={24} color="#2563EB" />,
            'Location Services',
            'Share your exact location in emergencies',
            permissions.location
          )}

          {renderPermissionItem(
            <MessageSquare size={24} color="#2563EB" />,
            'SMS Messages',
            'Send emergency alerts to your contacts',
            permissions.sms
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            requesting && styles.disabledButton,
            allPermissionsGranted && styles.successButton
          ]}
          onPress={allPermissionsGranted ? async () => {
            await AsyncStorage.setItem('onboardingComplete', 'true');
            router.replace('/(tabs)');
          } : requestAllPermissions}
          disabled={requesting}
        >
          {allPermissionsGranted ? (
            <>
              <Text style={styles.continueButtonText}>Continue to SafeHer</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </>
          ) : (
            <>
              <Shield size={20} color="#FFFFFF" />
              <Text style={styles.continueButtonText}>
                {requesting ? 'Requesting Permissions...' : 'Grant Permissions'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={skipForNow} style={styles.skipButton}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          All permissions are essential for emergency features to work offline
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  permissionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  permissionGranted: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  permissionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  successButton: {
    backgroundColor: '#10B981',
  },
  disabledButton: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  footerNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
  },
});