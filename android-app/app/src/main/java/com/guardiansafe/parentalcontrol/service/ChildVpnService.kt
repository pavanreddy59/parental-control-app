package com.guardiansafe.parentalcontrol.service

import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor

class ChildVpnService : VpnService() {

    private var vpnInterface: ParcelFileDescriptor? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (vpnInterface == null) {
            val builder = Builder()
                .addAddress("10.1.10.1", 24)
                .addDnsServer("1.1.1.3") // Family Safe Filter DNS (Cloudflare Family DNS)
                .setSession("GuardianSafeFilter")

            vpnInterface = builder.establish()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        vpnInterface?.close()
        vpnInterface = null
    }
}

