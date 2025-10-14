package com.anonymous.boltexponativewind;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class NotificationActionReceiver extends BroadcastReceiver {
    private static final String TAG = "NotificationActionReceiver";
    public static final String ACTION_CANCEL_EMERGENCY = "com.anonymous.boltexponativewind.ACTION_CANCEL_EMERGENCY";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) {
            return;
        }

        if (ACTION_CANCEL_EMERGENCY.equals(intent.getAction())) {
            Log.d(TAG, "User cancelled emergency from notification.");
            
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                // The ID (1002) matches the ALERT_NOTIFICATION_ID in ShakeService.java
                nm.cancel(1002); 
            }
        }
    }
}

