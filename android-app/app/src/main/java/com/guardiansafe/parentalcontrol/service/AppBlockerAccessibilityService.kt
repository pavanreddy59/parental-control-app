package com.guardiansafe.parentalcontrol.service

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import com.guardiansafe.parentalcontrol.network.ApiClient
import com.guardiansafe.parentalcontrol.network.CheckAppRequest
import com.guardiansafe.parentalcontrol.ui.BlockOverlayActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class AppBlockerAccessibilityService : AccessibilityService() {

    private val scope = CoroutineScope(Dispatchers.IO)
    private var lastCheckedPackage: String? = null

    // Known default restricted apps
    private val localBlocklist = setOf(
        "com.zhiliaoapp.musically", // TikTok
        "com.instagram.android"      // Instagram
    )

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val packageName = event.packageName?.toString() ?: return
        if (packageName == applicationContext.packageName || packageName.contains("launcher") || packageName.contains("systemui")) {
            return
        }

        if (packageName == lastCheckedPackage) return
        lastCheckedPackage = packageName

        // Check local quick blocklist
        if (localBlocklist.contains(packageName)) {
            launchBlockOverlay(packageName, "Application is restricted by parental controls.")
            return
        }

        // Check remote backend in real-time
        scope.launch {
            try {
                val response = ApiClient.api.checkAppAllowed(CheckAppRequest(childId = 1, packageName = packageName))
                if (response.isSuccessful) {
                    val result = response.body()
                    if (result != null && !result.allowed) {
                        launchBlockOverlay(packageName, result.reason ?: "Restricted by parent.")
                    }
                }
            } catch (e: Exception) {
                // Network failure fallback
            }
        }
    }

    private fun launchBlockOverlay(packageName: String, reason: String) {
        val intent = Intent(this, BlockOverlayActivity::class.java).apply {
            putExtra("EXTRA_APP_NAME", packageName.substringAfterLast('.'))
            putExtra("EXTRA_REASON", reason)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        startActivity(intent)
    }

    override fun onInterrupt() {}
}

