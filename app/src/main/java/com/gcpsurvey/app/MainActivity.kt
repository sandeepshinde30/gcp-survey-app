package com.gcpsurvey.app

import android.Manifest
import android.content.ContentValues
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.gcpsurvey.app.data.GcpSurveyEntity
import com.gcpsurvey.app.ui.LaptopSyncScreen
import com.gcpsurvey.app.ui.SurveyViewModel
import java.io.File
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

fun isValidGcpName(name: String): Boolean {
    if (name.isBlank()) return false
    return Regex("^[A-Za-z0-9_-]+$").matches(name.trim())
}

fun isGpsEnabled(context: Context): Boolean {
    val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    return try {
        lm.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
    } catch (_: Exception) {
        false
    }
}

fun getFileFromUri(context: Context, uri: Uri): File? {
    return try {
        when (uri.scheme) {
            "file" -> File(uri.path!!)
            "content" -> {
                val input = context.contentResolver.openInputStream(uri) ?: return null
                val tmp = File(context.cacheDir, "tmp_${System.currentTimeMillis()}.jpg")
                tmp.outputStream().use { out -> input.copyTo(out) }
                input.close()
                tmp
            }
            else -> null
        }
    } catch (_: Exception) {
        null
    }
}

fun Double.format(decimals: Int): String =
    String.format(Locale.US, "%.${decimals}f", this)

fun Float.format(decimals: Int): String =
    String.format(Locale.US, "%.${decimals}f", this)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GcpSurveyApp(viewModel: SurveyViewModel) {
    val context = LocalContext.current
    var selectedTab by remember { mutableStateOf(0) }
    var showLaptopConnect by remember { mutableStateOf(false) }
    val records by viewModel.allRecords.collectAsState(initial = emptyList())

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
                            Text(
                                "Offline SQLite • WGS-84",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    },
                    actions = {
                        IconButton(onClick = {
                            try {
                                val galleryDir = File(
                                    Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES),
                                    "GCP_Survey"
                                )
                                val appDir = File(
                                    context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS),
                                    "GCP_Survey"
                                )
                                if (galleryDir.exists()) galleryDir.deleteRecursively()
                                if (appDir.exists()) appDir.deleteRecursively()
                                Toast.makeText(context, "All Photos & Data Deleted!", Toast.LENGTH_SHORT).show()
                            } catch (e: Exception) {
                                Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                            }
                        }) {
                            Icon(Icons.Default.Delete, contentDescription = "Clear Storage", tint = Color.Red)
                        }

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
                                }
                            }
                        }) {
                            Icon(Icons.Default.Share, contentDescription = "Quick CSV Export", modifier = Modifier.size(20.dp))
                        }

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
                    RecordsListScreen(
                        records = records,
                        viewModel = viewModel,
                        onOpenTransferHub = { showLaptopConnect = true }
                    )
                }
            }
        }
    }
}
// ===================== Survey Form =====================

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

    val capturedPhotos = remember { mutableStateListOf<String>() }

    var showGpsDialog by remember { mutableStateOf(false) }
    var showInvalidNameDialog by remember { mutableStateOf(false) }
    var invalidNameMessage by remember { mutableStateOf("") }

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
                    Toast.makeText(context, "Photo Saved with GPS Location", Toast.LENGTH_LONG).show()
                } else {
                    Toast.makeText(context, "Photo Saved, but NO GPS Location found!", Toast.LENGTH_LONG).show()
                }
                capturedPhotos.add(currentPhotoSlot)
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

    val todayDate = remember {
        java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
    }
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
        // ---- Distance card ----
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
                        Text("Total Travel Today", fontSize = 10.sp, color = Color.Gray)
                    }
                }
            }
        }

        // ---- GPS capture card ----
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("One-Shot GPS Capture (Battery Optimized)", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = {
                            if (!isValidGcpName(gcpId)) {
                                invalidNameMessage =
                                    "GCP ID में सिर्फ अक्षर, संख्या, हाइफन (-) और अंडरस्कोर (_) होने चाहिए। स्पेस या कोई अजीब चिन्ह न डालें।\n\n" +
                                    "GCP ID must contain only letters, numbers, hyphen (-), and underscore (_). Do not use spaces or special characters."
                                showInvalidNameDialog = true
                                return@Button
                            }
                            if (!isGpsEnabled(context)) {
                                showGpsDialog = true
                            } else if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                                viewModel.captureHotelLocation(context)
                            } else {
                                onLocationPermissionRequested()
                                Toast.makeText(context, "कृपया Location की परमिशन दें / Please grant Location permission", Toast.LENGTH_LONG).show()
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
                            if (!isValidGcpName(gcpId)) {
                                invalidNameMessage =
                                    "GCP ID में सिर्फ अक्षर, संख्या, हाइफन (-) और अंडरस्कोर (_) होने चाहिए। स्पेस या कोई अजीब चिन्ह न डालें।\n\n" +
                                    "GCP ID must contain only letters, numbers, hyphen (-), and underscore (_). Do not use spaces or special characters."
                                showInvalidNameDialog = true
                                return@Button
                            }
                            if (!isGpsEnabled(context)) {
                                showGpsDialog = true
                            } else if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                                viewModel.captureGcpLocation(context)
                            } else {
                                onLocationPermissionRequested()
                                Toast.makeText(context, "कृपया Location की परमिशन दें / Please grant Location permission", Toast.LENGTH_LONG).show()
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

                HorizontalDivider(color = Color.LightGray, thickness = 1.dp)
                Text("Current Save Path:", fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                Text(
                    "Pictures/GCP_Survey/$hierarchyFolder",
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    color = Color(0xFF047857)
                )
            }
        }

        // ---- Observation timer ----
        Text("Survey Metadata & Observation Timing", fontWeight = FontWeight.SemiBold)

        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFBEB)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Observation Duration", fontSize = 11.sp, color = Color.Gray)
                        Text(formattedDuration, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = {
                                if (!isObserving) {
                                    isObserving = true
                                }
                            },
                            enabled = !isObserving,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A))
                        ) { Text("Start", fontSize = 12.sp) }

                        Button(
                            onClick = {
                                isObserving = false
                                endTimeString = java.text.SimpleDateFormat(
                                    "yyyy-MM-dd HH:mm:ss",
                                    java.util.Locale.US
                                ).format(java.util.Date())
                            },
                            enabled = isObserving,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                        ) { Text("Stop", fontSize = 12.sp) }

                        OutlinedButton(
                            onClick = {
                                isObserving = false
                                obsSeconds = 0
                                startTimeString = ""
                                endTimeString = ""
                            }
                        ) { Text("Reset", fontSize = 12.sp) }
                    }
                }
                if (startTimeString.isNotEmpty()) {
                    Text("Start: $startTimeString", fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                }
                if (endTimeString.isNotEmpty()) {
                    Text("End: $endTimeString", fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                }
            }
        }

        // ---- Metadata fields ----
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

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(modifier = Modifier.weight(1f)) {
                OutlinedButton(
                    onClick = { markExpanded = true },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Mark: ${pointMarkType.uppercase()}", fontSize = 11.sp)
                }
                DropdownMenu(
                    expanded = markExpanded,
                    onDismissRequest = { markExpanded = false }
                ) {
                    listOf("nail", "paint", "peg", "bolt", "none").forEach { mark ->
                        DropdownMenuItem(
                            text = { Text(mark.uppercase()) },
                            onClick = {
                                pointMarkType = mark
                                markExpanded = false
                            }
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.weight(1f))
        }
                // ---- Photos ----
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
                        val isCaptured = capturedPhotos.contains(slot)
                        OutlinedButton(
                            onClick = {
                                if (!isValidGcpName(gcpId)) {
                                    invalidNameMessage =
                                        "फोटो खींचने से पहले सही GCP ID डालें (सिर्फ अक्षर, संख्या, -, _)।\n\n" +
                                        "Please enter a valid GCP ID before taking a photo (only letters, numbers, -, _)."
                                    showInvalidNameDialog = true
                                } else if (!isGpsEnabled(context)) {
                                    showGpsDialog = true
                                } else {
                                    currentPhotoSlot = slot
                                    val name = "${gcpId}_${slot.replace(" ", "_")}_${System.currentTimeMillis()}.jpg"

                                    val values = ContentValues().apply {
                                        put(MediaStore.Images.Media.DISPLAY_NAME, name)
                                        put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                            put(
                                                MediaStore.Images.Media.RELATIVE_PATH,
                                                "Pictures/GCP_Survey/$hierarchyFolder"
                                            )
                                        }
                                    }

                                    currentPhotoUri = context.contentResolver.insert(
                                        MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                                        values
                                    )
                                    if (currentPhotoUri != null) {
                                        cameraLauncher.launch(currentPhotoUri)
                                    } else {
                                        Toast.makeText(context, "Could not create image file", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = if (isCaptured) Color(0xFF16A34A) else MaterialTheme.colorScheme.primary
                            )
                        ) {
                            Icon(
                                if (isCaptured) Icons.Default.CheckCircle else Icons.Default.PhotoCamera,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
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

        if (capturedPhotos.isNotEmpty()) {
            Text("Captured Photos (${capturedPhotos.size}):", fontSize = 11.sp, fontWeight = FontWeight.Bold)
            capturedPhotos.forEach { p ->
                Text("• $p", fontSize = 11.sp, fontFamily = FontFamily.Monospace, color = Color(0xFF047857))
            }
        }

        // ---- Save button ----
        Button(
            onClick = {
                if (!isValidGcpName(gcpId)) {
                    invalidNameMessage =
                        "डेटा सेव करने के लिए सही GCP ID डालें (सिर्फ अक्षर, संख्या, -, _)।\n\n" +
                        "Please enter a valid GCP ID to save the record (only letters, numbers, -, _)."
                    showInvalidNameDialog = true
                    return@Button
                }
                if (session.currentGcpLat == null) {
                    Toast.makeText(
                        context,
                        "Please capture GCP Location first! / पहले GCP लोकेशन कैप्चर करें!",
                        Toast.LENGTH_SHORT
                    ).show()
                    return@Button
                }
                isObserving = false
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
                    totalObservationTime = finalObsTime,
                    photosJson = capturedPhotos.joinToString(",")
                )
                Toast.makeText(context, "Saved GCP $gcpId to SQLite!", Toast.LENGTH_SHORT).show()
                val num = gcpId.replace("[^0-9]".toRegex(), "").toIntOrNull() ?: 1
                gcpId = "GCP-" + String.format(Locale.US, "%03d", num + 1)
                obsSeconds = 0
                startTimeString = ""
                endTimeString = ""
                capturedPhotos.clear()
            },
            modifier = Modifier.fillMaxWidth().height(48.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text("Save Record to SQLite", fontSize = 15.sp, fontWeight = FontWeight.Bold)
        }

        Spacer(modifier = Modifier.height(24.dp))
    }

    // ---- GPS disabled dialog ----
    if (showGpsDialog) {
        AlertDialog(
            onDismissRequest = { showGpsDialog = false },
            title = { Text("GPS Disabled / GPS बंद है") },
            text = {
                Text(
                    "कृपया GPS चालू करें ताकि सटीक लोकेशन कैप्चर हो सके।\n\n" +
                    "Please turn on GPS/Location to capture accurate coordinates."
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    showGpsDialog = false
                    try {
                        context.startActivity(
                            android.content.Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)
                        )
                    } catch (_: Exception) {
                        Toast.makeText(context, "Could not open settings", Toast.LENGTH_SHORT).show()
                    }
                }) {
                    Text("Open Settings")
                }
            },
            dismissButton = {
                TextButton(onClick = { showGpsDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // ---- Invalid GCP ID dialog ----
    if (showInvalidNameDialog) {
        AlertDialog(
            onDismissRequest = { showInvalidNameDialog = false },
            title = { Text("Invalid GCP ID / अमान्य GCP ID") },
            text = { Text(invalidNameMessage) },
            confirmButton = {
                TextButton(onClick = { showInvalidNameDialog = false }) {
                    Text("OK")
                }
            }
        )
    }
}

// ===================== Records List =====================

@Composable
fun RecordsListScreen(
    records: List<GcpSurveyEntity>,
    viewModel: SurveyViewModel,
    onOpenTransferHub: () -> Unit
) {
    val context = LocalContext.current
    var searchQuery by remember { mutableStateOf("") }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var pendingDeleteId by remember { mutableStateOf<Long?>(null) }

    val filtered = remember(records, searchQuery) {
        if (searchQuery.isBlank()) records
        else records.filter {
            it.gcpId.contains(searchQuery, ignoreCase = true) ||
            it.projectName.contains(searchQuery, ignoreCase = true) ||
            it.operatorName.contains(searchQuery, ignoreCase = true) ||
            it.city.contains(searchQuery, ignoreCase = true)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // ---- Search bar ----
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            label = { Text("Search records...") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = { searchQuery = "" }) {
                        Icon(Icons.Default.Clear, contentDescription = "Clear")
                    }
                }
            }
        )

        // ---- Empty state OR list ----
        if (filtered.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.Inbox,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        tint = Color.Gray
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        if (records.isEmpty()) "No records yet. Add your first survey!"
                        else "No records match your search.",
                        color = Color.Gray,
                        fontSize = 13.sp
                    )
                    if (records.isEmpty()) {
                        Spacer(Modifier.height(12.dp))
                        FilledTonalButton(onClick = onOpenTransferHub) {
                            Icon(
                                Icons.Default.Laptop,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(Modifier.width(6.dp))
                            Text("Transfer to Laptop")
                        }
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(filtered, key = { it.id }) { record ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {

                            // ---- Header: GCP ID + station chip + delete ----
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    record.gcpId,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    AssistChip(
                                        onClick = {},
                                        label = {
                                            Text(
                                                record.stationType.uppercase(),
                                                fontSize = 10.sp
                                            )
                                        }
                                    )
                                    Spacer(Modifier.width(6.dp))
                                    IconButton(
                                        onClick = {
                                            pendingDeleteId = record.id
                                            showDeleteDialog = true
                                        },
                                        modifier = Modifier.size(24.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.Delete,
                                            contentDescription = "Delete",
                                            tint = Color.Red,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                            }

                            // ---- Project + City + Operator ----
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "${record.projectName} • ${record.city}",
                                fontSize = 12.sp,
                                color = Color.DarkGray
                            )
                            Text(
                                "Operator: ${record.operatorName}",
                                fontSize = 11.sp,
                                color = Color.Gray
                            )

                            // ---- Coordinates row ----
                            // ✅ FIX (line 1093): accuracy nullable Double hai
                            Spacer(Modifier.height(6.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    "Lat: ${record.latitude.format(6)}",
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                                Text(
                                    "Lon: ${record.longitude.format(6)}",
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                                Text(
                                    "Acc: ${record.accuracy?.let { it.format(1) } ?: "-"}m",
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                            }

                            // ---- Mode / Obs / Status row ----
                            Spacer(Modifier.height(4.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    "Mode: ${record.surveyMode.uppercase()}",
                                    fontSize = 10.sp,
                                    color = Color(0xFF0369A1),
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    "Obs: ${record.totalObservationTime}",
                                    fontSize = 10.sp,
                                    color = Color(0xFF0D9488),
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    "Status: ${record.pointStatus.uppercase()}",
                                    fontSize = 10.sp,
                                    color = if (record.pointStatus == "normal") Color(0xFF16A34A) else Color(0xFFDC2626),
                                    fontWeight = FontWeight.SemiBold
                                )
                            }

                            // ---- Photo count ----
                            if (!record.photosJson.isNullOrBlank()) {
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    "Photos: ${record.photosJson.split(",").size}",
                                    fontSize = 10.sp,
                                    color = Color(0xFF047857)
                                )
                            }
                        }
                    }
                }
                item { Spacer(Modifier.height(80.dp)) }
            }
        }
    }

    // ---- Delete confirmation dialog ----
    if (showDeleteDialog && pendingDeleteId != null) {
        AlertDialog(
            onDismissRequest = {
                showDeleteDialog = false
                pendingDeleteId = null
            },
            title = { Text("Delete Record?") },
            text = { Text("This action cannot be undone. / यह क्रिया पूर्ववत नहीं की जा सकती।") },
            confirmButton = {
                TextButton(onClick = {
                    pendingDeleteId?.let { id ->
                        viewModel.deleteRecord(id)
                        Toast.makeText(context, "Record deleted", Toast.LENGTH_SHORT).show()
                    }
                    showDeleteDialog = false
                    pendingDeleteId = null
                }) {
                    Text("Delete", color = Color.Red)
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    showDeleteDialog = false
                    pendingDeleteId = null
                }) {
                    Text("Cancel")
                }
            }
        )
    }
}
// ✅ File end

        
