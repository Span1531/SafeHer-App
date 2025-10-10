// services/emergencyService.ts
import * as Location from "expo-location";
import { Platform, PermissionsAndroid } from "react-native";
import { contactsService } from "./contactsService";

let SendIntentAndroid: any;
try {
  SendIntentAndroid = require("react-native-send-intent");
} catch {
  SendIntentAndroid = null;
}

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

    return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  } catch (error) {
    console.error("Failed to get location:", error);
    return null;
  }
};

export const sendEmergencyAlert = async (): Promise<EmergencyResult> => {
  try {
    console.log("🚨 Sending Emergency Alert...");

    // Ask for SMS permission (important!)
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
        {
          title: "SMS Permission Required",
          message: "SafeHer needs permission to send emergency SMS automatically.",
          buttonPositive: "Allow",
        }
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log("❌ SMS Permission denied");
        return { success: false, error: "SMS Permission denied" };
      }
    }

    const contacts = await contactsService.getContacts();
    if (contacts.length === 0) {
      return { success: false, error: "No emergency contacts found." };
    }

    const location = await getCurrentLocation();
    if (!location) {
      return { success: false, error: "Unable to get location." };
    }

    const { latitude, longitude } = location.coords;
    const [place] = await Location.reverseGeocodeAsync(location.coords);
    const address = place
      ? `${place.name || ""}, ${place.street || ""}, ${place.city || ""}, ${place.region || ""}`
      : "Unknown location";

    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    const message = `🚨 EMERGENCY ALERT (SafeHer)\nI need help!\nI'm near ${address}\nMy location: ${mapsLink}\nPlease check on me immediately!`;

    const phoneNumbers = contacts.map((c) => c.phone);

    if (Platform.OS === "android" && SendIntentAndroid) {
      try {
        for (const number of phoneNumbers) {
          await SendIntentAndroid.sendSms(number, message);
        }
        console.log("✅ Auto-SMS sent via SendIntentAndroid");
        return { success: true, sentTo: phoneNumbers.length };
      } catch (err) {
        console.error("Auto-SMS failed:", err);
        return { success: false, error: "Failed to send SMS automatically" };
      }
    } else {
      console.warn("⚠️ Auto-SMS not supported on this platform.");
      return { success: false, error: "Auto-SMS not supported" };
    }
  } catch (error: any) {
    console.error("Emergency alert failed:", error);
    return { success: false, error: error.message || "Unexpected error" };
  }
};

export const emergencyService = { sendEmergencyAlert };
