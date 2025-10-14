// safeher-frontend/src/services/permissionsService.ts

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications'; 

// =================================================================
// 1. MODULARIZED REQUEST FUNCTIONS (Required by permissions.tsx)
// =================================================================

/**
 * Handles the mandatory POST_NOTIFICATIONS permission request (Android 13+).
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || Platform.Version < 33) {
    return true; 
  }
  
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';

    if (!granted) {
      console.warn('❌ Notifications permission denied.');
      Alert.alert('Notification Warning', 'The persistent background indicator will not show unless you grant Notifications permission.');
    }
    return granted;
  } catch (error) {
    console.error('Error requesting notifications permission:', error);
    return false;
  }
};


/**
 * Handles all Location permissions (Fine, Foreground, Background).
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  let grantedFine = false;

  try {
    console.log('📍 Requesting Android FINE_LOCATION...');
    
    // Step 1: Request FINE_LOCATION first (blocking operation)
    const fineLocation = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Location Permission",
        message: "SafeHer needs access to your location to send emergency alerts with your position.",
        buttonPositive: "Allow",
        buttonNegative: "Deny"
      }
    );
    
    if (fineLocation === PermissionsAndroid.RESULTS.GRANTED) {
      grantedFine = true;

      // Step 2: Request BACKGROUND_LOCATION (Android 10+ only)
      if (Platform.Version >= 29) {
        console.log('📍 Android 10+ detected, requesting background location...');
        
        const backgroundLocation = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: "Background Location Permission",
            message: "SafeHer needs access to location in the background. Please select 'Allow all the time'.",
            buttonPositive: "Allow",
            buttonNegative: "Deny"
          }
        );
        
        if (backgroundLocation !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('⚠️ Background location denied - background service integrity compromised.');
          Alert.alert('Background Location Warning', "Please go to app settings and change location access to 'Allow all the time' for full background protection.");
        }
      }
      
      // Step 3: Expo Foreground Check (for consistency)
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== "granted") {
        console.warn("❌ Expo foreground location permission not granted");
        // We still consider it granted if the native part passed, but log warning
      }
    }
    
    return grantedFine;
    
  } catch (error) {
    console.error('❌ Error requesting location permissions:', error);
    return false;
  }
};

/**
 * Handles the SMS sending permission request.
 */
export const requestSMSPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      {
        title: "Emergency SMS Permission",
        message: "SafeHer needs permission to send emergency SMS alerts automatically.",
        buttonPositive: "Allow",
        buttonNegative: "Deny"
      }
    );
    const result = granted === PermissionsAndroid.RESULTS.GRANTED;
    if (!result) {
        console.warn('❌ SMS permission denied.');
    }
    return result;
  } catch (error) {
    console.error('Error requesting SMS permission:', error);
    return false;
  }
};


// =================================================================
// 2. CHECK STATUS FUNCTIONS (Required by permissions.tsx)
// =================================================================

/**
 * Checks the status of the most critical permissions.
 */
export const checkCriticalPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
        return true;
    }

    const checks = await Promise.all([
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS),
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION),
    ]);

    // Check Notifications separately
    let notificationGranted = true;
    if (Platform.Version >= 33) {
        // Use getPermissionsAsync to check current status without prompting
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
            notificationGranted = false;
        }
    }

    return checks.every(status => status) && notificationGranted;
};

// =================================================================
// 3. EXPORTS
// =================================================================

export const permissionsService = {
    requestNotificationPermission,
    requestLocationPermission,
    requestSMSPermission,
    checkCriticalPermissions,
    // requestAllPermissions is now obsolete but left for completeness
    // requestAllPermissions: () => requestAllPermissions, 
};

// NOTE: The original monolithic requestAllPermissions function is deleted/removed from export
// as it is no longer the correct way to handle the flow requested by permissions.tsx