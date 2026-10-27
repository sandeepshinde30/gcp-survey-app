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

        val sb = StringBuilder()
        sb.append("<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'>")
        sb.append("<head><meta charset='utf-8'><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>GCP Survey Master</x:Name>")
        sb.append("<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>")
        sb.append("<body><table border='1'>")
        sb.append("<tr style='background-color:#0284c7; color:#ffffff; font-weight:bold;'>")
        sb.append("<th>ID</th><th>Date</th><th>Project</th><th>City</th><th>Operator</th><th>GCP ID</th><th>Station Type</th><th>Survey Mode</th><th>Mark Type</th><th>Status</th><th>Start Time</th><th>End Time</th><th>Obs Duration</th><th>Antenna Ht (m)</th><th>Latitude</th><th>Longitude</th><th>Altitude</th><th>Accuracy</th><th>Segment Dist (m)</th><th>Accumulated Dist (m)</th><th>Folder Path</th>")
        sb.append("</tr>")

        records.forEach { r ->
            sb.append("<tr>")
            sb.append("<td>${r.id}</td><td>${r.date}</td><td>${r.projectName}</td><td>${r.city}</td><td>${r.operatorName}</td><td>${r.gcpId}</td><td>${r.stationType}</td><td>${r.surveyMode}</td><td>${r.pointMarkType}</td><td>${r.pointStatus}</td><td>${r.startTime ?: ""}</td><td>${r.endTime ?: ""}</td><td>${r.totalObservationTime ?: ""}</td><td>${r.antennaHeight}</td><td>${r.latitude}</td><td>${r.longitude}</td><td>${r.altitude ?: ""}</td><td>${r.accuracy ?: ""}</td><td>${r.segmentDistanceMeters}</td><td>${r.accumulatedDistanceMeters}</td><td>${r.folderPath}</td>")
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
                val relativePath = file.relativeTo(documentsDir).path
                zos.putNextEntry(ZipEntry(relativePath))
                file.inputStream().use { it.copyTo(zos) }
                zos.closeEntry()
            }
        }
        return zipFile
    }
}
