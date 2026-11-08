package com.guardiansafe.parentalcontrol.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

// Data Transfer Objects
data class HeartbeatRequest(val deviceId: Long, val batteryLevel: Int, val currentApp: String)
data class UsageLogRequest(val deviceId: Long, val childId: Long, val packageName: String, val appName: String, val category: String, val durationSeconds: Long)
data class LocationUpdateRequest(val deviceId: Long, val childId: Long, val latitude: Double, val longitude: Double, val speed: Float, val address: String)
data class CheckAppRequest(val childId: Long, val packageName: String)
data class CheckAppResponse(val allowed: Boolean, val reason: String?)
data class SosRequest(val childId: Long, val latitude: Double, val longitude: Double)

interface ParentalControlApi {
    @POST("/api/devices/heartbeat")
    suspend fun sendHeartbeat(@Body request: HeartbeatRequest): Response<Map<String, Any>>

    @POST("/api/usage/log")
    suspend fun logAppUsage(@Body request: UsageLogRequest): Response<Map<String, Any>>

    @POST("/api/location/update")
    suspend fun updateLocation(@Body request: LocationUpdateRequest): Response<Map<String, Any>>

    @POST("/api/restrictions/check-allowed")
    suspend fun checkAppAllowed(@Body request: CheckAppRequest): Response<CheckAppResponse>

    @POST("/api/alerts/sos")
    suspend fun triggerSos(@Body request: SosRequest): Response<Map<String, Any>>

    @GET("/api/children/details")
    suspend fun getChildRules(@Query("childId") childId: Long): Response<Map<String, Any>>
}

