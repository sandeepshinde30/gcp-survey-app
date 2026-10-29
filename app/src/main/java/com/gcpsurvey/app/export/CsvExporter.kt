package com.gcpsurvey.app.export

import android.content.Context
import android.os.Environment
import com.gcpsurvey.app.data.GcpSurveyEntity
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

object CsvExporter {
    fun exportToCsv(context: Context, records: List<GcpSurveyEntity>): File? {
        val documentsDir = context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS) ?: context.filesDir
        val surveyFolder = File(documentsDir, "GCP_Survey").apply { mkdirs() }
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val csvFile = File(surveyFolder, "GCP_Survey_Database_$timeStamp.csv")

        val header = "ID,Date,Project,City,Operator,GCP_ID,Station_Type,Survey_Mode,Point_Mark_Type,Status," +
                "Start_Time,End_Time,Total_Obs_Time,Antenna_Height_Meters,Latitude,Longitude,Altitude,Accuracy," +
                "Previous_Point_Type,Previous_Point_ID,Segment_Distance_Meters,Accumulated_Distance_Meters,Folder_Path\n"

        FileOutputStream(csvFile).use { fos ->
            fos.write(header.toByteArray())
            records.forEach { r ->
                val line = "${r.id},${r.date},${r.projectName},${r.city},${r.operatorName},${r.gcpId},${r.stationType},${r.surveyMode},${r.pointMarkType},${r.pointStatus}," +
                        "${r.startTime ?: ""},${r.endTime ?: ""},${r.totalObservationTime ?: ""},${r.antennaHeight},${r.latitude},${r.longitude},${r.altitude ?: ""},${r.accuracy ?: ""}," +
                        "${r.previousPointType},${r.previousPointId ?: ""},${r.segmentDistanceMeters},${r.accumulatedDistanceMeters},${r.folderPath}\n"
                fos.write(line.toByteArray())
            }
        }
        return csvFile
    }

    fun exportToExcelXls(context: Context, records: List<GcpSurveyEntity>): File? {
        val documentsDir = context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS) ?: context.filesDir
        val surveyFolder = File(documentsDir, "GCP_Survey").apply { mkdirs() }
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val xlsFile = File(surveyFolder, "GCP_Master_Excel_$timeStamp.xls")

        // --- Analysis (Productivity) ---
        val totalPoints = records.size
        val totalDistance = records.sumOf { it.segmentDistanceMeters }
        val totalAccumulated = if (records.isNotEmpty()) records.maxOf { it.accumulatedDistanceMeters } else 0.0
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
        val avgSpeed = if (totalObsTimeSeconds > 0) (totalDistance / 1000.0) / (totalObsTimeSeconds / 3600.0) else 0.0

        val sb = StringBuilder()
        sb.append("<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'>")
        sb.append("<head><meta charset='utf-8'><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>GCP Survey Master</x:Name>")
        sb.append("<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>")
        sb.append("<body>")
        
        // --- Title ---
        sb.append("<h2>GCP Survey Productivity Report</h2>")
        
        // --- Analysis Summary Table ---
        sb.append("<table border='1' style='border-collapse: collapse; margin-bottom: 20px;'>")
        sb.append("<tr style='background-color:#059669; color:#ffffff; font-weight:bold;'><th colspan='2'>PRODUCTIVITY SUMMARY</th></tr>")
        sb.append("<tr><td><b>Total Points Captured</b></td><td>$totalPoints</td></tr>")
        sb.append("<tr><td><b>Total Travel Distance (km)</b></td><td>${String.format(Locale.US, "%.3f", totalAccumulated / 1000.0)} km</td></tr>")
        sb.append("<tr><td><b>Average Distance per Point (m)</b></td><td>${String.format(Locale.US, "%.2f", avgDistance)} m</td></tr>")
        sb.append("<tr><td><b>Total Observation Time</b></td><td>${hours}h ${minutes}m</td></tr>")
        sb.append("<tr><td><b>Average Walking Speed (km/h)</b></td><td>${String.format(Locale.US, "%.2f", avgSpeed)} km/h</td></tr>")
        sb.append("</table>")

        // --- Raw Data Table ---
        sb.append("<h3>Detailed Point-to-Point Data</h3>")
        sb.append("<table border='1' style='border-collapse: collapse;'>")
        sb.append("<tr style='background-color:#0284c7; color:#ffffff; font-weight:bold;'>")
        sb.append("<th>ID</th><th>Date</th><th>Project</th><th>Operator</th><th>GCP ID</th><th>Status</th><th>Start Time</th><th>End Time</th><th>Obs Duration</th><th>Latitude</th><th>Longitude</th><th>From (Previous)</th><th>To (Current)</th><th>Segment Dist (m)</th><th>Accumulated Dist (m)</th><th>Folder Path</th>")
        sb.append("</tr>")

        records.forEach { r ->
            val prevName = if (r.previousPointType == "hotel") "Hotel" else r.previousPointId ?: "None"
            sb.append("<tr>")
            sb.append("<td>${r.id}</td><td>${r.date}</td><td>${r.projectName}</td><td>${r.operatorName}</td><td>${r.gcpId}</td><td>${r.pointStatus}</td><td>${r.startTime ?: ""}</td><td>${r.endTime ?: ""}</td><td>${r.totalObservationTime ?: ""}</td><td>${r.latitude}</td><td>${r.longitude}</td>")
            sb.append("<td style='color:#D97706; font-weight:bold;'>$prevName</td>")
            sb.append("<td style='color:#0369A1; font-weight:bold;'>${r.gcpId}</td>")
            sb.append("<td>${String.format(Locale.US, "%.2f", r.segmentDistanceMeters)}</td><td>${String.format(Locale.US, "%.2f", r.accumulatedDistanceMeters)}</td><td>${r.folderPath}</td>")
            sb.append("</tr>")
        }

        sb.append("</table></body></html>")

        FileOutputStream(xlsFile).use { fos ->
            fos.write(sb.toString().toByteArray(Charsets.UTF_8))
        }
        return xlsFile
    }

    fun createPhotosZip(context: Context): File? {
        val documentsDir = context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS) ?: context.filesDir
        val surveyFolder = File(documentsDir, "GCP_Survey")
        if (!surveyFolder.exists()) return null

        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val zipFile = File(documentsDir, "GCP_All_Folders_Photos_$timeStamp.zip")

        ZipOutputStream(FileOutputStream(zipFile)).use { zos ->
            surveyFolder.walkTopDown().filter { it.isFile && !it.name.endsWith(".zip") }.forEach { file ->
                val relativePath = file.relativeTo(surveyFolder).path
                zos.putNextEntry(ZipEntry(relativePath))
                file.inputStream().use { it.copyTo(zos) }
                zos.closeEntry()
            }
        }
        return zipFile
    }
}
