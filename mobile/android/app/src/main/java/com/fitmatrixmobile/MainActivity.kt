package com.fitmatrixmobile

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // Register the activity result launcher so Health Connect permission
    // contracts can be resolved. Must be called before requestPermission.
    HealthConnectPermissionDelegate.setPermissionDelegate(this)
  }

  override fun getMainComponentName(): String = "FitMatrixMobile"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}


