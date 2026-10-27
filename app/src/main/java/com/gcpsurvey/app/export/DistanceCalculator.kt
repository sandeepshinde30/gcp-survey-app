package com.gcpsurvey.app.export

import android.location.Location

object DistanceCalculator {
    /**
     * Calculates distance in meters between two WGS-84 coordinates
     * using Android's native Location.distanceBetween().
     */
    fun calculateDistanceMeters(
        startLat: Double,
        startLon: Double,
        endLat: Double,
        endLon: Double
    ): Double {
        val results = FloatArray(1)
        Location.distanceBetween(startLat, startLon, endLat, endLon, results)
        return results[0].toDouble()
    }
}
