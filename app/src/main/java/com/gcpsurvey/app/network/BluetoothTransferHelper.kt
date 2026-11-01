package com.gcpsurvey.app.network

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import java.io.File

object BluetoothTransferHelper {

    /**
     * Shares a file via Bluetooth (or falls back to system share sheet).
     *
     * @param context    App context
     * @param fileToSend File to share (zip / xls / csv)
     */
    fun shareViaBluetooth(context: Context, fileToSend: File) {
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.provider",
            fileToSend
        )

        val mime = when (fileToSend.extension.lowercase()) {
            "zip" -> "application/zip"
            "xls" -> "application/vnd.ms-excel"
            "csv" -> "text/csv"
            else -> "*/*"
        }

        val intent = Intent(Intent.ACTION_SEND).apply {
            type = mime
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            setPackage("com.android.bluetooth")
        }

        try {
            context.startActivity(intent)
        } catch (_: Exception) {
            // Fallback: Bluetooth app nahi mili → general share sheet kholo
            val fallbackIntent = Intent(Intent.ACTION_SEND).apply {
                type = mime
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                // no package filter
            }
            val chooser = Intent.createChooser(fallbackIntent, "Send to Laptop")
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(chooser)
        }
    }
}
// ✅ File end
