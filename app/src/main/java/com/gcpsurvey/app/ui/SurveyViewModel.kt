package com.gcpsurvey.app.ui

import android.annotation.SuppressLint
import android.app.Application
import android.content.Context
import android.location.Location
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

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
    val currentSegmentDistance: Double = 0.0, // यहाँ रोड डिस्टेंस सेव होगी
    val accumulatedDistance: Double = 0.0,
    val previousPointLabel: String = "Hotel",
    val isDistanceLoading: Boolean = false
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
        try {
            hotspotManager.startHotspot(
                onSuccess = { info: HotspotInfoState ->
                    _hotspotState.value = info
                    try {
                        localServer.start()
                    } catch (e: Exception) {
                        Toast.makeText(context, "Server Error: ${e.message}", Toast.LENGTH_LONG).show()
                    }
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
                    try {
                        localServer.start()
                    } catch (e: Exception) {
                        Toast.makeText(context, "Server Error: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            )
        } catch (e: Exception) {
            Toast.makeText(context, "Hotspot Error: ${e.message}", Toast.LENGTH_LONG).show()
            val dynamicIp = "192.168.43.1"
            _hotspotState.value = HotspotInfoState(
                isActive = true,
                ssid = "GCP-SURVEY-AP",
                password = "survey@field2026",
                ipAddress = dynamicIp,
                port = 8080,
                fullUrl = "http://$dynamicIp:8080"
            )
            try {
                localServer.start()
            } catch (ex: Exception) {
                 Toast.makeText(context, "Server Error: ${ex.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    fun stopHotspotAndServer(context: Context) {
        try {
            localServer.stop()
            hotspotManager.stopHotspot()
        } catch (e: Exception) {
            // Ignore
        }
        _hotspotState.value = _hotspotState.value.copy(isActive = false)
    }

    override fun onCleared() {
        super.onCleared()
        try {
            localServer.stop()
            hotspotManager.stopHotspot()
        } catch (e: Exception) {
            // Ignore
        }
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
                    var prevLabel = state.previousPointLabel
                    var startLat: Double? = null
                    var startLon: Double? = null

                    if (state.lastRecordedGcpLat != null && state.lastRecordedGcpLon != null) {
                        startLat = state.lastRecordedGcpLat
                        startLon = state.lastRecordedGcpLon
                        prevLabel = "GCP: ${state.lastRecordedGcpId ?: "Previous"}"
                    } else if (state.hotelLat != null && state.hotelLon != null) {
                        startLat = state.hotelLat
                        startLon = state.hotelLon
                        prevLabel = "Hotel"
                    }

                    _sessionState.value = state.copy(
                        currentGcpLat = location.latitude,
                        currentGcpLon = location.longitude,
                        currentGcpAlt = if (location.hasAltitude()) location.altitude else null,
                        currentGcpAcc = if (location.hasAccuracy()) location.accuracy else null,
                        currentSegmentDistance = 0.0,
                        previousPointLabel = prevLabel,
                        isDistanceLoading = if (startLat != null) true else false
                    )

                    if (startLat != null && startLon != null) {
                        fetchRoadDistance(context, startLat, startLon, location.latitude, location.longitude)
                    }
                }
            }
            .addOnFailureListener {
                cancellationTokenSource.cancel()
                Toast.makeText(context, "GPS Error: ${it.message}", Toast.LENGTH_LONG).show()
            }
    }

    private fun fetchRoadDistance(context: Context, startLat: Double, startLon: Double, endLat: Double, endLon: Double) {
        val url = "https://router.project-osrm.org/route/v1/driving/$startLon,$startLat;$endLon,$endLat?overview=false"
        
        Thread {
            try {
                val client = okhttp3.OkHttpClient.Builder()
                    .connectTimeout(5, TimeUnit.SECONDS)
                    .readTimeout(5, TimeUnit.SECONDS)
                    .build()
                val request = okhttp3.Request.Builder().url(url).build()
                val response = client.newCall(request).execute()
                
                if (response.isSuccessful) {
                    val jsonString = response.body?.string()
                    val jsonObject = JSONObject(jsonString)
                    val routes = jsonObject.getJSONArray("routes")
                    if (routes.length() > 0) {
                        val distance = routes.getJSONObject(0).getDouble("distance")
                        
                        android.os.Handler(android.os.Looper.getMainLooper()).post {
                            val currentState = _sessionState.value
                            _sessionState.value = currentState.copy(
                                currentSegmentDistance = distance,
                                isDistanceLoading = false
                            )
                        }
                    }
                }
            } catch (e: Exception) {
                android.os.Handler(android.os.Looper.getMainLooper()).post {
                    _sessionState.value = _sessionState.value.copy(isDistanceLoading = false)
                    Toast.makeText(context, "इंटरनेट नहीं है! रोड डिस्टेंस 0 सेव होगी।", Toast.LENGTH_SHORT).show()
                }
            }
        }.start()
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

        val segment = state.currentSegmentDistance // यहाँ रोड डिस्टेंस है
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

    // --- ऑफलाइन डेटा सिंक करने का फंक्शन ---
    fun syncPendingDistances(context: Context) {
        if (!isNetworkAvailable(context)) return

        viewModelScope.launch {
            try {
                // उन रिकॉर्ड्स को ढूंढें जिनकी दूरी 0.0 है
                val pendingRecords = dao.getPendingRecords()
                if (pendingRecords.isNotEmpty()) {
                    Toast.makeText(context, "${pendingRecords.size} रिकॉर्ड्स अपडेट हो रहे हैं...", Toast.LENGTH_SHORT).show()
                    
                    for (record in pendingRecords) {
                        var startLat = record.hotelLatitude
                        var startLon = record.hotelLongitude
                        
                        if (startLat != null && startLon != null) {
                            val distance = fetchRoadDistanceSync(startLat, startLon, record.latitude, record.longitude)
                            if (distance > 0.0) {
                                val updatedRecord = record.copy(
                                    segmentDistanceMeters = distance,
                                    accumulatedDistanceMeters = record.accumulatedDistanceMeters + distance
                                )
                                dao.updateRecord(updatedRecord)
                            }
                        }
                    }
                    Toast.makeText(context, "पुराने रिकॉर्ड्स अपडेट हो गए!", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                // एरर इग्नोर करें
            }
        }
    }

    private suspend fun fetchRoadDistanceSync(startLat: Double, startLon: Double, endLat: Double, endLon: Double): Double {
        return withContext(Dispatchers.IO) {
            try {
                val url = "https://router.project-osrm.org/route/v1/driving/$startLon,$startLat;$endLon,$endLat?overview=false"
                val client = okhttp3.OkHttpClient.Builder()
                    .connectTimeout(5, TimeUnit.SECONDS)
                    .readTimeout(5, TimeUnit.SECONDS)
                    .build()
                val request = okhttp3.Request.Builder().url(url).build()
                val response = client.newCall(request).execute()
                
                if (response.isSuccessful) {
                    val jsonString = response.body?.string()
                    val jsonObject = JSONObject(jsonString)
                    val routes = jsonObject.getJSONArray("routes")
                    if (routes.length() > 0) {
                        return@withContext routes.getJSONObject(0).getDouble("distance")
                    }
                }
                0.0
            } catch (e: Exception) {
                0.0
            }
        }
    }

    fun isNetworkAvailable(context: Context): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
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
