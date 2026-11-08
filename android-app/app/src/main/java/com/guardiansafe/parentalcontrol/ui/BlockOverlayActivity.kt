package com.guardiansafe.parentalcontrol.ui

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.guardiansafe.parentalcontrol.databinding.ActivityBlockOverlayBinding

class BlockOverlayActivity : AppCompatActivity() {

    private lateinit var binding: ActivityBlockOverlayBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityBlockOverlayBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val appName = intent.getStringExtra("EXTRA_APP_NAME") ?: "This application"
        val reason = intent.getStringExtra("EXTRA_REASON") ?: "Restricted by Parental Controls"

        binding.tvBlockedTitle.text = "$appName Restricted"
        binding.tvBlockedReason.text = reason

        binding.btnReturnHome.setOnClickListener {
            val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(homeIntent)
            finish()
        }

        binding.btnRequestTime.setOnClickListener {
            // Sends request to parent
            finish()
        }
    }

    override fun onBackPressed() {
        // Prevent back press from returning to blocked app
        val homeIntent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        startActivity(homeIntent)
        finish()
    }
}

