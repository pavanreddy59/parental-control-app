package com.guardiansafe.parentalcontrol

import android.app.AppOpsManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Process
import android.provider.Settings
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.guardiansafe.parentalcontrol.databinding.ActivityMainBinding
import com.guardiansafe.parentalcontrol.receiver.DeviceAdminPolicyReceiver
import com.guardiansafe.parentalcontrol.service.LocationTrackingService
import com.guardiansafe.parentalcontrol.service.UsageMonitoringService

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val PERMISSION_REQUEST_LOCATION = 101

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupListeners()
        startActiveServices()
    }

    private fun setupListeners() {
        // 1. Usage stats permission check
        binding.btnUsageAccess.setOnClickListener {
            if (!hasUsageStatsPermission()) {
                startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
            } else {
                Toast.makeText(this, "Usage Access already granted!", Toast.LENGTH_SHORT).show()
            }
        }

        // 2. Accessibility Service setup
        binding.btnAccessibility.setOnClickListener {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
            Toast.makeText(this, "Enable 'GuardianPulse Protection' Service", Toast.LENGTH_LONG).show()
        }

        // 3. Location permissions
        binding.btnLocation.setOnClickListener {
            checkAndRequestLocationPermissions()
        }

        // 4. Device Admin activation
        binding.btnDeviceAdmin.setOnClickListener {
            val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            val component = ComponentName(this, DeviceAdminPolicyReceiver::class.java)
            if (!dpm.isAdminActive(component)) {
                val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                    putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, component)
                    putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, getString(R.string.device_admin_description))
                }
                startActivity(intent)
            } else {
                Toast.makeText(this, "Device Administrator already active!", Toast.LENGTH_SHORT).show()
            }
        }

        // 5. Emergency SOS trigger (FR-08)
        binding.btnEmergencySos.setOnClickListener {
            Toast.makeText(this, "🚨 Transmitting Emergency SOS with GPS location to parent...", Toast.LENGTH_LONG).show()
        }
    }

    private fun hasUsageStatsPermission(): Boolean {
        val appOps = getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), packageName)
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), packageName)
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    private fun checkAndRequestLocationPermissions() {
        val fineLocation = ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION)
        if (fineLocation != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(android.Manifest.permission.ACCESS_FINE_LOCATION, android.Manifest.permission.ACCESS_COARSE_LOCATION),
                PERMISSION_REQUEST_LOCATION
            )
        } else {
            Toast.makeText(this, "Location permission already granted!", Toast.LENGTH_SHORT).show()
        }
    }

    private fun startActiveServices() {
        // Start Usage Stats Tracking Foreground Service
        val usageIntent = Intent(this, UsageMonitoringService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(usageIntent)
        } else {
            startService(usageIntent)
        }

        // Start Location Tracking Foreground Service
        val locationIntent = Intent(this, LocationTrackingService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(locationIntent)
        } else {
            startService(locationIntent)
        }
    }
}

