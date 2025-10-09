// services/authService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://safeher-backend-1.onrender.com/api/auth"; //599293  569760

export const authService = {
  sendOTP: async (phoneNo: string) => {
    try {
      const response = await fetch(`${API_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNo }),
      });
      const data = await response.json();
      if (data.success) {
        // Save sessionId locally for verify
        await AsyncStorage.setItem("sessionId", data.sessionId);
      }
      return data;
    } catch (err) {
      return { success: false, error: "Network error" };
    }
  },

  verifyOTP: async (phoneNo: string, otp: string) => {
    try {
      const sessionId = await AsyncStorage.getItem("sessionId");
      if (!sessionId) {
        return { success: false, error: "No session ID found" };
      }

      const response = await fetch(`${API_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNo, otp, sessionId }),
      });
      const data = await response.json();

      if (data.success && data.token) {
        await AsyncStorage.setItem("authToken", data.token);
      }
      return data;
    } catch (err) {
      return { success: false, error: "Network error" };
    }
  },

  isAuthenticated: async (): Promise<boolean> => {
    const token = await AsyncStorage.getItem("authToken");
    return !!token;
  },

  logout: async (): Promise<void> => {
    await AsyncStorage.removeItem("authToken");
    await AsyncStorage.removeItem("sessionId");
  },
};
