import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as SMS from "expo-sms";
import { Platform, PermissionsAndroid } from "react-native";

/**
 * Permissions service to manage runtime permissions for SafeHer
 * Works on Android & iOS (bypasses gracefully on web/Expo Go)
 */
class PermissionsService {
  async requestNotificationPermission(): Promise<boolean> {
    try {
      if (Platform.OS === "web") return true;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === "granted";
    } catch (error) {
      console.warn("Notification permission request failed:", error);
      return true; // allow in Expo Go
    }
  }

  async requestLocationPermission(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === "granted";
    } catch (error) {
      console.error("Location permission error:", error);
      return false;
    }
  }

  async requestSMSPermission(): Promise<boolean> {
    try {
      if (Platform.OS === "web") return true;
      if (Platform.OS === "ios") return await SMS.isAvailableAsync();

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.SEND_SMS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error("SMS permission request failed:", error);
      return false;
    }
  }

  async checkNotificationPermission(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === "granted";
    } catch {
      return true;
    }
  }

  async checkLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === "granted";
    } catch {
      return false;
    }
  }

  async checkSMSPermission(): Promise<boolean> {
    try {
      if (Platform.OS === "android")
        return await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.SEND_SMS
        );
      if (Platform.OS === "ios")
        return await SMS.isAvailableAsync();
      return true;
    } catch {
      return false;
    }
  }

  async checkAllPermissions(): Promise<{
    notifications: boolean;
    location: boolean;
    sms: boolean;
  }> {
    return {
      notifications: await this.checkNotificationPermission(),
      location: await this.checkLocationPermission(),
      sms: await this.checkSMSPermission(),
    };
  }
}

export const permissionsService = new PermissionsService();
