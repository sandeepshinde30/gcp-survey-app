package com.gcpsurvey.app.camera

import android.location.Location
import androidx.exifinterface.media.ExifInterface
import java.io.File

object PhotoGeotagManager {
    
    fun injectGpsCoordinates(photoFile: File, location: Location) {
        try {
            // फोटो को एक्सिफ (Exif) डेटा के लिए खोलें
            val exif = ExifInterface(photoFile.absolutePath)
            
            // Latitude (अक्षांश) को सेव करें
            exif.setAttribute(
                ExifInterface.TAG_GPS_LATITUDE, 
                convertToDegreeMinuteSecond(location.latitude)
            )
            exif.setAttribute(
                ExifInterface.TAG_GPS_LATITUDE_REF, 
                if (location.latitude >= 0) "N" else "S"
            )
            
            // Longitude (देशांतर) को सेव करें
            exif.setAttribute(
                ExifInterface.TAG_GPS_LONGITUDE, 
                convertToDegreeMinuteSecond(location.longitude)
            )
            exif.setAttribute(
                ExifInterface.TAG_GPS_LONGITUDE_REF, 
                if (location.longitude >= 0) "E" else "W"
            )
            
            // Altitude (ऊंचाई) को सेव करें (अगर उपलब्ध हो)
            if (location.hasAltitude()) {
                exif.setAttribute(
                    ExifInterface.TAG_GPS_ALTITUDE, 
                    "${location.altitude}/1"
                )
                exif.setAttribute(
                    ExifInterface.TAG_GPS_ALTITUDE_REF, 
                    "0" // 0 का मतलब समुद्र तल से ऊपर
                )
            }
            
            // सारे बदलाव फोटो में सेव करें
            exif.saveAttributes()
            
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // GPS को डिग्री, मिनट और सेकंड (DMS) फॉर्मेट में बदलने का तरीका
    private fun convertToDegreeMinuteSecond(coordinate: Double): String {
        val absolute = Math.abs(coordinate)
        val degrees = absolute.toInt()
        val minutes = ((absolute - degrees) * 60).toInt()
        val seconds = (((absolute - degrees) * 60) - minutes) * 60
        val secondsFormatted = String.format(java.util.Locale.US, "%.6f", seconds)
        return "$degrees/1,$minutes/1,$secondsFormatted/1"
    }
}
