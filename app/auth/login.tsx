// app/auth/login.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Shield, Phone, MessageSquare } from "lucide-react-native";
import { authService } from "@/services/authService";
import { router } from "expo-router";

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      const fullPhoneNumber = `+91${phoneNumber}`;
      const result = await authService.sendOTP(fullPhoneNumber);

      if (result.success) {
        setOtpSent(true);
        Alert.alert("OTP Sent", "Please check your SMS for the verification code");
      } else {
        Alert.alert("Error", result.error || "Failed to send OTP");
      }
    } catch {
      Alert.alert("Error", "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert("Error", "Please enter the complete OTP");
      return;
    }

    setLoading(true);
    try {
      const fullPhoneNumber = `+91${phoneNumber}`;
      const result = await authService.verifyOTP(fullPhoneNumber, otp);

      if (result.success) {
        router.replace("/auth/permissions");
      } else {
        Alert.alert("Error", result.error || "Invalid OTP");
      }
    } catch {
      Alert.alert("Error", "Failed to verify OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <Shield size={64} color="#DC2626" />
        <Text style={styles.title}>SafeHer</Text>
        <Text style={styles.subtitle}>Your personal safety companion</Text>
      </View>

      <View style={styles.content}>
        {!otpSent ? (
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Welcome to SafeHer</Text>
            <Text style={styles.sectionDescription}>
              Enter your phone number to get started
            </Text>

            <View style={styles.phoneInputContainer}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              <Phone size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                {loading ? "Sending..." : "Send OTP"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Verify OTP</Text>
            <Text style={styles.sectionDescription}>
              Enter the 6-digit code sent to +91{phoneNumber}
            </Text>

            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter OTP"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              <MessageSquare size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                {loading ? "Verifying..." : "Verify OTP"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setOtpSent(false)}
            >
              <Text style={styles.secondaryButtonText}>Change Number</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { alignItems: "center", paddingTop: 80, paddingBottom: 40 },
  title: { fontSize: 36, fontWeight: "700", color: "#1F2937", marginTop: 16 },
  subtitle: { fontSize: 16, color: "#6B7280", marginTop: 8 },
  content: { flex: 1, paddingHorizontal: 24 },
  inputSection: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 16,
    elevation: 5,
  },
  sectionTitle: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  sectionDescription: { fontSize: 14, textAlign: "center", marginBottom: 24 },
  phoneInputContainer: { flexDirection: "row", marginBottom: 24 },
  countryCode: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  countryCodeText: { fontSize: 16, fontWeight: "600", color: "#1b1d20ff" },
  phoneInput: {
  flex: 1,
  borderWidth: 1,
  borderColor: "#def2f2ff",
  padding: 14,
  color: '#000000', // <<< ADDED: Fixes white text bug
},
  // Inside const styles = StyleSheet.create({...
otpInput: {
  borderWidth: 1,
  borderColor: "#D1D5DB",
  padding: 16,
  fontSize: 24,
  textAlign: "center",
  marginBottom: 24,
  color: '#000000', // <<< ADDED: Fixes white text bug
},
  primaryButton: {
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    padding: 16,
    borderRadius: 8,
  },
  disabledButton: { opacity: 0.6 },
  primaryButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  secondaryButton: { padding: 16, alignItems: "center" },
  secondaryButtonText: { fontSize: 14, fontWeight: "600", color: "#2563EB" },
});