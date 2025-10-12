package com.anonymous.boltexponativewind;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;
import android.telephony.SmsManager;
import android.location.Location;
import android.location.LocationManager;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.FileInputStream;
import java.util.ArrayList;

public class EmergencyAlertService extends Service {
    private static final String TAG = "EmergencyAlertService";

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "SEND_EMERGENCY_SMS".equals(intent.getAction())) {
            Log.d(TAG, "🚨 Starting emergency SMS send...");
            
            // Send SMS in background thread
            new Thread(() -> {
                try {
                    sendEmergencySMS();
                } catch (Exception e) {
                    Log.e(TAG, "❌ Failed to send emergency SMS", e);
                } finally {
                    stopSelf();
                }
            }).start();
        }
        return START_NOT_STICKY;
    }

    private void sendEmergencySMS() {
        try {
            // 1. Get emergency contacts from AsyncStorage
            ArrayList<String> contacts = getEmergencyContacts();
            
            if (contacts.isEmpty()) {
                Log.e(TAG, "❌ No emergency contacts found!");
                return;
            }

            Log.d(TAG, "📱 Found " + contacts.size() + " emergency contacts");

            // 2. Get current location
            Location location = getCurrentLocation();
            
            if (location == null) {
                Log.e(TAG, "❌ Could not get location!");
                return;
            }

            double latitude = location.getLatitude();
            double longitude = location.getLongitude();
            
            Log.d(TAG, "📍 Location: " + latitude + ", " + longitude);

            // 3. Build emergency message
            String mapsLink = "https://www.google.com/maps/search/?api=1&query=" + latitude + "," + longitude;
            String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date());
            
            String message = "🚨 EMERGENCY ALERT from SafeHer\n\n" +
                           "I NEED HELP IMMEDIATELY!\n\n" +
                           "Time: " + timestamp + "\n" +
                           "Location: Lat: " + String.format("%.6f", latitude) + 
                           ", Long: " + String.format("%.6f", longitude) + "\n\n" +
                           "Google Maps: " + mapsLink + "\n\n" +
                           "Please check on me right away or call emergency services!\n\n" +
                           "- Sent automatically by SafeHer";

            Log.d(TAG, "📝 Message prepared, length: " + message.length());

            // 4. Send SMS to all contacts
            SmsManager smsManager = SmsManager.getDefault();
            
            for (String phoneNumber : contacts) {
                try {
                    Log.d(TAG, "📤 Sending SMS to: " + phoneNumber);
                    
                    // Split message if too long
                    ArrayList<String> parts = smsManager.divideMessage(message);
                    
                    if (parts.size() == 1) {
                        smsManager.sendTextMessage(phoneNumber, null, message, null, null);
                    } else {
                        smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null);
                    }
                    
                    Log.d(TAG, "✅ SMS sent to: " + phoneNumber);
                    
                } catch (Exception e) {
                    Log.e(TAG, "❌ Failed to send SMS to " + phoneNumber, e);
                }
            }

            Log.d(TAG, "✅ Emergency SMS sending completed!");

        } catch (Exception e) {
            Log.e(TAG, "❌ Error in sendEmergencySMS", e);
        }
    }

    private ArrayList<String> getEmergencyContacts() {
        ArrayList<String> contacts = new ArrayList<>();
        
        try {
            // Read from AsyncStorage (stored in shared_prefs)
            String filename = getApplicationContext().getPackageName() + "_preferences";
            FileInputStream fis = openFileInput("RKStorage");
            BufferedReader reader = new BufferedReader(new InputStreamReader(fis));
            StringBuilder json = new StringBuilder();
            String line;
            
            while ((line = reader.readLine()) != null) {
                json.append(line);
            }
            reader.close();
            
            // Parse JSON to find contacts
            String jsonString = json.toString();
            if (jsonString.contains("@safeher_emergency_contacts")) {
                // Extract the contacts JSON
                int start = jsonString.indexOf("[", jsonString.indexOf("@safeher_emergency_contacts"));
                if (start > 0) {
                    int end = jsonString.indexOf("]", start) + 1;
                    String contactsJson = jsonString.substring(start, end);
                    
                    JSONArray contactsArray = new JSONArray(contactsJson);
                    for (int i = 0; i < contactsArray.length(); i++) {
                        JSONObject contact = contactsArray.getJSONObject(i);
                        String phone = contact.getString("phone");
                        contacts.add(phone);
                    }
                }
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error reading contacts from storage", e);
        }
        
        return contacts;
    }

    private Location getCurrentLocation() {
        try {
            LocationManager locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
            
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) 
                != PackageManager.PERMISSION_GRANTED) {
                Log.e(TAG, "Location permission not granted");
                return null;
            }

            // Try GPS first
            Location location = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            
            // If GPS unavailable, try network
            if (location == null) {
                location = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            }

            return location;
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting location", e);
            return null;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}