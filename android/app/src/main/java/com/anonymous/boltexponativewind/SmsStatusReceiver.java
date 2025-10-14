package com.anonymous.boltexponativewind;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.telephony.SmsManager;
import android.util.Log;

public class SmsStatusReceiver extends BroadcastReceiver {
    private static final String TAG = "SmsStatusReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        
        if ("SMS_SENT".equals(action)) {
            switch (getResultCode()) {
                case Activity.RESULT_OK:
                    Log.i(TAG, "✅ SMS SENT successfully");
                    break;
                case SmsManager.RESULT_ERROR_GENERIC_FAILURE:
                    Log.e(TAG, "❌ SMS SEND FAILED: Generic failure");
                    break;
                case SmsManager.RESULT_ERROR_NO_SERVICE:
                    Log.e(TAG, "❌ SMS SEND FAILED: No service");
                    break;
                case SmsManager.RESULT_ERROR_NULL_PDU:
                    Log.e(TAG, "❌ SMS SEND FAILED: Null PDU");
                    break;
                case SmsManager.RESULT_ERROR_RADIO_OFF:
                    Log.e(TAG, "❌ SMS SEND FAILED: Radio off");
                    break;
            }
        } else if ("SMS_DELIVERED".equals(action)) {
            switch (getResultCode()) {
                case Activity.RESULT_OK:
                    Log.i(TAG, "✅ SMS DELIVERED successfully");
                    break;
                case Activity.RESULT_CANCELED:
                    Log.e(TAG, "❌ SMS DELIVERY FAILED");
                    break;
            }
        }
    }
}