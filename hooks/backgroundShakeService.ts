import BackgroundService from "react-native-background-actions";
import RNShake from "react-native-shake";
import { emergencyService } from "./emergencyService";
import { Vibration, Alert } from "react-native";

let shakeSubscription: any = null;

const sleep = (time: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), time));

const backgroundTask = async () => {
  console.log("🚨 Background Shake Service active");

  shakeSubscription = RNShake.addListener(async () => {
    console.log("📳 Shake detected!");
    Vibration.vibrate(300); // Give feedback to user
    Alert.alert("🚨 Emergency Alert", "Shake detected! Sending alerts...");
    await emergencyService.sendEmergencyAlert();
  });

  for (;;) {
    await sleep(1000);
  }
};

export const backgroundShakeService = {
  async start() {
    if (BackgroundService.isRunning()) return;

    const options = {
      taskName: "SafeHer",
      taskTitle: "SafeHer Background Service",
      taskDesc: "Listening for shake triggers...",
      taskIcon: { name: "ic_launcher", type: "mipmap" },
      color: "#ff0000",
      parameters: {},
    };

    await BackgroundService.start(backgroundTask, options);
    console.log("✅ Background Shake Service started");
  },

  async stop() {
    if (shakeSubscription) {
      shakeSubscription.remove();
      shakeSubscription = null;
    }
    await BackgroundService.stop();
    console.log("🛑 Background Shake Service stopped");
  },
};
