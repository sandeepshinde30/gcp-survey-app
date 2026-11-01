package com.gcpsurvey.app.network

data class HotspotInfoState(
    val isActive: Boolean = false,
    val ssid: String = "GCP-SURVEY-AP",
    val password: String = "survey@field2026",
    val ipAddress: String = "192.168.43.1",
    val port: Int = 8080,
    val fullUrl: String = "http://192.168.43.1:8080"
)
