package com.gcpsurvey.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
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
                                    val uri = FileProvider.getUriForFile(context, "${context.packageName}.provider", csvFile)
                                    val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                        type = "text/csv"
                                        putExtra(android.content.Intent.EXTRA_STREAM, uri)
                                        addFlags(android.content
