// File: android/app/src/main/java/com/anonymous/boltexponativewind/ShakeService.java
package com.anonymous.boltexponativewind;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;

import android.content.pm.ServiceInfo;
import android.app.AlarmManager;

public class ShakeService extends Service implements SensorEventListener {
    private static final String TAG = "ShakeService";
    private static final String CHANNEL_ID = "safeher_shake_detection";
    private static final int NOTIFICATION_ID = 1001;
    private static final int ALERT_NOTIFICATION_ID = 1002;

    // Shake detection parameters
    private static final float SHAKE_THRESHOLD = 15.0f;
    private static final int SHAKE_COUNT_THRESHOLD = 3;
    private static final long SHAKE_TIME_WINDOW = 3000; // 3 seconds

    private SensorManager sensorManager;
    private Sensor accelerometer;
    private long lastShakeTime = 0;
    private int shakeCount = 0;
    private long firstShakeTime = 0;

    private boolean isServiceRunning = false;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "ShakeService onCreate");

        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager != null) {
            accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
            if (accelerometer == null) {
                Log.e(TAG, "No accelerometer found on device!");
            }
        }

        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String source = intent != null ? intent.getStringExtra("source") : "null";
        Log.d(TAG, "ShakeService onStartCommand. Source: " + source);

        if (!isServiceRunning) {
            Notification notification = createPersistentNotification();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                );
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }

            if (accelerometer != null) {
                sensorManager.registerListener(
                    this,
                    accelerometer,
                    SensorManager.SENSOR_DELAY_NORMAL
                );
                Log.d(TAG, "Accelerometer listener registered");
            }

            isServiceRunning = true;

            // Watchdog scheduling (permission checked)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                if (alarmManager != null && alarmManager.canScheduleExactAlarms()) {
                    ServiceWatchdog.scheduleServiceCheck(this);
                    Log.d(TAG, "Watchdog scheduled successfully.");
                } else {
                    Log.w(TAG, "Exact Alarm permission denied. Watchdog disabled.");
                }
            } else {
                ServiceWatchdog.scheduleServiceCheck(this);
            }

            Log.d(TAG, "ShakeService started successfully");
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "ShakeService onDestroy - Service is stopping");

        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
            Log.d(TAG, "Sensor listener unregistered");
        }

        ServiceWatchdog.cancelServiceCheck(this);
        sendRestartBroadcast();
        isServiceRunning = false;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.d(TAG, "ShakeService onTaskRemoved: User swiped app away. Restarting service immediately.");

        Intent restartServiceIntent = new Intent(getApplicationContext(), this.getClass());
        restartServiceIntent.setPackage(getPackageName());
        restartServiceIntent.putExtra("source", "task_removed");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(restartServiceIntent);
        } else {
            startService(restartServiceIntent);
        }

        ServiceWatchdog.scheduleServiceCheck(this);
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_ACCELEROMETER) return;

        float x = event.values[0];
        float y = event.values[1];
        float z = event.values[2];
        float acceleration = (float) Math.sqrt(x * x + y * y + z * z) - SensorManager.GRAVITY_EARTH;

        if (acceleration > SHAKE_THRESHOLD) {
            long currentTime = System.currentTimeMillis();

            if (currentTime - lastShakeTime > 500) {
                if (currentTime - firstShakeTime > SHAKE_TIME_WINDOW) {
                    shakeCount = 0;
                    firstShakeTime = currentTime;
                }

                shakeCount++;
                lastShakeTime = currentTime;

                Log.d(TAG, "Shake detected! Count: " + shakeCount + "/" + SHAKE_COUNT_THRESHOLD);

                if (shakeCount >= SHAKE_COUNT_THRESHOLD) {
                    Log.d(TAG, "🚨 TRIPLE SHAKE DETECTED!");
                    onTripleShakeDetected();

                    shakeCount = 0;
                    firstShakeTime = 0;
                }
            }
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // Not needed
    }

    private void onTripleShakeDetected() {
        Log.d(TAG, "Triple shake detected - showing alert notification");

        if (MainApplication.hasReactContext()) {
            try {
                MainApplication.sendEvent("onShakeWarning", null);
            } catch (Exception e) {
                Log.e(TAG, "Failed to send shake warning event to JS", e);
            }
        }

        showAlertConfirmationNotification();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "SafeHer Shake Detection",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Background shake detection for emergency alerts");
            channel.setShowBadge(false);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
                Log.d(TAG, "Notification channel created");
            }
        }
    }

    private Notification createPersistentNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SafeHer Active")
            .setContentText("Shake detection monitoring... Tap to open app")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }

    private void showAlertConfirmationNotification() {
        // YES Action → handled by NotificationActionReceiver
        Intent yesIntent = new Intent(this, NotificationActionReceiver.class);
        yesIntent.setAction(NotificationActionReceiver.ACTION_SEND_EMERGENCY);
        PendingIntent yesPendingIntent = PendingIntent.getBroadcast(
            this,
            0,
            yesIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        // NO Action → handled by NotificationActionReceiver
        Intent noIntent = new Intent(this, NotificationActionReceiver.class);
        noIntent.setAction(NotificationActionReceiver.ACTION_CANCEL_EMERGENCY);
        PendingIntent noPendingIntent = PendingIntent.getBroadcast(
            this,
            1,
            noIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🚨 Emergency Detected!")
            .setContentText("Triple shake detected. Send emergency alert?")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setTimeoutAfter(10000)
            .addAction(android.R.drawable.ic_menu_send, "YES - SEND ALERT", yesPendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "NO - CANCEL", noPendingIntent)
            .build();

        NotificationManager notificationManager =
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        if (notificationManager != null) {
            notificationManager.notify(ALERT_NOTIFICATION_ID, notification);
            Log.d(TAG, "Alert confirmation notification shown");
        }
    }

    private void sendRestartBroadcast() {
        Intent broadcastIntent = new Intent(this, ServiceRestartReceiver.class);
        sendBroadcast(broadcastIntent);
        Log.d(TAG, "Restart broadcast sent");
    }
}
