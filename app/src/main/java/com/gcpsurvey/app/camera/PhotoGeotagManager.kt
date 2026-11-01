package com.gcpsurvey.app.camera

import android.location.Location
import androidx.exifinterface.media.ExifInterface
import java.io.File
import java.util.Locale

object PhotoGeotagManager {

    /**
     * Injects GPS coordinates (lat/lon/altitude) into the photo's EXIF metadata.
     *
     * @param photoFile The photo file on disk (JPEG)
     * @param location  GPS location from FusedLocationProvider
     */
    fun injectGpsCoordinates(photoFile: File, location: Location) {
        try {
            val exif = ExifInterface(photoFile.absolutePath)

            // ---- Latitude ----
            exif.setAttribute(
                ExifInterface.TAG_GPS_LATITUDE,
                convertToDegreeMinuteSecond(location.latitude)
            )
            exif.setAttribute(
                ExifInterface.TAG_GPS_LATITUDE_REF,
                if (location.latitude >= 0) "N" else "S"
            )

            // ---- Longitude ----
            exif.setAttribute(
                ExifInterface.TAG_GPS_LONGITUDE,
                convertToDegreeMinuteSecond(location.longitude)
            )
            exif.setAttribute(
                ExifInterface.TAG_GPS_LONGITUDE_REF,
                if (location.longitude >= 0) "E" else "W"
            )

            // ---- Altitude (if available) ----
            if (location.hasAltitude()) {
                exif.setAttribute(
                    ExifInterface.TAG_GPS_ALTITUDE,
                    "${location.altitude}/1"
                )
                exif.setAttribute(
                    ExifInterface.TAG_GPS_ALTITUDE_REF,
                    "0" // 0 = above sea level
                )
            }

            // ---- Save ----
            exif.saveAttributes()

        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Converts decimal degrees to EXIF DMS format: "degrees/1,minutes/1,seconds/1".
     */
    private fun convertToDegreeMinuteSecond(coordinate: Double): String {
        val absolute = Math.abs(coordinate)
        val degrees = absolute.toInt()
        val minutes = ((absolute - degrees) * 60).toInt()
        val seconds = (((absolute - degrees) * 60) - minutes) * 60
        val secondsFormatted = String.format(Locale.US, "%.6f", seconds)
        return "$degrees/1,$minutes/1,$secondsFormatted/1"
    }
}
// ✅ File end
