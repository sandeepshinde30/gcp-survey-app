package com.gcpsurvey.app.ui

import android.annotation.SuppressLint
import android.app.Application
import android.content.Context
import android.location.Location
import android.widget.Toast
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.gcpsurvey.app.data.GcpDatabase
import com.gcpsurvey.app.data.GcpSurveyEntity
import com.gcpsurvey.app.export.CsvExporter
import com.gcpsurvey.app.network.LocalHotspotServer
import com.gcpsurvey.app.network.LocalOnlyHotspotManager
import com.gcpsurvey.app.network.HotspotInfoState
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

data class SessionState(
    val hotelLat: Double? = null,
    val hotelLon: Double? = null,
    val currentGcpLat: Double? = null,
    val currentGcpLon: Double? = null,
    val currentGcpAlt: Double? = null,
    val currentGcpAcc: Float? = null,
    val lastRecordedGcpLat: Double? = null,
    val lastRecordedGcpLon: Double? = null,
    val lastRecordedGcpId: String? = null,
    val currentSegmentDistance: Double = 0.0,
    val accumulatedDistance: Double = 0.0,
    val previousPointLabel: String = "Hotel"
)

class SurveyViewModel(application: Application) : AndroidViewModel(application) {
    private val dao = GcpDatabase.getDatabase(application).gcpDao()
    val allRecords = dao.getAllRecords()

    private val fusedLocationClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(application)

    private val _sessionState = MutableStateFlow(SessionState())
    val sessionState: StateFlow<SessionState> = _sessionState.asStateFlow()

    // Hotspot & Web Server State
    private val hotspotManager = LocalOnlyHotspotManager(application)
    private val localServer = LocalHotspotServer(application, 8080)

    private val _hotspotState = MutableStateFlow(HotspotInfoState())
    val hotspotState: StateFlow<HotspotInfoState> = _hotspotState.asStateFlow()

    fun startHotspotAndServer(context: Context) {
        hotspotManager.startHotspot(
            onSuccess = { info: HotspotInfoState ->
                _hotspotState.value = info
                localServer.start()
            },
            onFailed = {
                val dynamicIp = "192.168.43.1"
                _hotspotState.value = HotspotInfoState(
                    isActive = true,
                    ssid = "GCP-SURVEY-AP",
                    password = "survey@field2026",
                    ipAddress = dynamicIp,
                    port = 8080,
                    fullUrl = "http://$dynamicIp:8080"
                )
                localServer.start()
            }
        )
    }

    fun stopHotspotAndServer(context: Context) {
        localServer.stop()
        hotspotManager.stopHotspot()
        _hotspotState.value = _hotspotState.value.copy(isActive = false)
    }

    override fun onCleared() {
        super.onCleared()
        localServer.stop()
        hotspotManager.stopHotspot()
    }

    @SuppressLint("MissingPermission")
    fun captureHotelLocation(context: Context) {
        Toast.makeText(context, "Locating Hotel GPS... कृपया 5-10 सेकंड रुकें", Toast.LENGTH_SHORT).show()
        val cancellationTokenSource = com.google.android.gms.tasks.CancellationTokenSource()
        fusedLocationClient.getCurrentLocation(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            cancellationTokenSource.token
        )
            .addOnSuccessListener { location: Location? ->
                cancellationTokenSource.cancel()
                if (location != null) {
                    val state = _sessionState.value
                    _sessionState.value = state.copy(
                        hotelLat = location.latitude,
                        hotelLon = location.longitude,
                        previousPointLabel = "Hotel"
                    )
                    Toast.makeText(context, "Hotel Location Captured Successfully!", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(context, "GPS Signal नहीं मिला। खुली जगह पर जाएं।", Toast.LENGTH_LONG).show()
                }
            }
            .addOnFailureListener {
                cancellationTokenSource.cancel()
                Toast.makeText(context, "GPS Error: ${it.message}", Toast.LENGTH_LONG).show()
            }
    }

    @SuppressLint("MissingPermission")
    fun captureGcpLocation(context: Context) {
        Toast.makeText(context, "Locating GCP GPS... कृपया 5-10 सेकंड रुकें", Toast.LENGTH_SHORT).show()
        val cancellationTokenSource = com.google.android.gms.tasks.CancellationTokenSource()
        fusedLocationClient.getCurrentLocation(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            cancellationTokenSource.token
        )
            .addOnSuccessListener { location: Location? ->
                cancellationTokenSource.cancel()
                if (location != null) {
                    val state = _sessionState.value
                    var segment = 0.0
                    var prevLabel = state.previousPointLabel

                    if (state.lastRecordedGcpLat != null && state.lastRecordedGcpLon != null) {
                        val results = FloatArray(1)
                        Location.distanceBetween(
                            state.lastRecordedGcpLat, state.lastRecordedGcpLon,
                            location.latitude, location.longitude,
                            results
                        )
                        segment = results[0].toDouble()
                        prevLabel = "GCP: ${state.lastRecordedGcpId ?: "Previous"}"
                    } else if (state.hotelLat != null && state.hotelLon != null) {
                        val results = FloatArray(1)
                        Location.distanceBetween(
                            state.hotelLat, state.hotelLon,
                            location.latitude, location.longitude,
                            results
                        )
                        segment = results[0].toDouble()
                        prevLabel = "Hotel"
                    }

                    _sessionState.value = state.copy(
                        currentGcpLat = location.latitude,
                        currentGcpLon = location.longitude,
                        currentGcpAlt = if (location.hasAltitude()) location.altitude else null,
                        currentGcpAcc = if (location.hasAccuracy()) location.accuracy else null,
                        currentSegmentDistance = segment,
                        previousPointLabel = prevLabel
                    )
                    Toast.makeText(context, "GCP Location Captured Successfully!", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(context, "GPS Signal नहीं मिला। खुली जगह पर जाएं।", Toast.LENGTH_LONG).show()
                }
            }
            .addOnFailureListener {
                cancellationTokenSource.cancel()
                Toast.makeText(context, "GPS Error: ${it.message}", Toast.LENGTH_LONG).show()
            }
    }

    @SuppressLint("MissingPermission")
    fun takeGeotaggedPhoto(context: Context, slotName: String, onLocationAcquired: (Location?) -> Unit = {}) {
        val cancellationTokenSource = com.google.android.gms.tasks.CancellationTokenSource()
        fusedLocationClient.getCurrentLocation(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            cancellationTokenSource.token
        )
            .addOnSuccessListener { location: Location? ->
                cancellationTokenSource.cancel()
                onLocationAcquired(location)
            }
            .addOnFailureListener {
                cancellationTokenSource.cancel()
                onLocationAcquired(null)
            }
    }

    fun saveSurveyRecord(
        gcpId: String,
        projectName: String,
        city: String,
        operatorName: String,
        stationType: String = "gcp",
        surveyMode: String = "rtk",
        pointMarkType: String = "nail",
        pointStatus: String = "normal",
        antennaHeight: Double,
        startTime: String? = null,
        endTime: String? = null,
        totalObservationTime: String? = null,
        photosJson: String = "{}"
    ) {
        val state = _sessionState.value
        val lat = state.currentGcpLat ?: return
        val lon = state.currentGcpLon ?: return

        val segment = state.currentSegmentDistance
        val newAccumulated = state.accumulatedDistance + segment
        val dateToday = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        val cleanProj = projectName.trim().replace("\\s+".toRegex(), "_")
        val cleanOp = operatorName.trim().replace("\\s+".toRegex(), "_")
        val folderPath = "$cleanProj/$cleanOp/$dateToday/$gcpId/"

        val record = GcpSurveyEntity(
            date = dateToday,
            projectName = projectName,
            city = city,
            operatorName = operatorName,
            gcpId = gcpId,
            stationType = stationType,
            surveyMode = surveyMode,
            pointMarkType = pointMarkType,
            pointStatus = pointStatus,
            startTime = startTime,
            endTime = endTime,
            totalObservationTime = totalObservationTime,
            antennaHeight = antennaHeight,
            latitude = lat,
            longitude = lon,
            altitude = state.currentGcpAlt,
            accuracy = state.currentGcpAcc,
            hotelLatitude = state.hotelLat,
            hotelLongitude = state.hotelLon,
            previousPointType = if (state.lastRecordedGcpId != null) "gcp" else if (state.hotelLat != null) "hotel" else "none",
            previousPointId = state.lastRecordedGcpId,
            segmentDistanceMeters = segment,
            accumulatedDistanceMeters = newAccumulated,
            folderPath = folderPath,
            photosJson = photosJson
        )

        viewModelScope.launch {
            dao.insertRecord(record)
            _sessionState.value = state.copy(
                lastRecordedGcpId = gcpId,
                lastRecordedGcpLat = lat,
                lastRecordedGcpLon = lon,
                accumulatedDistance = newAccumulated,
                currentSegmentDistance = 0.0,
                previousPointLabel = "GCP: $gcpId"
            )
        }
    }

    fun exportCsv(context: Context, onFileReady: (File?) -> Unit) {
        viewModelScope.launch {
            val records = dao.getAllRecordsSync()
            val file = CsvExporter.exportToCsv(context, records)
            onFileReady(file)
        }
    }

    fun exportExcelXls(context: Context, onFileReady: (File?) -> Unit) {
        viewModelScope.launch {
            val records = dao.getAllRecordsSync()
            val file = CsvExporter.exportToExcelXls(context, records)
            onFileReady(file)
        }
    }

    fun exportPhotosZip(context: Context, onFileReady: (File?) -> Unit) {
        viewModelScope.launch {
            val file = CsvExporter.createPhotosZip(context)
            onFileReady(file)
        }
    }
}
