package com.anonymous.boltexponativewind;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * V3 NOTE: This receiver is maintained for potential future use but currently does nothing.
 * The core V3 shake detection logic bypasses this receiver entirely, as detection 
 * and confirmation are handled within the persistent ShakeService.
 */
public class ShakeBroadcastReceiver extends BroadcastReceiver {
    private static final String TAG = "ShakeBroadcastReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        // This is the clean, stable V3 behavior: log the intent but take no action.
        Log.d(TAG, "ShakeBroadcastReceiver received obsolete intent: " + intent.getAction());
    }
}