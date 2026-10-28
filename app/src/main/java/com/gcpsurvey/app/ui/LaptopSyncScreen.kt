package com.gcpsurvey.app.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import com.gcpsurvey.app.network.BluetoothTransferHelper
import com.gcpsurvey.app.network.HotspotInfoState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LaptopSyncScreen(
    viewModel: SurveyViewModel,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    var selectedMode by remember { mutableStateOf(0) }
    val hotspotState by viewModel.hotspotState.collectAsState()
    val scrollState = rememberScrollState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Laptop Connect & Transfer Hub", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text("Wireless Data Transfer to Laptop", fontSize = 11.sp)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            TabRow(selectedTabIndex = selectedMode) {
                Tab(
                    selected = selectedMode == 0,
                    onClick = { selectedMode = 0 },
                    text = { Text("Mode A: Wi-Fi", fontSize = 11.sp, fontWeight = FontWeight.SemiBold) },
                    icon = { Icon(Icons.Default.Wifi, contentDescription = null, modifier = Modifier.size(18.dp)) }
                )
                Tab(
                    selected = selectedMode == 1,
                    onClick = { selectedMode = 1 },
                    text = { Text("Mode B: Bluetooth", fontSize = 11.sp, fontWeight = FontWeight.SemiBold) },
                    icon = { Icon(Icons.Default.Bluetooth, contentDescription = null, modifier = Modifier.size(18.dp)) }
                )
                Tab(
                    selected = selectedMode == 2,
                    onClick = { selectedMode = 2 },
                    text = { Text("Mode C: USB", fontSize = 11.sp, fontWeight = FontWeight.SemiBold) },
                    icon = { Icon(Icons.Default.Usb, contentDescription = null, modifier = Modifier.size(18.dp)) }
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scrollState)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                when (selectedMode) {
                    0 -> ModeAHotspotWebServer(context, viewModel, hotspotState)
                    1 -> ModeBBluetoothTransfer(context, viewModel)
                    2 -> ModeCUsbMassStorage()
                }
            }
        }
    }
}

@Composable
fun ModeAHotspotWebServer(
    context: Context,
    viewModel: SurveyViewModel,
    hotspotState: HotspotInfoState
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .background(
                                if (hotspotState.isActive) Color(0xFF10B981) else Color(0xFFEF4444),
                                CircleShape
                            )
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        if (hotspotState.isActive) "SERVER ACTIVE" else "SERVER STOPPED",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Button(
                    onClick = {
                        if (hotspotState.isActive) {
                            viewModel.stopHotspotAndServer(context)
                            Toast.makeText(context, "Server Stopped", Toast.LENGTH_SHORT).show()
                        } else {
                            viewModel.startHotspotAndServer(context)
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (hotspotState.isActive) Color(0xFFE11D48) else Color(0xFF059669)
                    ),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(if (hotspotState.isActive) "Stop Server" else "Start Hotspot Server", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }

            if (hotspotState.isActive) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("1. CONNECT LAPTOP TO THIS WI-FI:", fontSize = 10.sp, color = Color(0xFF94A3B8), fontFamily = FontFamily.Monospace)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column {
                                Text("Wi-Fi SSID:", fontSize = 11.sp, color = Color(0xFFCBD5E1))
                                Text(hotspotState.ssid, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFBBF24), fontFamily = FontFamily.Monospace)
                            }
                            IconButton(onClick = { copyToClipboard(context, "SSID", hotspotState.ssid) }) {
                                Icon(Icons.Default.ContentCopy, contentDescription = "Copy SSID", tint = Color.White, modifier = Modifier.size(16.dp))
                            }
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column {
                                Text("WPA2 Password:", fontSize = 11.sp, color = Color(0xFFCBD5E1))
                                Text(hotspotState.password, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFBBF24), fontFamily = FontFamily.Monospace)
                            }
                            IconButton(onClick = { copyToClipboard(context, "Password", hotspotState.password) }) {
                                Icon(Icons.Default.ContentCopy, contentDescription = "Copy Password", tint = Color.White, modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                }

                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0284C7).copy(alpha = 0.2f)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.border(1.dp, Color(0xFF38BDF8), RoundedCornerShape(10.dp))
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("2. OPEN THIS IP IN LAPTOP BROWSER:", fontSize = 10.sp, color = Color(0xFF7DD3FC), fontFamily = FontFamily.Monospace)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text(hotspotState.fullUrl, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, fontFamily = FontFamily.Monospace)
                            IconButton(onClick = { copyToClipboard(context, "URL", hotspotState.fullUrl) }) {
                                Icon(Icons.Default.ContentCopy, contentDescription = "Copy URL", tint = Color(0xFF38BDF8))
                            }
                        }
                    }
                }

                Text("Direct Download & Share Options (Mobile):", fontSize = 11.sp, color = Color(0xFF94A3B8), fontWeight = FontWeight.SemiBold)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    
                    // 1. All Photos ZIP Button
                    FilledTonalButton(
                        onClick = { 
                            viewModel.exportPhotosZip(context) { file -> 
                                if (file != null) {
                                    val uri = FileProvider.getUriForFile(context, "${context.packageName}.provider", file)
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
                        },
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(4.dp)
                    ) {
                        Text("Photos (.zip)", fontSize = 10.sp, maxLines = 1)
                    }

                    // 2. Master Excel Button
                    FilledTonalButton(
                        onClick = { 
                            viewModel.exportExcelXls(context) { file -> 
                                if (file != null) {
                                    val uri = FileProvider.getUriForFile(context, "${context.packageName}.provider", file)
                                    val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                        type = "application/vnd.ms-excel"
                                        putExtra(android.content.Intent.EXTRA_STREAM, uri)
                                        addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                    }
                                    context.startActivity(android.content.Intent.createChooser(intent, "Share Excel"))
                                }
                            } 
                        },
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(4.dp)
                    ) {
                        Text("Excel (.xls)", fontSize = 10.sp, maxLines = 1)
                    }

                    // 3. Database CSV Button
                    FilledTonalButton(
                        onClick = { 
                            viewModel.exportCsv(context) { file -> 
                                if (file != null) {
                                    val uri = FileProvider.getUriForFile(context, "${context.packageName}.provider", file)
                                    val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                        type = "text/csv"
                                        putExtra(android.content.Intent.EXTRA_STREAM, uri)
                                        addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                    }
                                    context.startActivity(android.content.Intent.createChooser(intent, "Share CSV"))
                                }
                            } 
                        },
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(4.dp)
                    ) {
                        Text("CSV (.csv)", fontSize = 10.sp, maxLines = 1)
                    }
                }
            } else {
                Text(
                    "Hotspot & Server stopped. Tap 'Start Hotspot Server' to enable file transfer.",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp
                )
            }
        }
    }
}

@Composable
fun ModeBBluetoothTransfer(context: Context, viewModel: SurveyViewModel) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Mode B: Bluetooth Transfer", fontWeight = FontWeight.Bold, fontSize = 14.sp)
            
            Button(
                onClick = {
                    viewModel.exportExcelXls(context) { file ->
                        if (file != null) BluetoothTransferHelper.shareViaBluetooth(context, file)
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF047857))
            ) {
                Icon(Icons.Default.FileDownload, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Send Excel via Bluetooth")
            }

            Button(
                onClick = {
                    viewModel.exportCsv(context) { file ->
                        if (file != null) BluetoothTransferHelper.shareViaBluetooth(context, file)
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155))
            ) {
                Icon(Icons.Default.FileDownload, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Send CSV via Bluetooth")
            }

            Button(
                onClick = {
                    viewModel.exportPhotosZip(context) { file ->
                        if (file != null) BluetoothTransferHelper.shareViaBluetooth(context, file)
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1D4ED8))
            ) {
                Icon(Icons.Default.FolderZip, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Send Photos (.zip) via Bluetooth")
            }
        }
    }
}

@Composable
fun ModeCUsbMassStorage() {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Mode C: USB Cable", fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Text("Connect phone to laptop using USB-C and select 'File Transfer / MTP'.", fontSize = 12.sp, color = Color.DarkGray)
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))) {
                Text(
                    "Laptop Path:\nThis PC > Phone > Documents > GCP_Survey/",
                    fontFamily = FontFamily.Monospace,
                    fontSize = 11.sp,
                    color = Color(0xFF38BDF8),
                    modifier = Modifier.padding(10.dp)
                )
            }
        }
    }
}

fun copyToClipboard(context: Context, label: String, text: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    val clip = ClipData.newPlainText(label, text)
    clipboard.setPrimaryClip(clip)
    Toast.makeText(context, "$label copied", Toast.LENGTH_SHORT).show()
}
