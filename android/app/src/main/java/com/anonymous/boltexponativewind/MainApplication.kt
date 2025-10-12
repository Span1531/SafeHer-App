package com.anonymous.boltexponativewind

import android.app.Application
import android.content.res.Configuration
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainApplication : Application(), ReactApplication {

    // 1. COMPANION OBJECT: Static methods for communicating with React Native
    companion object {
        private var reactContext: ReactContext? = null

        @JvmStatic // <<< CRITICAL FIX for Java interop
        fun hasReactContext(): Boolean {
            // Checks if the React context is loaded and active
            return reactContext != null && reactContext!!.hasActiveCatalystInstance()
        }
        
        @JvmStatic // <<< CRITICAL FIX for Java interop
        fun sendEvent(eventName: String, params: WritableMap?) {
            // Sends event to JavaScript layer (used by ShakeService for foreground UI feedback)
            if (reactContext != null && reactContext!!.hasActiveCatalystInstance()) {
                reactContext!!.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(eventName, params)
            }
        }
    }
    // --------------------------------------------------------------------------

    override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
        this,
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this).packages.apply {
                    // CRITICAL: Add our custom ShakePackage for native modules
                    add(ShakePackage())
                }

            override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        }
    )

    override val reactHost: ReactHost
        get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        
        DefaultNewArchitectureEntryPoint.releaseLevel = try {
            ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
        } catch (e: IllegalArgumentException) {
            ReleaseLevel.STABLE
        }
        
        loadReactNative(this)
        ApplicationLifecycleDispatcher.onApplicationCreate(this)
        
        // CRITICAL FIX: Attach context listener to store the active ReactContext
        reactNativeHost.reactInstanceManager.addReactInstanceEventListener(
            com.facebook.react.ReactInstanceManager.ReactInstanceEventListener { context: ReactContext? ->
                reactContext = context
            }
        )
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
    }
}