import { 
    Platform, 
    PermissionsAndroid, 
    NativeModules, 
    DeviceEventEmitter,
    AppRegistry,
    Alert
} from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications"; // <<< NEW IMPORT FOR NOTIFICATION PERMISSIONS
import { contactsService } from "./contactsService";




// =================================================================
// 1. NATIVE MODULE SETUP (CRITICAL)
// =================================================================

const { AutoSmsModule, ShakeControlModule } = NativeModules;

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

interface EmergencyResult {
  success: boolean;
  error?: string;
  sentTo?: number;
}

// -----------------------------------------------------------------
// DEBUG LOGS (UNCHANGED)
// -----------------------------------------------------------------
if (Platform.OS === 'android') {
    console.log('=== NATIVE MODULES DEBUG ===');
    console.log('AutoSmsModule available:', !!AutoSmsModule);
    console.log('ShakeControlModule available:', !!ShakeControlModule);
    
    if (AutoSmsModule) {
        console.log('AutoSmsModule methods:', Object.keys(AutoSmsModule));
    } else {
        console.error('❌ AutoSmsModule is NULL! Check MainApplication.kt');
    }
    
    if (ShakeControlModule) {
        console.log('ShakeControlModule methods:', Object.keys(ShakeControlModule));
    } else {
        console.error('❌ ShakeControlModule is NULL! Check MainApplication.kt');
    }
    console.log('============================');
}

// Add this RIGHT AFTER the import statements in emergencyService.ts

console.log('=== CHECKING NATIVE MODULES ===');
console.log('Platform:', Platform.OS);
console.log('AutoSmsModule exists:', !!AutoSmsModule);
console.log('ShakeControlModule exists:', !!ShakeControlModule);

if (Platform.OS === 'android') {
  if (!AutoSmsModule) {
    console.error('❌❌❌ AutoSmsModule IS NULL - Native module not registered!');
  } else {
    console.log('✅ AutoSmsModule available');
    console.log('AutoSmsModule methods:', Object.keys(AutoSmsModule));
  }
  
  if (!ShakeControlModule) {
    console.error('❌❌❌ ShakeControlModule IS NULL - Native module not registered!');
  } else {
    console.log('✅ ShakeControlModule available');
    console.log('ShakeControlModule methods:', Object.keys(ShakeControlModule));
  }
}
console.log('================================');

// =================================================================
// 2. PERMISSION HELPERS (UNCHANGED)
// =================================================================

/**
 * Request location permissions properly on Android
 */
const requestLocationPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    console.log('📍 Requesting Android location permissions...');
    
    // Step 1: Request FINE_LOCATION first
    const fineLocation = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Location Permission",
        message: "SafeHer needs access to your location to send emergency alerts with your position.",
        buttonPositive: "Allow",
        buttonNegative: "Deny"
      }
    );
    
    console.log('Fine location result:', fineLocation);
    
    if (fineLocation !== PermissionsAndroid.RESULTS.GRANTED) {
      console.warn('❌ Fine location permission denied');
      return false;
    }
    
    // Step 2: On Android 10+ (API 29+), also request BACKGROUND_LOCATION
    if (Platform.Version >= 29) {
      console.log('📍 Android 10+ detected, requesting background location...');
      
      const backgroundLocation = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        {
          title: "Background Location Permission",
          message: "SafeHer needs access to location in the background to detect shake emergencies when the app is closed. Please select 'Allow all the time'.",
          buttonPositive: "Allow",
          buttonNegative: "Deny"
        }
      );
      
      console.log('Background location result:', backgroundLocation);
      
      if (backgroundLocation !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn('⚠️ Background location denied - shake detection may not work when app is closed');
        // Don't fail completely - still allow emergency button to work
      }
    }
    
    // Step 3: Also use Expo's location API for consistency
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    console.log('Expo foreground permission status:', foregroundStatus);
    
    if (foregroundStatus !== "granted") {
      console.warn("❌ Expo foreground location permission not granted");
      return false;
    }
    
    console.log('✅ All location permissions granted successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Error requesting location permissions:', error);
    return false;
  }
};

/**
 * Check if location permissions are already granted
 */
const checkLocationPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const fineLocation = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    
    console.log('Location permission check:', fineLocation);
    return fineLocation;
    
  } catch (error) {
    console.error('Error checking location permissions:', error);
    return false;
  }
};

// =================================================================
// 3. CORE LOGIC FUNCTIONS (UNCHANGED)
// =================================================================

const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
  try {
    console.log('📍 Getting current location...');
    
    // First check if we have permissions
    const hasPermission = await checkLocationPermissions();
    
    if (!hasPermission) {
      console.log('No permission, requesting...');
      const granted = await requestLocationPermissions();
      
      if (!granted) {
        console.error('❌ Location permissions not granted');
        return null;
      }
    }

    console.log('📍 Fetching GPS position with high accuracy...');
    
    // Get location with timeout
    const location = await Promise.race([
      Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 0
      }),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Location timeout')), 15000)
      )
    ]);
    
    if (!location) {
      console.error('❌ Location fetch timed out');
      return null;
    }
    
    console.log('✅ Location obtained:', location.coords.latitude, location.coords.longitude);
    return location as Location.LocationObject;
    
  } catch (error) {
    console.error("❌ Failed to get location:", error);
    
    // Try last known location as fallback
    try {
      console.log('📍 Trying last known location...');
      const lastLocation = await Location.getLastKnownPositionAsync();
      
      if (lastLocation) {
        console.log('✅ Using last known location:', lastLocation.coords.latitude, lastLocation.coords.longitude);
        return lastLocation;
      }
    } catch (fallbackError) {
      console.error('❌ Last known location also failed:', fallbackError);
    }
    
    return null;
  }
};

/**
 * Sends an SMS message using the native AutoSmsModule for silent delivery
 */
const sendSmsLogic = async (phoneNumbers: string[], message: string): Promise<void> => {
    if (Platform.OS === 'android') {
        if (!AutoSmsModule) {
            throw new Error('AutoSmsModule not available. Native module not registered.');
        }
        
        if (!AutoSmsModule.sendSms) {
            throw new Error('AutoSmsModule.sendSms method not found.');
        }

        console.log('📱 Sending SMS to', phoneNumbers.length, 'contacts via native module...');
        
        try {
            // The native module returns a Promise
            const result = await AutoSmsModule.sendSms(phoneNumbers, message);
            console.log('✅ SMS send result:', result);
        } catch (error: any) {
            console.error('❌ Native SMS send failed:', error);
            throw new Error(`SMS send failed: ${error.message || error}`);
        }
    } else {
        throw new Error('SMS sending only supported on Android');
    }
};

// =================================================================
// 4. EXPORTED EMERGENCY ALERT FUNCTIONS (UNCHANGED)
// =================================================================

export const sendEmergencyAlert = async (): Promise<EmergencyResult> => {
  try {
    console.log("🚨 === EMERGENCY ALERT INITIATED ===");

    // 1. Check SMS Permission (Android)
    if (Platform.OS === "android") {
      console.log('Checking SMS permission...');
      
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
        {
          title: "Emergency SMS Permission",
          message: "SafeHer needs permission to send emergency SMS alerts automatically.",
          buttonPositive: "Allow",
        }
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log("❌ SMS Permission denied by user");
        return { success: false, error: "SMS permission denied" };
      }
      
      console.log('✅ SMS permission granted');
    }

    // 2. Get Emergency Contacts
    console.log('Loading emergency contacts...');
    const contacts: EmergencyContact[] = await contactsService.getContacts();
    const phoneNumbers = contacts.map((c) => c.phone);
    
    console.log('Found', phoneNumbers.length, 'emergency contacts');
    
    if (phoneNumbers.length === 0) {
      return { success: false, error: "No emergency contacts found. Please add contacts first." };
    }

    // 3. Get Current Location
    const location = await getCurrentLocation();
    
    if (!location) {
      // Show helpful error message
      Alert.alert(
        "Location Unavailable",
        "Cannot access location. Please:\n\n1. Go to Settings > Apps > SafeHer > Permissions\n2. Set Location to 'Allow all the time'\n3. Try again",
        [{ text: "OK" }]
      );
      
      return { 
        success: false, 
        error: "Unable to get location. Please check location permissions in Settings > Apps > SafeHer > Permissions and set to 'Allow all the time'." 
      };
    }

    // 4. Reverse Geocode to get readable address
    console.log('Getting address from coordinates...');
    const { latitude, longitude } = location.coords;
    let address = "Address unavailable";
    
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (place) {
        const parts = [
          place.name,
          place.street,
          place.city,
          place.region,
          place.postalCode
        ].filter(Boolean);
        
        address = parts.length > 0 ? parts.join(", ") : "Location coordinates only";
      }
      
      console.log('📍 Address:', address);
    } catch (error) {
      console.warn('⚠️ Reverse geocoding failed:', error);
      address = `Lat: ${latitude.toFixed(6)}, Long: ${longitude.toFixed(6)}`;
    }

    // 5. Construct Emergency Message
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    const timestamp = new Date().toLocaleString();
    
    const message = `🚨 EMERGENCY ALERT from SafeHer

I NEED HELP IMMEDIATELY!

Time: ${timestamp}
Location: ${address}

Google Maps: ${mapsLink}

Please check on me right away or call emergency services!

- Sent automatically by SafeHer`;

    console.log('Message prepared, length:', message.length);

    // 6. Send SMS via Native Module
    await sendSmsLogic(phoneNumbers, message);

    console.log('✅ === EMERGENCY ALERT SENT SUCCESSFULLY ===');
    return { success: true, sentTo: phoneNumbers.length };

  } catch (error: any) {
    console.error("❌ Emergency alert failed:", error);
    return { 
      success: false, 
      error: error.message || "Unexpected error occurred" 
    };
  }
};

// =================================================================
// 5. SHAKE SERVICE CONTROL FUNCTIONS (UPDATED FOR V3 STABILITY)
// =================================================================

export const startBackgroundShakeDetection = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
        return false;
    }
    
    // --- STEP 1: NOTIFICATION PERMISSION (MANDATORY FOR ANDROID 13+) ---
    if (Platform.Version >= 33) {
        console.log('🔔 Requesting notification permission (Android 13+)...');
        // This prompts the user for the notification permission (POST_NOTIFICATIONS)
        const notificationStatus = await Notifications.requestPermissionsAsync(); 
        
        if (notificationStatus.status !== 'granted') {
            Alert.alert(
                "Notification Permission Required",
                "Notifications permission is mandatory to display the 'SafeHer Active' persistent indicator. Please grant this permission in your device settings.",
                [{ text: "OK" }]
            );
            // This is likely why the notification wasn't visible and the flow broke!
            return false;
        }
        console.log('✅ Notification permission granted');
    }


    // --- STEP 2: LOCATION PERMISSIONS ---
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
        console.error('❌ Cannot start shake service without location permissions');
        // Alert handled within requestLocationPermissions
        return false;
    }
    
    if (!ShakeControlModule) {
        console.error('❌ ShakeControlModule not available');
        return false;
    }
    
    // --- STEP 3: START NATIVE SERVICE ---
    try {
        console.log('🔄 Starting shake detection service...');
        // The native module ShakeControlModule.startService() performs the final 
        // validation check and starts the Java ShakeService.
        await ShakeControlModule.startService();
        console.log('✅ Shake detection service started successfully.');
        return true;
    } catch (error: any) {
        console.error('❌ Failed to start shake service:', error);
        
        // Handle rejection from native module if *any* permission check failed 
        if (error.code === "PERMISSION_DENIED") {
             Alert.alert(
                "Service Failed to Start",
                "Please verify that ALL required permissions (Location, SMS, Notifications) are granted in Settings.",
                [{ text: "OK" }]
            );
        }
        return false;
    }
};

export const stopBackgroundShakeDetection = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
        return false;
    }
    
    if (!ShakeControlModule) {
        console.error('❌ ShakeControlModule not available');
        return false;
    }
    
    try {
        console.log('🛑 Stopping shake detection service...');
        await ShakeControlModule.stopService();
        console.log('✅ Shake detection service stopped');
        return true;
    } catch (error) {
        console.error('❌ Failed to stop shake service:', error);
        return false;
    }
};

export const subscribeToShakeEvents = (callback: () => void) => {
    if (Platform.OS === 'android') {
        console.log('👂 Subscribing to shake events (broadcast-based)...');
        return DeviceEventEmitter.addListener('onShakeDetected', callback);
    }
    return { remove: () => {} };
};

/**
 * Subscribe to emergency confirmation events from notification
 */
export const subscribeToEmergencyConfirmation = (callback: () => void) => {
    if (Platform.OS === 'android') {
        console.log('👂 Subscribing to emergency confirmation events...');
        return DeviceEventEmitter.addListener('onEmergencyConfirmed', callback);
    }
    return { remove: () => {} };
};

/**
 * Check if battery optimization is disabled for the app
 */
export const checkBatteryOptimization = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
        return true;
    }
    
    if (!ShakeControlModule) {
        console.error('❌ ShakeControlModule not available');
        return false;
    }
    
    try {
        const result = await ShakeControlModule.checkBatteryOptimization();
        console.log('Battery optimization check:', result);
        return result.isIgnoring;
    } catch (error) {
        console.error('❌ Failed to check battery optimization:', error);
        return false;
    }
};

/**
 * Request user to disable battery optimization for the app
 */
export const requestBatteryOptimizationExemption = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
        return true;
    }
    
    if (!ShakeControlModule) {
        console.error('❌ ShakeControlModule not available');
        return false;
    }
    
    try {
        await ShakeControlModule.requestBatteryOptimizationExemption();
        return true;
    } catch (error) {
        console.error('❌ Failed to request battery optimization exemption:', error);
        return false;
    }
};

export const emergencyService = { 
    sendEmergencyAlert, 
    startBackgroundShakeDetection,
    stopBackgroundShakeDetection,
    subscribeToShakeEvents,
    subscribeToEmergencyConfirmation,
    requestLocationPermissions,
    checkLocationPermissions,
  checkBatteryOptimization,          // NEW
  requestBatteryOptimizationExemption // NEW
};