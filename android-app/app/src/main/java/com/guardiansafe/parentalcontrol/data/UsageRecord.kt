package com.guardiansafe.parentalcontrol.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "local_usage_records")
data class UsageRecord(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val packageName: String,
    val appName: String,
    val durationSeconds: Long,
    val timestamp: Long = System.currentTimeMillis(),
    val isSynced: Boolean = false
)

