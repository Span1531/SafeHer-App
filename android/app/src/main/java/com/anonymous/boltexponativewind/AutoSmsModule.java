
package com.anonymous.boltexponativewind;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.telephony.SmsManager;
import android.util.Log;
import android.widget.Toast;

import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.Promise;

import java.util.ArrayList;

public class AutoSmsModule extends ReactContextBaseJavaModule {
    
    private static final String MODULE_NAME = "AutoSmsModule";

    public AutoSmsModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void sendSms(ReadableArray phoneNumbers, String message, Promise promise) {
        Context context = getReactApplicationContext();
        
        // Check SMS permission
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) 
            != PackageManager.PERMISSION_GRANTED) {
            promise.reject("PERMISSION_DENIED", "SMS permission not granted");
            return;
        }
        
        try {
            SmsManager smsManager = SmsManager.getDefault();
            ArrayList<String> parts = smsManager.divideMessage(message);
            int successCount = 0;

            for (int i = 0; i < phoneNumbers.size(); i++) {
                String phoneNumber = phoneNumbers.getString(i);
                
                if (phoneNumber != null && !phoneNumber.isEmpty()) {
                    try {
                        // Send SMS silently without user interaction
                        if (parts.size() == 1) {
                            smsManager.sendTextMessage(
                                phoneNumber,
                                null,
                                message,
                                null,
                                null
                            );
                        } else {
                            smsManager.sendMultipartTextMessage(
                                phoneNumber,
                                null,
                                parts,
                                null,
                                null
                            );
                        }
                        Log.d(MODULE_NAME, "SMS sent successfully to: " + phoneNumber);
                        successCount++;
                    } catch (Exception e) {
                        Log.e(MODULE_NAME, "Failed to send SMS to " + phoneNumber + ": " + e.getMessage());
                    }
                }
            }
            
            if (successCount > 0) {
                Toast.makeText(context, "🚨 Emergency Alert Sent to " + successCount + " contacts", Toast.LENGTH_SHORT).show();
                promise.resolve("SMS sent to " + successCount + " contacts");
            } else {
                promise.reject("SEND_FAILED", "Failed to send SMS to any contact");
            }

        } catch (Exception e) {
            Log.e(MODULE_NAME, "SMS sending failed: " + e.getMessage());
            promise.reject("SEND_ERROR", "Error sending SMS: " + e.getMessage());
        }
    }

    @ReactMethod
    public void checkPermission(Promise promise) {
        Context context = getReactApplicationContext();
        boolean hasPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) 
            == PackageManager.PERMISSION_GRANTED;
        promise.resolve(hasPermission);
    }
}