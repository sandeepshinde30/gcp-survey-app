package com.gcpsurvey.app.camera

import android.location.Location
import androidx.exifinterface.media.ExifInterface
import java.io.File

object PhotoGeotagManager {
    /**
     * Injects latitude and longitude into photo EXIF metadata using ExifInterface.
     */
    fun injectGpsCoordinates(photoFile: File, location: Location) {
        try {
            val exif = ExifInterface(photoFile.absolutePath)
            exif.setLatLong(location.latitude, location.longitude)
            if (location.hasAltitude()) {
                exif.setAltitude(location.altitude)
            }
            exif.saveAttributes()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
