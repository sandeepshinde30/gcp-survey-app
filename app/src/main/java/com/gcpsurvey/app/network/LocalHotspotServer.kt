package com.gcpsurvey.app.network

import android.content.Context
import android.net.wifi.WifiManager
import android.os.Build
import android.util.Log

data class HotspotInfoState(
    val isActive: Boolean = false,
    val ssid: String = "GCP-SURVEY-AP",
    val password: String = "survey@field2026",
    val ipAddress: String = "192.168.43.1",
    val port: Int = 8080,
    val fullUrl: String = "http://192.168.43.1:8080"
)

class LocalOnlyHotspotManager(private val context: Context) {

    private var reservation: WifiManager.LocalOnlyHotspotReservation? = null

    fun startHotspot(onSuccess: (HotspotInfoState) -> Unit, onFailed: () -> Unit) {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                wifiManager.startLocalOnlyHotspot(object : WifiManager.LocalOnlyHotspotCallback() {
                    override fun onStarted(res: WifiManager.LocalOnlyHotspotReservation) {
                        reservation = res
                        val ssid = res.wifiConfiguration?.SSID ?: "GCP-SURVEY"
                        val password = res.wifiConfiguration?.preSharedKey ?: "12345678"
                        val ipAddress = getHotspotIpAddress()
                        
                        val info = HotspotInfoState(
                            isActive = true,
                            ssid = ssid,
                            password = password,
                            ipAddress = ipAddress,
                            port = 8080,
                            fullUrl = "http://$ipAddress:8080"
                        )
                        onSuccess(info)
                    }

                    override fun onStopped() {}
                    override fun onFailed(reason: Int) { onFailed() }
                }, null)
            } else {
                onFailed()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            onFailed()
        }
    }

    fun stopHotspot() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reservation?.close()
            reservation = null
        }
    }

    private fun getHotspotIpAddress(): String {
        return try {
            val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
            for (networkInterface in java.util.Collections.list(interfaces)) {
                val addresses = networkInterface.inetAddresses
                for (address in java.util.Collections.list(addresses)) {
                    if (!address.isLoopbackAddress && address is java.net.Inet4Address) {
                        return address.hostAddress ?: "192.168.43.1"
                    }
                }
            }
            "192.168.43.1"
        } catch (e: Exception) {
            "192.168.43.1"
        }
    }
}
