package com.anonymous.boltexponativewind

import expo.modules.splashscreen.SplashScreenManager

import android.os.Build
import android.os.Bundle
import android.util.Log
import android.content.Intent

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.bridge.ReactContext 
import com.facebook.react.ReactInstanceManager 

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  companion object {
    private const val TAG = "MainActivity"
  }

  // Define the Listener Object as a class member
  private val mEmergencyListener: ReactInstanceManager.ReactInstanceEventListener = 
      object : ReactInstanceManager.ReactInstanceEventListener {
          
          override fun onReactContextInitialized(context: ReactContext) {
              val emitter = context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
              emitter?.emit("onEmergencyConfirmed", null)
              Log.d(TAG, "Emergency event dispatched on Context Initialized.")
              
              // Remove the listener immediately after dispatching the event
              reactInstanceManager?.removeReactInstanceEventListener(this)
          }
      }

  override fun onCreate(savedInstanceState: Bundle?) {
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
    super.onCreate(null)
    
    Log.d(TAG, "MainActivity onCreate")
    
    // Check if launched from emergency notification
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
      Log.d(TAG, "Emergency trigger detected from intent. Attaching listener.")
      
      // Attach the pre-defined listener object instance
      reactInstanceManager?.addReactInstanceEventListener(mEmergencyListener)
    }
  }
}