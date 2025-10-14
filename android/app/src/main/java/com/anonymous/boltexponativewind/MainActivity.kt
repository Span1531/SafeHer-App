package com.anonymous.boltexponativewind

import expo.modules.splashscreen.SplashScreenManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.content.Intent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  companion object {
    private const val TAG = "MainActivity"
    
    @JvmField
    var isEmergencyEventPending = false
    @JvmField
    var retryHandler = Handler(Looper.getMainLooper())
    @JvmField
    var retryRunnable: Runnable? = null
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    SplashScreenManager.registerOnActivity(this)
    super.onCreate(null)
    Log.d(TAG, "MainActivity onCreate")
    handleEmergencyIntent(intent)
  }

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              super.invokeDefaultOnBackPressed()
          }
          return
      }
      super.invokeDefaultOnBackPressed()
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    Log.d(TAG, "MainActivity onNewIntent")
    setIntent(intent)
    handleEmergencyIntent(intent)
  }

  private fun handleEmergencyIntent(intent: Intent?) {
    if (intent?.getBooleanExtra("trigger_emergency", false) == true) {
      Log.d(TAG, "EMERGENCY TRIGGER: Intent received. Starting event dispatch attempts.")
      isEmergencyEventPending = true
      
      startEmergencyEventSender()

      intent.removeExtra("trigger_emergency")
    }
  }

  private fun startEmergencyEventSender() {
    retryRunnable?.let { retryHandler.removeCallbacks(it) }

    retryRunnable = object : Runnable {
      private var attempts = 0
      override fun run() {
        if (!isEmergencyEventPending) {
          Log.d(TAG, "SUCCESS: Event acknowledged by JS. Stopping retry sender.")
          return
        }

        if (attempts >= 5) {
          Log.e(TAG, "FAILURE: Event was not acknowledged by JS after 5 attempts. Stopping.")
          isEmergencyEventPending = false
          return
        }

        Log.d(TAG, "Attempt #${attempts + 1}: Firing 'onEmergencyConfirmed' event to JS...")
        MainApplication.sendEvent("onEmergencyConfirmed", null)
        
        attempts++
        retryHandler.postDelayed(this, 1000)
      }
    }
    retryHandler.post(retryRunnable!!)
  }
}
