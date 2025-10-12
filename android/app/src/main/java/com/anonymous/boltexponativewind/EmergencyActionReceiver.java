package com.anonymous.boltexponativewind;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.app.NotificationManager;

public class EmergencyActionReceiver extends BroadcastReceiver {
    private static final String TAG = "EmergencyActionReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "Received action: " + action);

        NotificationManager notificationManager = 
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        if ("ACTION_SEND_EMERGENCY".equals(action)) {
            Log.d(TAG, "User confirmed emergency - sending alert NOW");
            
            // Cancel the notification
            if (notificationManager != null) {
                notificationManager.cancel(1002);
            }

            // Start the emergency alert service to send SMS
            Intent serviceIntent = new Intent(context, EmergencyAlertService.class);
            serviceIntent.setAction("SEND_EMERGENCY_SMS");
            context.startService(serviceIntent);
            
        } else if ("ACTION_CANCEL_EMERGENCY".equals(action)) {
            Log.d(TAG, "User cancelled emergency");
            
            // Just cancel the notification
            if (notificationManager != null) {
                notificationManager.cancel(1002);
            }
        }
    }
}