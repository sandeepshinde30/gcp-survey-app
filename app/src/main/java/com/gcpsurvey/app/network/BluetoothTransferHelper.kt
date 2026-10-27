package com.gcpsurvey.app.network

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import java.io.File

object BluetoothTransferHelper {
    fun shareViaBluetooth(context: Context, fileToSend: File) {
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            fileToSend
        )
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = when (fileToSend.extension.lowercase()) {
                "zip" -> "application/zip"
                "xls" -> "application/vnd.ms-excel"
                "csv" -> "text/csv"
                else -> "*/*"
            }
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            setPackage("com.android.bluetooth")
        }

        try {
            context.startActivity(intent)
        } catch (e: Exception) {
            val chooser = Intent.createChooser(intent.apply { `package` = null }, "Send to Laptop via Bluetooth")
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(chooser)
        }
    }
}
