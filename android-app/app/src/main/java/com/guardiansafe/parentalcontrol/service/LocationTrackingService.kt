package com.guardiansafe.parentalcontrol.service

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.guardiansafe.parentalcontrol.network.ApiClient
import com.guardiansafe.parentalcontrol.network.LocationUpdateRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class LocationTrackingService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val scope = CoroutineScope(Dispatchers.IO)
    private val CHANNEL_ID = "guardian_location_channel"

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(1002, buildNotification())

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        setupLocationUpdates()
    }

    @SuppressLint("MissingPermission")
    private fun setupLocationUpdates() {
        val request = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, 30_000)
            .setMinUpdateIntervalMillis(15_000)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                for (location in result.locations) {
                    sendLocationToBackend(location)
                }
            }
        }

        try {
            fusedLocationClient.requestLocationUpdates(request, locationCallback, mainLooper)
        } catch (e: SecurityException) {
            // Permissions not yet granted
        }
    }

    private fun sendLocationToBackend(loc: Location) {
        scope.launch {
            try {
                ApiClient.api.updateLocation(
                    LocationUpdateRequest(
                        deviceId = 1,
                        childId = 1,
                        latitude = loc.latitude,
                        longitude = loc.longitude,
                        speed = loc.speed,
                        address = "Live Mobile GPS Fix"
                    )
                )
            } catch (e: Exception) {
                // Ignore transient network hiccups
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "GuardianPulse Safety Location",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Guardian Location Active")
            .setContentText("Child GPS safety tracking is active.")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
    }
}

