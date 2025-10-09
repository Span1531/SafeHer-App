import * as Location from "expo-location";
import * as SMS from "expo-sms";
import { Platform, Vibration } from "react-native";
import { contactsService } from "./contactsService";
import SendIntentAndroid from "react-native-send-intent";

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

const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
  try {
    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Location.requestForegroundPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Location permission not granted");
      return null;
    }

    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  } catch (error) {
    console.error("Failed to get location:", error);
    return null;
  }
};

const getReadableAddress = async (latitude: number, longitude: number): Promise<string> => {
  try {
    const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!address) return "";
    const parts = [
      address.name,
      address.street,
      address.city,
      address.region,
      address.country,
    ].filter(Boolean);
    return parts.join(", ");
  } catch {
    return "";
  }
};

export const sendEmergencyAlert = async (): Promise<EmergencyResult> => {
  try {
    console.log("🚨 Sending Emergency Alert...");

    const contacts = await contactsService.getContacts();
    if (contacts.length === 0) {
      return { success: false, error: "No emergency contacts found." };
    }

    const location = await getCurrentLocation();
    if (!location) {
      return { success: false, error: "Unable to get current location." };
    }

    const { latitude, longitude } = location.coords;
    const address = await getReadableAddress(latitude, longitude);
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    const message = `🚨 EMERGENCY ALERT (SafeHer)\n\nI need help!\nLocation: ${mapsLink}\n${address ? `\n📍 ${address}` : ""}\n\nPlease check on me immediately!`;

    const phoneNumbers = contacts.map(c => c.phone);

    // Vibrate briefly to confirm trigger
    Vibration.vibrate(500);

    // Android auto-SMS
    if (Platform.OS === "android") {
      try {
        for (const number of phoneNumbers) {
          await SendIntentAndroid.sendSms(number, message);
          await new Promise(res => setTimeout(res, 300));
        }
        console.log("✅ Auto-SMS sent via SendIntentAndroid");
        return { success: true, sentTo: phoneNumbers.length };
      } catch (err) {
        console.error("Auto-SMS failed, fallback to composer:", err);
      }
    }

    // iOS / fallback (manual composer)
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: "SMS not available on this device" };
    }

    const { result } = await SMS.sendSMSAsync(phoneNumbers, message);
    return result === "sent" || result === "composed"
      ? { success: true, sentTo: phoneNumbers.length }
      : { success: false, error: "SMS cancelled or failed." };
  } catch (error: any) {
    console.error("Emergency alert failed:", error);
    return { success: false, error: error.message || "Unexpected error" };
  }
};

export const emergencyService = { sendEmergencyAlert };
