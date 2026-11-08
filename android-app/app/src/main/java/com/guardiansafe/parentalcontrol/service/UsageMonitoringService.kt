package com.guardiansafe.parentalcontrol.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.guardiansafe.parentalcontrol.data.AppDatabase
import com.guardiansafe.parentalcontrol.data.UsageRecord
import com.guardiansafe.parentalcontrol.network.ApiClient
import com.guardiansafe.parentalcontrol.network.UsageLogRequest
import kotlinx.coroutines.*

class UsageMonitoringService : Service() {

    private val job = SupervisorJob()
    private val scope = CoroutineScope(Dispatchers.IO + job)
    private val CHANNEL_ID = "guardian_usage_channel"

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(1001, buildNotification())
        startMonitoringLoop()
    }

    private fun startMonitoringLoop() {
        scope.launch {
            val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val db = AppDatabase.getDatabase(applicationContext)

            while (isActive) {
                val endTime = System.currentTimeMillis()
                val startTime = endTime - 10_000 // Last 10 seconds

                val usageStats = usageStatsManager.queryUsageStats(
                    UsageStatsManager.INTERVAL_DAILY,
                    startTime,
                    endTime
                )

                val recentApp = usageStats.maxByOrNull { it.lastTimeUsed }
                if (recentApp != null && recentApp.totalTimeInForeground > 0) {
                    val pkg = recentApp.packageName
                    val appName = pkg.substringAfterLast('.')

                    // Save locally in Room SQLite
                    db.usageDao().insertUsage(
                        UsageRecord(packageName = pkg, appName = appName, durationSeconds = 10)
                    )

                    // Sync to Cloud REST backend (FR-03, FR-09)
                    try {
                        ApiClient.api.logAppUsage(
                            UsageLogRequest(
                                deviceId = 1,
                                childId = 1,
                                packageName = pkg,
                                appName = appName,
                                category = "Monitored",
                                durationSeconds = 10
                            )
                        )
                    } catch (e: Exception) {
                        // Will sync later via Room database
                    }
                }

                delay(10_000)
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "GuardianPulse Protection Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("GuardianPulse Active")
            .setContentText("Monitoring screen time and maintaining device safety.")
            .setSmallIcon(android.R.drawable.ic_dialog_shield)
            .setOngoing(true)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        job.cancel()
    }
}

