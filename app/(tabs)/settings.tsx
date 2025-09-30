import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { 
  Bell, 
  MapPin, 
  MessageSquare, 
  LogOut, 
  Shield,
  Settings as SettingsIcon 
} from 'lucide-react-native';
import { permissionsService } from '@/services/permissionsService';
import { authService } from '@/services/authService';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const [permissions, setPermissions] = useState({
    notifications: false,
    location: false,
    sms: false,
  });

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const notificationStatus = await permissionsService.checkNotificationPermission();
      const locationStatus = await permissionsService.checkLocationPermission();
      const smsStatus = await permissionsService.checkSMSPermission();

      setPermissions({
        notifications: notificationStatus,
        location: locationStatus,
        sms: smsStatus,
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const handlePermissionToggle = async (type: 'notifications' | 'location' | 'sms') => {
    try {
      let granted = false;
      
      switch (type) {
        case 'notifications':
          granted = await permissionsService.requestNotificationPermission();
          break;
        case 'location':
          granted = await permissionsService.requestLocationPermission();
          break;
        case 'sms':
          granted = await permissionsService.requestSMSPermission();
          break;
      }

      setPermissions(prev => ({
        ...prev,
        [type]: granted,
      }));

      if (!granted) {
        Alert.alert(
          'Permission Denied',
          `${type.charAt(0).toUpperCase() + type.slice(1)} permission is required for the app to function properly.`
        );
      }
    } catch (error) {
      Alert.alert('Error', `Failed to request ${type} permission`);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
              router.replace('/auth/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const renderPermissionItem = (
    icon: React.ReactNode,
    title: string,
    description: string,
    type: 'notifications' | 'location' | 'sms',
    enabled: boolean
  ) => (
    <View style={styles.permissionItem}>
      <View style={styles.permissionIcon}>
        {icon}
      </View>
      <View style={styles.permissionContent}>
        <Text style={styles.permissionTitle}>{title}</Text>
        <Text style={styles.permissionDescription}>{description}</Text>
      </View>
      <Switch
        trackColor={{ false: '#D1D5DB', true: '#DC2626' }}
        thumbColor={enabled ? '#FFFFFF' : '#F3F4F6'}
        value={enabled}
        onValueChange={() => handlePermissionToggle(type)}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SettingsIcon size={32} color="#DC2626" />
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage app permissions and preferences</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <Text style={styles.sectionDescription}>
            All permissions are required for emergency features to work properly
          </Text>

          <View style={styles.permissionsContainer}>
            {renderPermissionItem(
              <Bell size={24} color="#2563EB" />,
              'Notifications',
              'Receive emergency alerts and confirmations',
              'notifications',
              permissions.notifications
            )}

            {renderPermissionItem(
              <MapPin size={24} color="#2563EB" />,
              'Location Services',
              'Share your location in emergency situations',
              'location',
              permissions.location
            )}

            {renderPermissionItem(
              <MessageSquare size={24} color="#2563EB" />,
              'SMS Messages',
              'Send emergency alerts to your contacts',
              'sms',
              permissions.sms
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#DC2626" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Shield size={20} color="#9CA3AF" />
          <Text style={styles.footerText}>SafeHer v1.0.0</Text>
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
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  permissionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  permissionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  permissionDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 8,
  },
});