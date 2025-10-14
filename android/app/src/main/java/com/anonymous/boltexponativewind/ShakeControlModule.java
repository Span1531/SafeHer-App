package com.anonymous.boltexponativewind;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import android.Manifest;
import android.content.pm.PackageManager;
import android.os.PowerManager;
import android.provider.Settings;
import android.net.Uri;

import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

public class ShakeControlModule extends ReactContextBaseJavaModule {

    private static final String TAG = "ShakeControlModule";

    public ShakeControlModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "ShakeControlModule";
    }

    @ReactMethod
    public void startService(Promise promise) {
        ReactApplicationContext context = getReactApplicationContext();
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) 
                != PackageManager.PERMISSION_GRANTED) {
                Log.e(TAG, "Notification permission denied. Cannot start foreground service.");
                promise.reject("PERMISSION_DENIED", "Notification permission (Android 13+) is required but denied.");
                return;
            }
        }
        
        Intent serviceIntent = new Intent(context, ShakeService.class);
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
                Log.d(TAG, "Started ShakeService as foreground service (Android O+)");
            } else {
                context.startService(serviceIntent);
                Log.d(TAG, "Started ShakeService as regular service");
            }
            promise.resolve("Service started successfully");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start ShakeService: " + e.getMessage());
            promise.reject("START_ERROR", "Failed to start service: " + e.getMessage());
        }
    }

    @ReactMethod
    public void stopService(Promise promise) {
        ReactApplicationContext context = getReactApplicationContext();
        Intent serviceIntent = new Intent(context, ShakeService.class);
        
        try {
            boolean stopped = context.stopService(serviceIntent);
            Log.d(TAG, "Stopped ShakeService: " + stopped);
            promise.resolve("Service stopped");
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop ShakeService: " + e.getMessage());
            promise.reject("STOP_ERROR", "Failed to stop service: " + e.getMessage());
        }
    }

    @ReactMethod
    public void acknowledgeEmergencyEvent() {
        Log.d(TAG, "JS has acknowledged the emergency event. Stopping retries.");
        
        MainActivity.isEmergencyEventPending = false;
        if (MainActivity.retryRunnable != null) {
            MainActivity.retryHandler.removeCallbacks(MainActivity.retryRunnable);
        }
    }

    @ReactMethod
    public void checkBatteryOptimization(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                PowerManager pm = (PowerManager) getReactApplicationContext().getSystemService(Context.POWER_SERVICE);
                String packageName = getReactApplicationContext().getPackageName();
                
                if (pm != null) {
                    boolean isIgnoringBatteryOptimizations = pm.isIgnoringBatteryOptimizations(packageName);
                    
                    WritableMap result = Arguments.createMap();
                    result.putBoolean("isIgnoring", isIgnoringBatteryOptimizations);
                    
                    Log.d(TAG, "Battery optimization status: " + isIgnoringBatteryOptimizations);
                    promise.resolve(result);
                } else {
                    Log.e(TAG, "PowerManager is null");
                    promise.reject("ERROR", "PowerManager not available");
                }
            } catch (Exception e) {
                Log.e(TAG, "Error checking battery optimization: " + e.getMessage());
                promise.reject("ERROR", "Failed to check battery optimization: " + e.getMessage());
            }
        } else {
            WritableMap result = Arguments.createMap();
            result.putBoolean("isIgnoring", true); // Not applicable for API < 23
            promise.resolve(result);
        }
    }

    @ReactMethod
    public void requestBatteryOptimizationExemption(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Intent intent = new Intent();
                intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getReactApplicationContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getReactApplicationContext().startActivity(intent);
                
                Log.d(TAG, "Opened battery optimization settings");
                promise.resolve(true);
            } catch (Exception e) {
                Log.e(TAG, "Failed to open battery settings: " + e.getMessage());
                promise.reject("ERROR", "Failed to open battery settings: " + e.getMessage());
            }
        } else {
            Log.d(TAG, "Battery optimization not applicable for API < 23");
            promise.resolve(true); // Not applicable
        }
    }
}
