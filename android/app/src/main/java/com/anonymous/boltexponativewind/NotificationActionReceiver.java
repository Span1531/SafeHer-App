package com.anonymous.boltexponativewind;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.app.NotificationManager;
import android.widget.Toast;

public class NotificationActionReceiver extends BroadcastReceiver {
    private static final String TAG = "NotificationActionReceiver";
    public static final String ACTION_SEND_EMERGENCY = "com.anonymous.boltexponativewind.ACTION_SEND_EMERGENCY";
    public static final String ACTION_CANCEL_EMERGENCY = "com.anonymous.boltexponativewind.ACTION_CANCEL_EMERGENCY";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();
        Log.d(TAG, "Notification action received: " + action);

        // Dismiss the alert notification
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(1002);

        if (ACTION_SEND_EMERGENCY.equals(action)) {
            Log.d(TAG, "✅ Sending emergency alert silently (background)");
            Toast.makeText(context, "Sending emergency alert...", Toast.LENGTH_SHORT).show();

            // If React context is alive → notify JS side
            if (MainApplication.hasReactContext()) {
                try {
                    MainApplication.sendEvent("onEmergencyConfirmed", null);
                    Log.d(TAG, "Sent emergency event to React");
                } catch (Exception e) {
                    Log.e(TAG, "Failed to send event to JS", e);
                }
            } else {
                // Native fallback if RN not active
                try {
                    Intent serviceIntent = new Intent(context, EmergencyDispatchService.class);
                    ContextCompat.startForegroundService(context, serviceIntent);
                    Log.d(TAG, "Started EmergencyDispatchService (native fallback)");
                } catch (Exception e) {
                    Log.e(TAG, "Failed to start EmergencyDispatchService", e);
                }
            }

        } else if (ACTION_CANCEL_EMERGENCY.equals(action)) {
            Log.d(TAG, "❌ Emergency alert cancelled by user");
        }
    }
}
