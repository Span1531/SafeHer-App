package com.anonymous.boltexponativewind;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.widget.Toast;

public class EmergencyActionReceiver extends BroadcastReceiver {
    private static final String TAG = "EmergencyActionReceiver";
    public static final String ACTION_SEND_EMERGENCY = "com.anonymous.boltexponativewind.ACTION_SEND_EMERGENCY";
    public static final String ACTION_CANCEL_EMERGENCY = "com.anonymous.boltexponativewind.ACTION_CANCEL_EMERGENCY";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) {
            return;
        }

        String action = intent.getAction();
        Log.d(TAG, "Notification action received: " + action);

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(1002); // ALERT_NOTIFICATION_ID from ShakeService
        }

        if (ACTION_SEND_EMERGENCY.equals(action)) {
            Log.d(TAG, "User confirmed emergency. Starting background dispatch service...");
            
            Toast.makeText(context, "Sending emergency alert...", Toast.LENGTH_SHORT).show();

            // Start the service that will handle sending the SMS in the background
            Intent serviceIntent = new Intent(context, EmergencyDispatchService.class);
            context.startService(serviceIntent);

        } else if (ACTION_CANCEL_EMERGENCY.equals(action)) {
            Log.d(TAG, "User cancelled emergency from notification.");
        }
    }
}

