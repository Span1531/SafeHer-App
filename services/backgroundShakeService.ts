import BackgroundService from "react-native-background-actions";
import RNShake from "react-native-shake";
import { emergencyService } from "./emergencyService";

let shakeSubscription: any = null;

const sleep = (time: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), time));

const backgroundTask = async (taskData: any) => {
  console.log("🚨 Background Shake Service running...");

  shakeSubscription = RNShake.addListener(async () => {
    console.log("📳 Shake detected!");
    await emergencyService.sendEmergencyAlert();
  });

  try {
    for (;;) {
      await sleep(1000); // keep task alive
    }
  } catch (e) {
    console.error("Background task error:", e);
  }
};

export const backgroundShakeService = {
  async start() {
    if (BackgroundService.isRunning()) {
      console.log("Background service already running");
      return;
    }
    const options = {
      taskName: "SafeHer Background Service",
      taskTitle: "SafeHer is monitoring for emergencies",
      taskDesc: "Shake your phone to send an alert instantly",
      taskIcon: {
        name: "ic_launcher",
        type: "mipmap",
      },
      color: "#ff0000",
      linkingURI: "safeher://",
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
