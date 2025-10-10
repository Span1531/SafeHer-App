import { Linking, Platform } from "react-native";
import Shake from "react-native-shake";
import BackgroundService from "react-native-background-actions";
import { emergencyService } from "./emergencyService";

const backgroundTask = async () => {
  console.log("👂 Background shake detection running...");
  Shake.addListener(async () => {
    console.log("📳 Shake detected!");
    
    if (Platform.OS === "android") {
      // Wake or open the app
      try {
        await Linking.openURL("safeher://"); // your deep link scheme
      } catch (err) {
        console.error("Failed to open app:", err);
      }
    }

    await emergencyService.sendEmergencyAlert();
  });

  // Keep service alive
  for (;;) {
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
};

const options = {
  taskName: "SafeHer",
  taskTitle: "SafeHer Active",
  taskDesc: "Listening for emergency shake trigger",
  taskIcon: { name: "ic_launcher", type: "mipmap" },
  color: "#DC2626",
  linkingURI: "safeher://",
  allowExecutionInForeground: true,
  stopWithTask: false,
};

export const shakeService = {
  async start() {
    const running = await BackgroundService.isRunning();
    if (!running) await BackgroundService.start(backgroundTask, options);
  },
  async stop() {
    await BackgroundService.stop();
  },
};
