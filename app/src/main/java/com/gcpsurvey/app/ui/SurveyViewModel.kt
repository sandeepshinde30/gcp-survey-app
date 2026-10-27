package com.gcpsurvey.app.ui

import android.annotation.SuppressLint
import android.app.Application
import android.content.Context
import android.location.Location
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.gcpsurvey.app.data.GcpDatabase
import com.gcpsurvey.app.data.GcpSurveyEntity
import com.gcpsurvey.app.export.CsvExporter
import com.gcpsurvey.app.network.LocalHotspotServer
import com.gcpsurvey.app.network.LocalOnlyHotspotManager
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

// यह क्लास गायब थी, इसे जोड़ दिया गया है
data class HotspotInfoState(
    val isActive: Boolean = false,
    val ssid: String = "GCP-SURVEY-AP",
    val password: String = "survey@field2026",
    val ipAddress: String = "192.168.43.1",
    val port: Int = 8080,
    val fullUrl: String = "http://192.168.43.1:8080"
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
        val cancellationTokenSource = com.google.android.gms.tasks.CancellationTokenSource()
        fusedLocationClient.getCurrentLocation(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            cancellationTokenSource.token
        )
            .addOnSuccessListener { location: Location? ->
                cancellationTokenSource.cancel()
                location?.let { loc ->
                    val state = _sessionState.value
                    _sessionState.value = state.copy(
                        hotelLat = loc.latitude,
                        hotelLon = loc.longitude,
                        previousPointLabel = "Hotel"
                    )
                }
            }
            .addOnFailureListener {
                cancellationTokenSource.cancel()
            }
    }

    @SuppressLint("MissingPermission")
    fun captureGcpLocation(context: Context) {
        val cancellationTokenSource = com.google.android.gms.tasks.CancellationTokenSource()
        fusedLocationClient.getCurrentLocation(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            cancellationTokenSource.token
        )
            .addOnSuccessListener { location: Location? ->
                cancellationTokenSource.cancel()
                location?.let { loc ->
                    val state = _sessionState.value
                    var segment = 0.0
                    var prevLabel = state.previousPointLabel

                    if (state.lastRecordedGcpLat != null && state.lastRecordedGcpLon != null) {
                        val results = FloatArray(1)
                        Location.distanceBetween(
                            state.lastRecordedGcpLat, state.lastRecordedGcpLon,
                            loc.latitude, loc.longitude,
                            results
                        )
                        segment = results[0].toDouble()
                        prevLabel = "GCP: ${state.lastRecordedGcpId ?: "Previous"}"
                    } else if (state.hotelLat != null && state.hotelLon != null) {
                        val results = FloatArray(1)
                        Location.distanceBetween(
                            state.hotelLat, state.hotelLon,
                            loc.latitude, loc.longitude,
                            results
                        )
                        segment = results[0].toDouble()
                        prevLabel = "Hotel"
                    }

                    _sessionState.value = state.copy(
                        currentGcpLat = loc.latitude,
                        currentGcpLon = loc.longitude,
                        currentGcpAlt = if (loc.hasAltitude()) loc.altitude else null,
                        currentGcpAcc = if (loc.hasAccuracy()) loc.accuracy else null,
                        currentSegmentDistance = segment,
                        previousPointLabel = prevLabel
                    )
                }
            }
            .addOnFailureListener {
                cancellationTokenSource.cancel()
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

    fun exportCsv(context: Context): File? {
        var exportedFile: File? = null
        viewModelScope.launch {
            val records = dao.getAllRecordsSync()
            exportedFile = CsvExporter.exportToCsv(context, records)
        }
        return exportedFile
    }

    fun exportExcelXls(context: Context): File? {
        var exportedFile: File? = null
        viewModelScope.launch {
            val records = dao.getAllRecordsSync()
            exportedFile = CsvExporter.exportToExcelXls(context, records)
        }
        return exportedFile
    }

    fun exportPhotosZip(context: Context): File? {
        var exportedFile: File? = null
        viewModelScope.launch {
            exportedFile = CsvExporter.createPhotosZip(context)
        }
        return exportedFile
    }
}
