package com.guardiansafe.parentalcontrol.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import com.guardiansafe.parentalcontrol.service.LocationTrackingService
import com.guardiansafe.parentalcontrol.service.UsageMonitoringService

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            // Restart Usage stats service
            val usageIntent = Intent(context, UsageMonitoringService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(usageIntent)
            } else {
                context.startService(usageIntent)
            }

            // Restart Location service
            val locIntent = Intent(context, LocationTrackingService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(locIntent)
            } else {
                context.startService(locIntent)
            }
        }
    }
}

