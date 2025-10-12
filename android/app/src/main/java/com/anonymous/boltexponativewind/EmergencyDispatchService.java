// File: android/app/src/main/java/com/anonymous/boltexponativewind/EmergencyDispatchService.java
package com.anonymous.boltexponativewind;

import android.Manifest;
import android.app.Service;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.NotificationChannel;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.SharedPreferences;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.telephony.SmsManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class EmergencyDispatchService extends Service {
    private static final String TAG = "EmergencyDispatchService";
    private static final String CHANNEL_ID = "safeher_emergency_dispatch";
    private static final String PREFS_NAME = "SafeHerPrefs";
    private static final String CONTACTS_KEY = "emergency_contacts";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        Log.d(TAG, "EmergencyDispatchService created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(2001, buildForegroundNotification("Preparing emergency alert..."));
        new Thread(this::sendEmergencyAlertsToAll).start();
        return START_NOT_STICKY;
    }

    private void sendEmergencyAlertsToAll() {
        try {
            // Step 1: Load all saved emergency contacts
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            String contactsString = prefs.getString(CONTACTS_KEY, "");
            List<String> contacts = new ArrayList<>();

            if (!contactsString.isEmpty()) {
                contacts = Arrays.asList(contactsString.split(","));
            }

            if (contacts.isEmpty()) {
                Log.w(TAG, "⚠️ No emergency contacts found!");
                updateNotification("⚠️ No contacts saved.");
                stopSelf();
                return;
            }

            // Step 2: Build formatted message
            String message = buildEmergencyMessage();

            // Step 3: Send to each contact
            SmsManager smsManager = SmsManager.getDefault();
            for (String number : contacts) {
                String trimmed = number.trim();
                if (trimmed.isEmpty()) continue;
                try {
                    smsManager.sendTextMessage(trimmed, null, message, null, null);
                    Log.d(TAG, "✅ Sent emergency SMS to " + trimmed);
                } catch (Exception e) {
                    Log.e(TAG, "❌ Failed to send SMS to " + trimmed, e);
                }
            }

            updateNotification("✅ Emergency alert sent to all contacts!");
            Log.d(TAG, "Emergency alerts dispatched successfully.");

        } catch (Exception e) {
            Log.e(TAG, "Failed to send emergency alerts", e);
            updateNotification("⚠️ Failed to send alerts.");
        }

        stopSelf();
    }

    private String buildEmergencyMessage() {
        String timestamp = new SimpleDateFormat("dd/MM/yyyy, hh:mm:ss a", Locale.getDefault())
                .format(new Date());

        String addressText = "Location unavailable";
        double latitude = 0.0, longitude = 0.0;

        try {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                    == PackageManager.PERMISSION_GRANTED) {

                android.location.LocationManager locationManager =
                        (android.location.LocationManager) getSystemService(Context.LOCATION_SERVICE);
                Location lastKnown = locationManager.getLastKnownLocation(
                        android.location.LocationManager.GPS_PROVIDER);

                if (lastKnown == null) {
                    lastKnown = locationManager.getLastKnownLocation(
                            android.location.LocationManager.NETWORK_PROVIDER);
                }

                if (lastKnown != null) {
                    latitude = lastKnown.getLatitude();
                    longitude = lastKnown.getLongitude();

                    Geocoder geocoder = new Geocoder(this, Locale.getDefault());
                    List<Address> addresses = geocoder.getFromLocation(latitude, longitude, 1);
                    if (addresses != null && !addresses.isEmpty()) {
                        Address addr = addresses.get(0);
                        addressText = addr.getAddressLine(0);
                    }
                }
            } else {
                Log.w(TAG, "Location permission not granted.");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting location/address", e);
        }

        return "🚨 EMERGENCY ALERT from SafeHer\n\n" +
               "I NEED HELP IMMEDIATELY!\n\n" +
               "Time: " + timestamp + "\n" +
               "Location: " + addressText + "\n\n" +
               "Google Maps: https://www.google.com/maps/search/?api=1&query=" +
               latitude + "," + longitude + "\n\n" +
               "Please check on me right away or call emergency services!\n\n" +
               "- Sent automatically by SafeHer";
    }

    private Notification buildForegroundNotification(String text) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("SafeHer Emergency")
            .setContentText(text)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build();
    }

    private void updateNotification(String text) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(2001, buildForegroundNotification(text));
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "SafeHer Emergency Dispatch",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Sends emergency alerts to all contacts in background");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
