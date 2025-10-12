package com.anonymous.boltexponativewind;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;
import android.util.Log;

/**
 * Periodically checks if ShakeService is running and restarts it if needed.
 * This file contains the CRITICAL FIX to check Exact Alarm permission before scheduling.
 */
public class ServiceWatchdog {
    private static final String TAG = "ServiceWatchdog";
    private static final long CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

    public static void scheduleServiceCheck(Context context) {
        // CRITICAL FIX: Check if the app has permission to set exact alarms (API 31+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null && !alarmManager.canScheduleExactAlarms()) {
                Log.w(TAG, "Watchdog cannot schedule: Exact alarm permission denied.");
                return; // Exit silently if permission is missing (NO CRASH)
            }
        }
        
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            Log.e(TAG, "AlarmManager not available");
            return;
        }

        Intent intent = new Intent(context, ServiceRestartReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            1001,
            intent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        // Schedule repeating exact alarm to survive Doze mode
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + CHECK_INTERVAL,
                pendingIntent
            );
        } else {
            alarmManager.setRepeating(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + CHECK_INTERVAL,
                CHECK_INTERVAL,
                pendingIntent
            );
        }
        Log.d(TAG, "Service watchdog scheduled - will check every 5 minutes");
    }

    public static void cancelServiceCheck(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(context, ServiceRestartReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            1001,
            intent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        alarmManager.cancel(pendingIntent);
        Log.d(TAG, "Service watchdog cancelled");
    }
}