package com.gcpsurvey.app.export

import android.content.Context
import android.os.Environment
import com.gcpsurvey.app.data.GcpSurveyEntity
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

object CsvExporter {

    // ===================== CSV Export =====================

    fun exportToCsv(context: Context, records: List<GcpSurveyEntity>): File? {
        val documentsDir = context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS)
            ?: context.filesDir
        val surveyFolder = File(documentsDir, "GCP_Survey").apply { mkdirs() }
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val csvFile = File(surveyFolder, "GCP_Survey_Database_$timeStamp.csv")

        val header = "ID,Date,Project,City,Operator,GCP_ID,Station_Type,Survey_Mode," +
                "Point_Mark_Type,Status,Start_Time,End_Time,Total_Obs_Time," +
                "Antenna_Height_Meters,Latitude,Longitude,Altitude,Accuracy," +
                "Previous_Point_Type,Previous_Point_ID,Segment_Distance_Meters," +
                "Accumulated_Distance_Meters,Folder_Path\n"

        FileOutputStream(csvFile).use { fos ->
            fos.write(header.toByteArray())
            records.forEach { r ->
                val line = "${r.id},${r.date},${r.projectName},${r.city}," +
                        "${r.operatorName},${r.gcpId},${r.stationType},${r.surveyMode}," +
                        "${r.pointMarkType},${r.pointStatus}," +
                        "${r.startTime ?: ""},${r.endTime ?: ""}," +
                        "${r.totalObservationTime ?: ""},${r.antennaHeight}," +
                        "${r.latitude},${r.longitude}," +
                        "${r.altitude ?: ""},${r.accuracy ?: ""}," +
                        "${r.previousPointType},${r.previousPointId ?: ""}," +
                        "${r.segmentDistanceMeters},${r.accumulatedDistanceMeters}," +
                        "${r.folderPath}\n"
                fos.write(line.toByteArray())
            }
        }
        return csvFile
    }

    // ===================== Excel XLS Export =====================

    fun exportToExcelXls(context: Context, records: List<GcpSurveyEntity>): File? {
        val documentsDir = context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS)
            ?: context.filesDir
        val surveyFolder = File(documentsDir, "GCP_Survey").apply { mkdirs() }
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val xlsFile = File(surveyFolder, "GCP_Master_Excel_$timeStamp.xls")

        // ---- Productivity analysis ----
        val totalPoints = records.size
        val totalDistance = records.sumOf { it.segmentDistanceMeters }
        val totalAccumulated = if (records.isNotEmpty())
            records.maxOf { it.accumulatedDistanceMeters } else 0.0
        val avgDistance = if (totalPoints > 0) totalDistance / totalPoints else 0.0

        var totalObsTimeSeconds = 0
        records.forEach { r ->
            val timeStr = r.totalObservationTime ?: "00m 00s"
            val regex = "(\\d+)([hms])".toRegex()
            regex.findAll(timeStr).forEach { match ->
                val value = match.groupValues[1].toIntOrNull() ?: 0
                when (match.groupValues[2]) {
                    "h" -> totalObsTimeSeconds += value * 3600
                    "m" -> totalObsTimeSeconds += value * 60
                    "s" -> totalObsTimeSeconds += value
                }
            }
        }

        val hours = totalObsTimeSeconds / 3600
        val minutes = (totalObsTimeSeconds % 3600) / 60
        val avgSpeed = if (totalObsTimeSeconds > 0)
            (totalDistance / 1000.0) / (totalObsTimeSeconds / 3600.0) else 0.0

        val sb = StringBuilder()
        sb.append("<html xmlns:o='urn:schemas-microsoft-com:office:office' ")
        sb.append("xmlns:x='urn:schemas-microsoft-com:office:excel' ")
        sb.append("xmlns='http://www.w3.org/TR/REC-html40'>")
        sb.append("<head><meta charset='utf-8'>")
        sb.append("<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>")
        sb.append("<x:ExcelWorksheet><x:Name>GCP Survey Master</x:Name>")
        sb.append("<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>")
        sb.append("</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->")
        sb.append("</head><body>")

        // Title
        sb.append("<h2>GCP Survey Productivity Report</h2>")

        // Summary
        sb.append("<table border='1' style='border-collapse: collapse; margin-bottom: 20px;'>")
        sb.append("<tr style='background-color:#059669; color:#ffffff; font-weight:bold;'>")
        sb.append("<th colspan='2'>PRODUCTIVITY SUMMARY</th></tr>")
        sb.append("<tr><td><b>Total Points Captured</b></td><td>$totalPoints</td></tr>")
        sb.append("<tr><td><b>Total Travel Distance (km)</b></td>")
        sb.append("<td>${String.format(Locale.US, "%.3f", totalAccumulated / 1000.0)} km</td></tr>")
        sb.append("<tr><td><b>Average Distance per Point (m)</b></td>")
        sb.append("<td>${String.format(Locale.US, "%.2f", avgDistance)} m</td></tr>")
        sb.append("<tr><td><b>Total Observation Time</b></td><td>${hours}h ${minutes}m</td></tr>")
        sb.append("<tr><td><b>Average Walking Speed (km/h)</b></td>")
        sb.append("<td>${String.format(Locale.US, "%.2f", avgSpeed)} km/h</td></tr>")
        sb.append("</table>")

        // Detailed data
        sb.append("<h3>Detailed Point-to-Point Data</h3>")
        sb.append("<table border='1' style='border-collapse: collapse;'>")
        sb.append("<tr style='background-color:#0284c7; color:#ffffff; font-weight:bold;'>")
        sb.append("<th>ID</th><th>Date</th><th>Project</th><th>Operator</th>")
        sb.append("<th>GCP ID</th><th>Status</th><th>Start Time</th><th>End Time</th>")
        sb.append("<th>Obs Duration</th><th>Latitude</th><th>Longitude</th>")
        sb.append("<th>From (Previous)</th><th>To (Current)</th>")
        sb.append("<th>Segment Dist (m)</th><th>Accumulated Dist (m)</th><th>Folder Path</th>")
        sb.append("</tr>")

        records.forEach { r ->
            val prevName = if (r.previousPointType == "hotel") "Hotel"
            else r.previousPointId ?: "None"

            sb.append("<tr>")
            sb.append("<td>${r.id}</td>")
            sb.append("<td>${r.date}</td>")
            sb.append("<td>${r.projectName}</td>")
            sb.append("<td>${r.operatorName}</td>")
            sb.append("<td>${r.gcpId}</td>")
            sb.append("<td>${r.pointStatus}</td>")
            sb.append("<td>${r.startTime ?: ""}</td>")
            sb.append("<td>${r.endTime ?: ""}</td>")
            sb.append("<td>${r.totalObservationTime ?: ""}</td>")
            sb.append("<td>${r.latitude}</td>")
            sb.append("<td>${r.longitude}</td>")
            sb.append("<td style='color:#D97706; font-weight:bold;'>$prevName</td>")
            sb.append("<td style='color:#0369A1; font-weight:bold;'>${r.gcpId}</td>")
            sb.append("<td>${String.format(Locale.US, "%.2f", r.segmentDistanceMeters)}</td>")
            sb.append("<td>${String.format(Locale.US, "%.2f", r.accumulatedDistanceMeters)}</td>")
            sb.append("<td>${r.folderPath}</td>")
            sb.append("</tr>")
        }

        sb.append("</table></body></html>")

        FileOutputStream(xlsFile).use { fos ->
            fos.write(sb.toString().toByteArray(Charsets.UTF_8))
        }
        return xlsFile
    }

    // ===================== Photos ZIP Export =====================

    fun createPhotosZip(context: Context): File? {
        val documentsDir = context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS)
            ?: context.filesDir

        val galleryFolder = File(
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES),
            "GCP_Survey"
        )
        val appFolder = File(documentsDir, "GCP_Survey")

        if (!galleryFolder.exists() && !appFolder.exists()) return null

        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val zipFile = File(documentsDir, "GCP_All_Folders_Photos_$timeStamp.zip")

        ZipOutputStream(FileOutputStream(zipFile)).use { zos ->
            // 1. Gallery photos → Photos/ folder in zip
            if (galleryFolder.exists()) {
                galleryFolder.walkTopDown().filter { it.isFile }.forEach { file ->
                    val relativePath = "Photos/" + file.relativeTo(galleryFolder).path
                    zos.putNextEntry(ZipEntry(relativePath))
                    file.inputStream().use { it.copyTo(zos) }
                    zos.closeEntry()
                }
            }

            // 2. App reports (CSV/Excel) → Reports/ folder in zip
            if (appFolder.exists()) {
                appFolder.walkTopDown()
                    .filter { it.isFile && !it.name.endsWith(".zip") }
                    .forEach { file ->
                        val relativePath = "Reports/" + file.relativeTo(appFolder).path
                        zos.putNextEntry(ZipEntry(relativePath))
                        file.inputStream().use { it.copyTo(zos) }
                        zos.closeEntry()
                    }
            }
        }
        return zipFile
    }
}
// ✅ File end
