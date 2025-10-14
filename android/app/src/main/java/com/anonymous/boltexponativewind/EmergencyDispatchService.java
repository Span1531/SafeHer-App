package com.anonymous.boltexponativewind;

import android.Manifest;
import android.app.Service;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.NotificationChannel;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.SharedPreferences;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.os.IBinder;
import android.telephony.SmsManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import android.content.pm.ServiceInfo;

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

    private SmsStatusReceiver smsStatusReceiver;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        // ✅ Register receiver dynamically (required on modern Android)
        smsStatusReceiver = new SmsStatusReceiver();
        IntentFilter filter = new IntentFilter();
        filter.addAction("SMS_SENT");
        filter.addAction("SMS_DELIVERED");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    registerReceiver(smsStatusReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
} else {
    registerReceiver(smsStatusReceiver, filter);
}
        Log.d(TAG, "✅ SmsStatusReceiver registered at runtime.");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = buildForegroundNotification("Preparing emergency alert...");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(2001, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(2001, notification);
        }
        new Thread(this::sendEmergencyAlertsToAll).start();
        return START_NOT_STICKY;
    }

    private void sendEmergencyAlertsToAll() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            String contactsString = prefs.getString(CONTACTS_KEY, "");
            if (contactsString.isEmpty()) {
                Log.w(TAG, "⚠️ No emergency contacts found!");
                stopSelf();
                return;
            }

            // ✅ Check SMS permission before sending
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS)
                    != PackageManager.PERMISSION_GRANTED) {
                Log.e(TAG, "❌ SEND_SMS permission missing!");
                updateNotification("❌ Permission missing: SMS blocked");
                stopSelf();
                return;
            }

            List<String> contacts = Arrays.asList(contactsString.split(","));
            String message = buildEmergencyMessage();
            SmsManager smsManager = SmsManager.getDefault();
            int sentCount = 0;

            for (String number : contacts) {
                String trimmed = number.trim();
                if (trimmed.isEmpty()) continue;

                // ✅ Add +91 prefix if missing
                if (!trimmed.startsWith("+")) {
                    trimmed = "+91" + trimmed;
                    Log.d(TAG, "📞 Added country code: " + trimmed);
                }

                try {
                    ArrayList<String> parts = smsManager.divideMessage(message);
                    long uniqueSeed = System.currentTimeMillis() + sentCount * 10;

                    ArrayList<PendingIntent> sentPIs = new ArrayList<>();
                    ArrayList<PendingIntent> deliveredPIs = new ArrayList<>();

                    for (int i = 0; i < parts.size(); i++) {
                        int reqCodeSent = (int) (uniqueSeed + i);
                        int reqCodeDel = (int) (uniqueSeed + i + 1000);

                        Intent sentIntent = new Intent("SMS_SENT");
                        sentIntent.putExtra("recipient", trimmed);
                        PendingIntent sentPI = PendingIntent.getBroadcast(
                                this, reqCodeSent, sentIntent,
                                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

                        Intent deliveredIntent = new Intent("SMS_DELIVERED");
                        deliveredIntent.putExtra("recipient", trimmed);
                        PendingIntent deliveredPI = PendingIntent.getBroadcast(
                                this, reqCodeDel, deliveredIntent,
                                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

                        sentPIs.add(sentPI);
                        deliveredPIs.add(deliveredPI);
                    }

                    if (parts.size() > 1) {
                        smsManager.sendMultipartTextMessage(trimmed, null, parts, sentPIs, deliveredPIs);
                        Log.d(TAG, "📝 Sent multipart SMS (" + parts.size() + " parts) to " + trimmed);
                    } else {
                        smsManager.sendTextMessage(trimmed, null, message, sentPIs.get(0), deliveredPIs.get(0));
                        Log.d(TAG, "📤 Sent single-part SMS to " + trimmed);
                    }

                    sentCount++;
                } catch (Exception e) {
                    Log.e(TAG, "❌ Failed to send SMS to " + trimmed, e);
                }
            }

            Log.d(TAG, "📊 Total SMS attempts: " + sentCount);
            updateNotification("✅ Alert attempted to " + sentCount + " contacts!");
        } catch (Exception e) {
            Log.e(TAG, "Fatal failure during background dispatch", e);
        } finally {
            try { Thread.sleep(4000); } catch (InterruptedException ignored) {}
            stopSelf();
        }
    }

    private String buildEmergencyMessage() {
        String timestamp = new SimpleDateFormat("dd/MM/yyyy, hh:mm:ss a", Locale.getDefault()).format(new Date());
        String addressText = "Location unavailable";
        double latitude = 0.0, longitude = 0.0;

        try {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                    == PackageManager.PERMISSION_GRANTED) {
                LocationManager lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
                Location lastKnown = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                if (lastKnown == null)
                    lastKnown = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);

                if (lastKnown != null) {
                    latitude = lastKnown.getLatitude();
                    longitude = lastKnown.getLongitude();
                    try {
                        Geocoder geocoder = new Geocoder(this, Locale.getDefault());
                        List<Address> addresses = geocoder.getFromLocation(latitude, longitude, 1);
                        if (addresses != null && !addresses.isEmpty()) {
                            addressText = addresses.get(0).getAddressLine(0);
                        } else {
                            addressText = "Lat: " + latitude + ", Lon: " + longitude;
                        }
                    } catch (Exception geocoderException) {
                        addressText = "Lat: " + latitude + ", Lon: " + longitude;
                    }
                }
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
                "Please check on me or call emergency services!\n\n" +
                "- Sent automatically by SafeHer";
    }

    private Notification buildForegroundNotification(String text) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("SafeHer Emergency")
                .setContentText(text)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setOngoing(true)
                .build();
    }

    private void updateNotification(String text) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(2001, buildForegroundNotification(text));
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "SafeHer Emergency Dispatch", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Sends emergency alerts to contacts");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            if (smsStatusReceiver != null) {
                unregisterReceiver(smsStatusReceiver);
                Log.d(TAG, "✅ SmsStatusReceiver unregistered.");
            }
        } catch (Exception e) {
            Log.w(TAG, "⚠️ SmsStatusReceiver unregister error: " + e.getMessage());
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
