package com.anonymous.boltexponativewind;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * Receives restart broadcasts and restarts the service
 */
public class ServiceRestartReceiver extends BroadcastReceiver {
    private static final String TAG = "ServiceRestartReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "Restart broadcast received - restarting ShakeService");
        
        Intent serviceIntent = new Intent(context, ShakeService.class);
        serviceIntent.putExtra("source", "restart_receiver");
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
        
        // Immediately schedule the next check (Watchdog handles permission internally)
        ServiceWatchdog.scheduleServiceCheck(context);
        
        Log.d(TAG, "ShakeService restart requested");
    }
}