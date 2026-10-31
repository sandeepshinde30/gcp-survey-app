package com.gcpsurvey.app

import android.Manifest
import android.content.ContentValues
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.gcpsurvey.app.data.GcpSurveyEntity
import com.gcpsurvey.app.ui.LaptopSyncScreen
import com.gcpsurvey.app.ui.SurveyViewModel
import java.util.Locale

class MainActivity : ComponentActivity() {
    private val viewModel: SurveyViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(
                colorScheme = lightColorScheme(
                    primary = Color(0xFF1976D2),
                    secondary = Color(0xFF00796B),
                    surfaceVariant = Color(0xFFF1F5F9)
                )
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    GcpSurveyApp(viewModel = viewModel)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GcpSurveyApp(viewModel: SurveyViewModel) {
    val context = LocalContext.current
    var selectedTab by remember { mutableStateOf(0) }
    var showLaptopConnect by remember { mutableStateOf(false) }
    val records by viewModel.allRecords.collectAsState(initial = emptyList())
    val sessionState by viewModel.sessionState.collectAsState()

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false
        if (fineGranted || coarseGranted) {
            Toast.makeText(context, "Location permission granted", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(context, "ACCESS_FINE_LOCATION permission required", Toast.LENGTH_LONG).show()
        }
    }

       LaunchedEffect(Unit) {
        val hasFine = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasFine) {
            locationPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                    Manifest.permission.CAMERA
                )
            )
        }
        
        // नया कोड: इंटरनेट होने पर पुराने रिकॉर्ड्स की दूरी सिंक करें
        if (viewModel.isNetworkAvailable(context)) {
            viewModel.syncPendingDistances(context)
        }
    }

    if (showLaptopConnect) {
        LaptopSyncScreen(
            viewModel = viewModel,
            onBack = { showLaptopConnect = false }
        )
    } else {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text("GCP Survey Tracker", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text("Offline SQLite • WGS-84", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    },
                    actions = {
                        // 1. Delete (Storage Clear) Button
                        IconButton(onClick = {
                            try {
                                val galleryDir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "GCP_Survey")
                                val appDir = File(context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS), "GCP_Survey")
                                
                                if (galleryDir.exists()) galleryDir.deleteRecursively()
                                if (appDir.exists()) appDir.deleteRecursively()
                                
                                Toast.makeText(context, "All Photos & Data Deleted!", Toast.LENGTH_SHORT).show()
                            } catch (e: Exception) {
                                Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                            }
                        }) {
                            Icon(Icons.Default.Delete, contentDescription = "Clear Storage", tint = Color.Red)
                        }

                        // 2. Laptop Connect Button
                        FilledTonalButton(
                            onClick = { showLaptopConnect = true },
                            colors = ButtonDefaults.filledTonalButtonColors(
                                containerColor = Color(0xFFE0F2FE),
                                contentColor = Color(0xFF0369A1)
                            ),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Icon(Icons.Default.Laptop, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Laptop Connect", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                        
                        // 3. CSV Share Button
                        IconButton(onClick = {
                            viewModel.exportCsv(context) { csvFile ->
                                if (csvFile != null) {
                                    Toast.makeText(context, "CSV Saved:\n${csvFile.absolutePath}", Toast.LENGTH_LONG).show()
                                    val uri = FileProvider.getUriForFile(context, "${context.packageName}.provider", csvFile)
                                    val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                        type = "text/csv"
                                        putExtra(android.content.Intent.EXTRA_STREAM, uri)
                                        addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                    }
                                    context.startActivity(android.content.Intent.createChooser(intent, "Share CSV"))
                                } else {
                                    Toast.makeText(context, "Export Failed! No Data.", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }) {
                            Icon(Icons.Default.Share, contentDescription = "Quick CSV Export", modifier = Modifier.size(20.dp))
                        }

                        // 4. Excel Share Button
                        IconButton(onClick = {
                            viewModel.exportExcelXls(context) { excelFile ->
                                if (excelFile != null) {
                                    Toast.makeText(context, "Excel Saved:\n${excelFile.absolutePath}", Toast.LENGTH_LONG).show()
                                    val uri = FileProvider.getUriForFile(context, "${context.packageName}.provider", excelFile)
                                    val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                        type = "application/vnd.ms-excel"
                                        putExtra(android.content.Intent.EXTRA_STREAM, uri)
                                        addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                    }
                                    context.startActivity(android.content.Intent.createChooser(intent, "Share Excel"))
                                }
                            }
                        }) {
                            Icon(Icons.Default.GridOn, contentDescription = "Share Excel", modifier = Modifier.size(20.dp))
                        }

                        // 5. Photos ZIP Share Button
                        IconButton(onClick = {
                            viewModel.exportPhotosZip(context) { zipFile ->
                                if (zipFile != null) {
                                    Toast.makeText(context, "Photos Zip Saved:\n${zipFile.absolutePath}", Toast.LENGTH_LONG).show()
                                    val uri = FileProvider.getUriForFile(context, "${context.packageName}.provider", zipFile)
                                    val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                        type = "application/zip"
                                        putExtra(android.content.Intent.EXTRA_STREAM, uri)
                                        addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                    }
                                    context.startActivity(android.content.Intent.createChooser(intent, "Share Photos Zip"))
                                } else {
                                    Toast.makeText(context, "No Photos Found", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }) {
                            Icon(Icons.Default.FolderZip, contentDescription = "Share Photos", modifier = Modifier.size(20.dp))
                        }
                    }
                )
            },
            bottomBar = {
                NavigationBar {
                    NavigationBarItem(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        icon = { Icon(Icons.Default.Edit, contentDescription = "Survey Form") },
                        label = { Text("Survey") }
                    )
                    NavigationBarItem(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        icon = { Icon(Icons.Default.List, contentDescription = "Records List") },
                        label = { Text("Records (${records.size})") }
                    )
                    NavigationBarItem(
                        selected = false,
                        onClick = { showLaptopConnect = true },
                        icon = { Icon(Icons.Default.Wifi, contentDescription = "Laptop Sync") },
                        label = { Text("Transfer Hub") }
                    )
                }
            }
        ) { paddingValues ->
            Box(modifier = Modifier.padding(paddingValues)) {
                if (selectedTab == 0) {
                    SurveyFormScreen(
                        viewModel = viewModel,
                        onLocationPermissionRequested = {
                            locationPermissionLauncher.launch(
                                arrayOf(
                                    Manifest.permission.ACCESS_FINE_LOCATION,
                                    Manifest.permission.ACCESS_COARSE_LOCATION
                                )
                            )
                        }
                    )
                } else {
                    RecordsListScreen(records = records, viewModel = viewModel, onOpenTransferHub = { showLaptopConnect = true })
                }
            }
        }
    }
}

@Composable
fun SurveyFormScreen(
    viewModel: SurveyViewModel,
    onLocationPermissionRequested: () -> Unit
) {
    val context = LocalContext.current
    val scrollState = rememberScrollState()
    val session by viewModel.sessionState.collectAsState()

    var projectName by remember { mutableStateOf("Highway NH-48 Expansion") }
    var city by remember { mutableStateOf("Pune") }
    var operatorName by remember { mutableStateOf("Rajesh Sharma") }
    var gcpId by remember { mutableStateOf("GCP-001") }
    var stationType by remember { mutableStateOf("gcp") }
    var surveyMode by remember { mutableStateOf("rtk") }
    var pointMarkType by remember { mutableStateOf("nail") }
    var pointStatus by remember { mutableStateOf("normal") }
    var antennaHeight by remember { mutableStateOf("1.80") }
    var statusExpanded by remember { mutableStateOf(false) }
    var modeExpanded by remember { mutableStateOf(false) }
    var roleExpanded by remember { mutableStateOf(false) }
    var markExpanded by remember { mutableStateOf(false) }

    var isObserving by remember { mutableStateOf(false) }
    var obsSeconds by remember { mutableStateOf(0) }
    var startTimeString by remember { mutableStateOf("") }
    var endTimeString by remember { mutableStateOf("") }
    
    var currentPhotoUri by remember { mutableStateOf<Uri?>(null) }
    var currentPhotoSlot by remember { mutableStateOf("") }

    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && currentPhotoUri != null) {
            viewModel.takeGeotaggedPhoto(context, currentPhotoSlot) { location ->
                if (location != null) {
                    val file = getFileFromUri(context, currentPhotoUri!!)
                    if (file != null) {
                        com.gcpsurvey.app.camera.PhotoGeotagManager.injectGpsCoordinates(file, location)
                    }
                }
                Toast.makeText(context, "Photo Saved with GPS!", Toast.LENGTH_SHORT).show()
            }
        }
    }

    LaunchedEffect(isObserving) {
        if (isObserving) {
            if (startTimeString.isEmpty()) {
                val sdf = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.US)
                startTimeString = sdf.format(java.util.Date())
            }
            while (isObserving) {
                kotlinx.coroutines.delay(1000)
                obsSeconds++
            }
        }
    }

    val formattedDuration = remember(obsSeconds) {
        val h = obsSeconds / 3600
        val m = (obsSeconds % 3600) / 60
        val s = obsSeconds % 60
        if (h > 0) String.format(java.util.Locale.US, "%dh %02dm %02ds", h, m, s)
        else String.format(java.util.Locale.US, "%02dm %02ds", m, s)
    }

    val todayDate = remember { java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date()) }
    val cleanProj = projectName.trim().replace("\\s+".toRegex(), "_")
    val cleanOp = operatorName.trim().replace("\\s+".toRegex(), "_")
    val hierarchyFolder = "$cleanProj/$cleanOp/$todayDate/$gcpId/"

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    "Point-to-Point Distance Tracking (WGS-84)",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                                      Column {
                        Text("Road Distance (From -> To)", fontSize = 11.sp, color = Color.Gray)
                        
                        if (session.isDistanceLoading) {
                            Text("Searching Road...", fontSize = 14.sp, color = Color.Gray)
                        } else if (session.currentSegmentDistance > 0.0) {
                            Text(
                                "${String.format(Locale.US, "%.2f", session.currentSegmentDistance)} m",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                        } else {
                            Text("0.00 m", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        }

                        Text(
                            "From: ${session.previousPointLabel} -> To: $gcpId",
                            fontSize = 10.sp,
                            color = MaterialTheme.colorScheme.secondary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("Accumulated Session", fontSize = 11.sp, color = Color.Gray)
                        val totalKm = (session.accumulatedDistance + session.currentSegmentDistance) / 1000.0
                        Text(
                            "${String.format(Locale.US, "%.3f", totalKm)} km",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0D9488)
                        )
                        Text(
                            "Total Travel Today",
                            fontSize = 10.sp,
                            color = Color.Gray
                        )
                    }
                }
            }
        }

        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("One-Shot GPS Capture (Battery Optimized)", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { 
                            if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                                viewModel.captureHotelLocation(context) 
                            } else {
                                onLocationPermissionRequested()
                                Toast.makeText(context, "कृपया Location की परमिशन दें और दोबारा दबाएं", Toast.LENGTH_LONG).show()
                            }
                        },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF475569))
                    ) {
                        Icon(Icons.Default.Hotel, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Capture Hotel", fontSize = 11.sp)
                    }

                    Button(
                        onClick = { 
                            if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                                viewModel.captureGcpLocation(context) 
                            } else {
                                onLocationPermissionRequested()
                                Toast.makeText(context, "कृपया Location की परमिशन दें और दोबारा दबाएं", Toast.LENGTH_LONG).show()
                            }
                        },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7))
                    ) {
                        Icon(Icons.Default.MyLocation, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Capture GCP", fontSize = 11.sp)
                    }
                }

                if (session.hotelLat != null && session.hotelLon != null) {
                    Text(
                        "Hotel GPS: ${String.format(Locale.US, "%.6f", session.hotelLat)}, ${String.format(Locale.US, "%.6f", session.hotelLon)}",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = Color(0xFF334155)
                    )
                }

                if (session.currentGcpLat != null && session.currentGcpLon != null) {
                    Text(
                        "GCP GPS: ${String.format(Locale.US, "%.6f", session.currentGcpLat)}, ${String.format(Locale.US, "%.6f", session.currentGcpLon)} (Acc: ${session.currentGcpAcc ?: 0f}m)",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF0369A1)
                    )
                }
                
                Divider(color = Color.LightGray, thickness = 1.dp)
                Text(
                    "Current Save Path:",
                    fontSize = 11.sp,
                    color = Color.Gray,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    "Pictures/GCP_Survey/$hierarchyFolder",
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    color = Color(0xFF047857)
                )
            }
        }

        Text("Survey Metadata & Observation Timing", fontWeight = FontWeight.SemiBold)

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = projectName,
                onValueChange = { projectName = it },
                label = { Text("Project Name") },
                modifier = Modifier.weight(1f),
                singleLine = true
            )
            OutlinedTextField(
                value = city,
                onValueChange = { city = it },
                label = { Text("City") },
                modifier = Modifier.weight(1f),
                singleLine = true
            )
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = operatorName,
                onValueChange = { operatorName = it },
                label = { Text("Operator Name") },
                modifier = Modifier.weight(1f),
                singleLine = true
            )
            OutlinedTextField(
                value = gcpId,
                onValueChange = { gcpId = it },
                label = { Text("GCP ID") },
                modifier = Modifier.weight(1f),
                singleLine = true
            )
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = antennaHeight,
                onValueChange = { antennaHeight = it },
                label = { Text("Antenna Ht (m)") },
                modifier = Modifier.weight(1f),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true
            )

            Box(modifier = Modifier.weight(1f)) {
                OutlinedButton(
                    onClick = { roleExpanded = true },
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                ) {
                    Text("Station: ${stationType.uppercase()}", fontSize = 11.sp)
                }
                DropdownMenu(
                    expanded = roleExpanded,
                    onDismissRequest = { roleExpanded = false }
                ) {
                    listOf("gcp", "base", "check_point", "tbm").forEach { type ->
                        DropdownMenuItem(
                            text = { Text(type.uppercase()) },
                            onClick = {
                                stationType = type
                                roleExpanded = false
                            }
                        )
                    }
                }
            }
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(modifier = Modifier.weight(1f)) {
                OutlinedButton(
                    onClick = { modeExpanded = true },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Mode: ${surveyMode.uppercase()}", fontSize = 11.sp)
                }
                DropdownMenu(
                    expanded = modeExpanded,
                    onDismissRequest = { modeExpanded = false }
                ) {
                    listOf("rtk", "static", "ppk", "stop_and_go", "dgps", "fast_static").forEach { mode ->
                        DropdownMenuItem(
                            text = { Text(mode.uppercase()) },
                            onClick = {
                                surveyMode = mode
                                modeExpanded = false
                            }
                        )
                    }
                }
            }

            Box(modifier = Modifier.weight(1f)) {
                OutlinedButton(
                    onClick = { statusExpanded = true },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Status: ${pointStatus.uppercase()}", fontSize = 11.sp)
                }
                DropdownMenu(
                    expanded = statusExpanded,
                    onDismissRequest = { statusExpanded = false }
                ) {
                    listOf("normal", "abnormal", "redo").forEach { status ->
                        DropdownMenuItem(
                            text = { Text(status.uppercase()) },
                            onClick = {
                                pointStatus = status
                                statusExpanded = false
                            }
                        )
                    }
                }
            }
        }

        Text("Camera Geotagging & Storage Optimization", fontWeight = FontWeight.SemiBold)

        val photoSlots = listOf(
            "East Side", "South Side", "West Side", "North Side",
            "Point Nail", "Point Mark", "Point Close-up",
            "Bubble Level", "Tripod Setup", "Antenna Height",
            "Other Photo 1", "Other Photo 2", "Other Photo 3", "Other Photo 4"
        )

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            photoSlots.chunked(2).forEach { rowSlots ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    rowSlots.forEach { slot ->
                        OutlinedButton(
                            onClick = {
                                currentPhotoSlot = slot
                                val name = "${gcpId}_${slot.replace(" ", "_")}_${System.currentTimeMillis()}.jpg"
                                
                                val values = ContentValues().apply {
                                    put(MediaStore.Images.Media.DISPLAY_NAME, name)
                                    put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                        put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/GCP_Survey/$hierarchyFolder")
                                    }
                                }
                                
                                currentPhotoUri = context.contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                                cameraLauncher.launch(currentPhotoUri)
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.PhotoCamera, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(slot, fontSize = 11.sp, maxLines = 1)
                        }
                    }
                    if (rowSlots.size == 1) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }

        Button(
            onClick = {
                if (session.currentGcpLat == null) {
                    Toast.makeText(context, "Please capture GCP Location first!", Toast.LENGTH_SHORT).show()
                    return@Button
                }
                val finalEndTime = if (endTimeString.isNotEmpty()) endTimeString else {
                    java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.US).format(java.util.Date())
                }
                val finalObsTime = formattedDuration

                viewModel.saveSurveyRecord(
                    gcpId = gcpId,
                    projectName = projectName,
                    city = city,
                    operatorName = operatorName,
                    stationType = stationType,
                    surveyMode = surveyMode,
                    pointMarkType = pointMarkType,
                    pointStatus = pointStatus,
                    antennaHeight = antennaHeight.toDoubleOrNull() ?: 1.80,
                    startTime = startTimeString.ifEmpty { finalEndTime },
                    endTime = finalEndTime,
                    totalObservationTime = finalObsTime
                )
                Toast.makeText(context, "Saved GCP $gcpId to SQLite!", Toast.LENGTH_SHORT).show()
                val num = gcpId.replace("[^0-9]".toRegex(), "").toIntOrNull() ?: 1
                gcpId = "GCP-" + String.format(Locale.US, "%03d", num + 1)
                isObserving = false
                obsSeconds = 0
                startTimeString = ""
                endTimeString = ""
            },
            modifier = Modifier.fillMaxWidth().height(48.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            Text("Save GCP Record to SQLite Database", fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun RecordsListScreen(
    records: List<GcpSurveyEntity>,
    viewModel: SurveyViewModel,
    onOpenTransferHub: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        Card(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFF0FDF4))
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Total Saved Points: ${records.size}", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("Ready for Wireless Laptop Sync", fontSize = 11.sp, color = Color(0xFF15803D))
                }
                Button(
                    onClick = onOpenTransferHub,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669))
                ) {
                    Icon(Icons.Default.Laptop, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Transfer Hub", fontSize = 11.sp)
                }
            }
        }

        if (records.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No GCP records saved yet. Capture points in the Survey tab.", color = Color.Gray)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(records) { record ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(record.gcpId, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                Text(record.pointStatus.uppercase(), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "Lat: ${record.latitude.format(6)}, Lon: ${record.longitude.format(6)}",
                                fontFamily = FontFamily.Monospace,
                                fontSize = 12.sp
                            )
                            
                            Text(
                                "From: ${if (record.previousPointType == "hotel") "Hotel" else record.previousPointId} -> To: ${record.gcpId}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.secondary
                            )
                            Text(
                                "Segment: ${String.format(Locale.US, "%.2f", record.segmentDistanceMeters)}m | Total: ${String.format(Locale.US, "%.2f", record.accumulatedDistanceMeters)}m",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Text(
                                "Project: ${record.projectName} • ${record.city} • Ant: ${record.antennaHeight}m",
                                fontSize = 11.sp,
                                color = Color.DarkGray
                            )
                            Text(
                                "Path: ${record.folderPath}",
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                color = Color.Gray
                            )
                        }
                    }
                }
            }
        }
    }
}

fun Double.format(digits: Int) = String.format(Locale.US, "%.${digits}f", this)

fun getFileFromUri(context: android.content.Context, uri: android.net.Uri): File? {
    return try {
        if (uri.scheme == "content") {
            val inputStream = context.contentResolver.openInputStream(uri)
            val file = File(context.cacheDir, "temp_photo.jpg")
            inputStream?.use { input ->
                file.outputStream().use { output ->
                    input.copyTo(output)
                }
            }
            file
        } else {
            File(uri.path!!)
        }
    } catch (e: Exception) {
        e.printStackTrace()
        null
    }
}
