package com.guardiansafe.parentalcontrol.data

import androidx.room.*

@Dao
interface UsageDao {
    @Insert
    suspend fun insertUsage(record: UsageRecord): Long

    @Query("SELECT * FROM local_usage_records WHERE isSynced = 0")
    suspend fun getUnsyncedRecords(): List<UsageRecord>

    @Query("UPDATE local_usage_records SET isSynced = 1 WHERE id IN (:ids)")
    suspend fun markAsSynced(ids: List<Long>)

    @Query("SELECT SUM(durationSeconds) FROM local_usage_records WHERE timestamp >= :sinceTimestamp")
    suspend fun getTotalScreenTimeSince(sinceTimestamp: Long): Long?
}

