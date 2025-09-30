import * as Location from "expo-location";
import * as SMS from "expo-sms";
import { Platform } from "react-native";
import { contactsService } from "./contactsService";

// NOTE: The 'expo-android-sms-sender' import has been removed to restore Expo Go compatibility.

interface EmergencyResult {
  success: boolean;
  error?: string;
  sentTo?: number;
}

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

/**
 * Get current device location
 */
const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
  try {
    // Check existing permissions first
    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
    
    let finalStatus = existingStatus;
    
    // If not granted, request permission
    if (existingStatus !== 'granted') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.error('Location permission not granted');
      return null;
    }

    // Get location with high accuracy
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return location;
  } catch (error) {
    console.error('Failed to get location:', error);
    return null;
  }
};

/**
 * Main emergency alert function - sends SMS with location to all contacts
 * This version uses expo-sms, requiring the user to manually press "Send" in the external app.
 */
export const sendEmergencyAlert = async (): Promise<EmergencyResult> => {
  try {
    console.log('🚨 Starting emergency alert (Expo Go Mode)...');

    // 1. Get emergency contacts
    let contacts: EmergencyContact[] = [];
    
    try {
      contacts = await contactsService.getContacts();
    } catch (contactError) {
      console.error('❌ Failed to load contacts:', contactError);
      return {
        success: false,
        error: 'Failed to load emergency contacts. Please check app permissions.',
      };
    }
    
    if (contacts.length === 0) {
      console.log('❌ No emergency contacts found');
      return {
        success: false,
        error: 'No emergency contacts found. Please add contacts in the Contacts tab first.',
      };
    }

    console.log(`📇 Found ${contacts.length} emergency contacts:`, contacts.map(c => c.name));

    // 2. Get current location
    const location = await getCurrentLocation();
    
    if (!location) {
      console.log('❌ Could not get location');
      return {
        success: false,
        error: 'Could not get your location. Please check location permissions.',
      };
    }

    const { latitude, longitude } = location.coords;
    console.log(`📍 Location: ${latitude}, ${longitude}`);

    // 3. Build emergency message with Google Maps link
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`; 
    const message = `🚨 EMERGENCY ALERT from SafeHer 🚨\n\nI need help! My current location is:\n${mapsLink}\n\nPlease check on me immediately!`;

    // 4. Extract phone numbers
    const phoneNumbers = contacts.map(c => c.phone);
    console.log('📱 Target Phones:', phoneNumbers);

    // 5. Platform Check
    if (Platform.OS === 'web') {
      console.log('⚠️ Web platform - SMS simulation');
      return { success: true, sentTo: phoneNumbers.length };
    }

    // 6. Check SMS availability
    const isAvailable = await SMS.isAvailableAsync();
    
    if (!isAvailable) {
      console.log('❌ SMS not available on this device');
      return {
        success: false,
        error: 'SMS is not available on this device',
      };
    }

    // 7. Send SMS (Opens Composer)
    console.log('📤 Opening SMS composer. User must press send...');
    const { result } = await SMS.sendSMSAsync(phoneNumbers, message);
    
    console.log('SMS Composer Result:', result);

    // FIX: Relaxed success criteria for Expo Go
    if (result === SMS.SMSResult.SENT || result === SMS.SMSResult.COMPOSED) {
      console.log('✅ Emergency SMS composer opened/sent successfully!');
      // Assuming success if the user pressed send or composed the message
      return {
        success: true,
        sentTo: phoneNumbers.length,
      };
    } else if (result === SMS.SMSResult.CANCELLED) {
      console.log('⚠️ SMS sending was cancelled by user');
      return {
        success: false,
        error: 'SMS sending was cancelled. You MUST tap "Send" in your messaging app to complete the alert.',
      };
    } else {
      console.log('❌ SMS failed to send or returned unknown status.');
      return {
        success: false,
        error: `Alert composer failed or returned unknown status: ${result}. Please try again.`,
      };
    }
  } catch (error) {
    console.error('❌ Emergency alert error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send emergency alert'
    };
  }
};

/**
 * Emergency Service Class (for backwards compatibility)
 */
class EmergencyService {
  async triggerEmergency(): Promise<EmergencyResult> {
    // This is the main entry point, using the robust sendEmergencyAlert logic.
    return await sendEmergencyAlert();
  }

  // sendLocationSMS is kept for compatibility but should use the triggerEmergency wrapper
  async sendLocationSMS(phoneNumbers: string[], message: string): Promise<{ success: boolean }> {
    try {
      if (Platform.OS === 'web') {
        console.log('📱 SMS stub:', phoneNumbers, message);
        return { success: true };
      }

      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        return { success: false };
      }

      const { result } = await SMS.sendSMSAsync(phoneNumbers, message);
      // Relaxed check for compatibility
      return { success: result !== SMS.SMSResult.CANCELLED };
    } catch (error) {
      console.error('SMS error:', error);
      return { success: false };
    }
  }

  async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    const location = await getCurrentLocation();
    if (!location) return null;
    
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };
  }

  async cancelEmergency(): Promise<void> {
    console.log('✅ Emergency cancelled');
    return Promise.resolve();
  }
}

export const emergencyService = new EmergencyService();