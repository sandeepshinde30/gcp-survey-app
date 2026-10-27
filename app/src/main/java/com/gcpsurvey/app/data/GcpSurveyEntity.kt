package com.gcpsurvey.app.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "gcp_surveys")
data class GcpSurveyEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val date: String,
    val projectName: String,
    val city: String,
    val operatorName: String,
    val gcpId: String,
    val stationType: String = "gcp",
    val surveyMode: String = "rtk",
    val pointMarkType: String = "nail",
    val pointStatus: String,
    val startTime: String? = null,
    val endTime: String? = null,
    val totalObservationTime: String? = null,
    val antennaHeight: Double,
    val latitude: Double,
    val longitude: Double,
    val altitude: Double?,
    val accuracy: Float?,
    val hotelLatitude: Double?,
    val hotelLongitude: Double?,
    val previousPointType: String,
    val previousPointId: String?,
    val segmentDistanceMeters: Double,
    val accumulatedDistanceMeters: Double,
    val folderPath: String,
    val photosJson: String,
    val createdAt: Long = System.currentTimeMillis()
)
