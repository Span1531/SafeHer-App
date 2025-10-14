package com.anonymous.boltexponativewind;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class SafeHerStorageModule extends ReactContextBaseJavaModule {
    private static final String PREFS_NAME = "SafeHerPrefs";
    private final ReactApplicationContext reactContext;

    public SafeHerStorageModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "SafeHerStorage";
    }

    @ReactMethod
    public void setValue(String key, String value) {
        try {
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(key, value).apply();

            // ✅ Verification
            String verify = prefs.getString(key, "⚠️ NOT FOUND");
            Log.d("SafeHerStorage", "📥 setValue called: key=" + key + ", value=" + value);
            Log.d("SafeHerStorage", "📤 Verified stored value in SharedPreferences: " + verify);
        } catch (Exception e) {
            Log.e("SafeHerStorage", "❌ Failed to store value", e);
        }
    }

    @ReactMethod
    public void getValue(String key, Promise promise) {
        try {
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String value = prefs.getString(key, "");
            promise.resolve(value);
        } catch (Exception e) {
            Log.e("SafeHerStorage", "❌ Failed to retrieve value", e);
            promise.reject("E_STORAGE", e);
        }
    }
}
