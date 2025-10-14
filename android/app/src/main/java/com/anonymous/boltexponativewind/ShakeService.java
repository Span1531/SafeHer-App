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
import android.app.AlarmManager;

public class ShakeService extends Service implements SensorEventListener {
    private static final String TAG = "ShakeService";
    private static final String CHANNEL_ID = "safeher_shake_detection";
    private static final int NOTIFICATION_ID = 1001;
    private static final int ALERT_NOTIFICATION_ID = 1002;

    // Shake detection parameters
    private static final float SHAKE_THRESHOLD_GRAVITY = 2.7F;
    private static final int SHAKE_SLOP_TIME_MS = 500;
    private static final int SHAKE_COUNT_RESET_TIME_MS = 3000;
    private static final int SHAKE_COUNT_THRESHOLD = 3;

    private SensorManager sensorManager;
    private Sensor accelerometer;
    private long lastShakeTime;
    private int shakeCount;

    private boolean isServiceRunning = false;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "ShakeService onCreate");
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager != null) {
            accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
            if (accelerometer == null) {
                Log.e(TAG, "Accelerometer sensor not available!");
            }
        }
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "ShakeService onStartCommand");
        if (!isServiceRunning) {
            startForeground(NOTIFICATION_ID, createPersistentNotification());
            if (accelerometer != null) {
                sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_UI);
                Log.d(TAG, "Accelerometer listener registered.");
            }
            isServiceRunning = true;
            ServiceWatchdog.scheduleServiceCheck(this);
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.w(TAG, "ShakeService onDestroy - Service is being destroyed.");
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
        isServiceRunning = false;
        // The ServiceRestartReceiver will be triggered by the system or watchdog
    }
    
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.w(TAG, "onTaskRemoved called - User swiped app away. Scheduling restart.");
        sendRestartBroadcast();
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_ACCELEROMETER) return;

        long now = System.currentTimeMillis();
        if ((now - lastShakeTime) > SHAKE_SLOP_TIME_MS) {
            if ((now - lastShakeTime) > SHAKE_COUNT_RESET_TIME_MS) {
                shakeCount = 0;
            }

            float x = event.values[0];
            float y = event.values[1];
            float z = event.values[2];

            double gForce = Math.sqrt(x * x + y * y + z * z);

            if (gForce > SHAKE_THRESHOLD_GRAVITY * SensorManager.GRAVITY_EARTH) {
                lastShakeTime = now;
                shakeCount++;
                Log.d(TAG, "Shake detected! Count: " + shakeCount + "/" + SHAKE_COUNT_THRESHOLD);
                if (shakeCount >= SHAKE_COUNT_THRESHOLD) {
                    onTripleShakeDetected();
                    shakeCount = 0; // Reset after triggering
                }
            }
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // Not used
    }

    private void onTripleShakeDetected() {
        Log.d(TAG, "🚨 TRIPLE SHAKE DETECTED! Showing confirmation notification.");
        if (MainApplication.hasReactContext()) {
            MainApplication.sendEvent("onShakeWarning", null);
        }
        showAlertConfirmationNotification();
    }

    private void showAlertConfirmationNotification() {
        Intent yesIntent = new Intent(this, EmergencyActionReceiver.class);
        yesIntent.setAction(EmergencyActionReceiver.ACTION_SEND_EMERGENCY);
        PendingIntent yesPendingIntent = PendingIntent.getBroadcast(
            this, 1, yesIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        Intent noIntent = new Intent(this, EmergencyActionReceiver.class);
        noIntent.setAction(EmergencyActionReceiver.ACTION_CANCEL_EMERGENCY);
        PendingIntent noPendingIntent = PendingIntent.getBroadcast(
            this, 2, noIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🚨 Emergency Detected!")
            .setContentText("Triple shake detected. Send emergency alert?")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .addAction(android.R.drawable.ic_menu_send, "YES - SEND ALERT", yesPendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "NO - CANCEL", noPendingIntent)
            .build();

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(ALERT_NOTIFICATION_ID, notification);
            Log.d(TAG, "Alert confirmation notification shown.");
        }
    }

    private Notification createPersistentNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SafeHer Active")
            .setContentText("Shake detection is running in the background.")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "SafeHer Shake Detection", NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Persistent notification to keep shake detection service alive.");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private void sendRestartBroadcast() {
        Intent broadcastIntent = new Intent(this, ServiceRestartReceiver.class);
        sendBroadcast(broadcastIntent);
        Log.d(TAG, "Sent restart broadcast for ShakeService.");
    }
}

