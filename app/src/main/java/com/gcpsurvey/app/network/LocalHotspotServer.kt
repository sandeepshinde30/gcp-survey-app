package com.gcpsurvey.app.network

import android.content.Context
import android.os.Environment
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpHandler
import com.sun.net.httpserver.HttpServer
import java.io.File
import java.io.FileInputStream
import java.net.InetSocketAddress
import java.util.concurrent.Executors

/**
 * Lightweight local HTTP server running directly on the surveyor's Android phone.
 * Serves 3 buttons:
 * 1. Download All Photos (.zip)
 * 2. Download Master Excel (.xls)
 * 3. Download Survey Database (.csv)
 * Chunked 64KB buffer streaming prevents memory crashes.
 */
class LocalHotspotServer(private val context: Context, private val port: Int = 8080) {
    private var server: HttpServer? = null
    var isRunning = false
        private set

    fun start(onStarted: (String) -> Unit = {}) {
        if (isRunning) return
        try {
            server = HttpServer.create(InetSocketAddress(port), 0).apply {
                executor = Executors.newCachedThreadPool()

                createContext("/", DashboardHandler(context))
                createContext("/download/zip", FileDownloadHandler(context, "zip"))
                createContext("/download/xls", FileDownloadHandler(context, "xls"))
                createContext("/download/csv", FileDownloadHandler(context, "csv"))

                start()
            }
            isRunning = true
            onStarted("http://0.0.0.0:$port")
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun stop() {
        server?.stop(0)
        server = null
        isRunning = false
    }

    private class DashboardHandler(private val context: Context) : HttpHandler {
        override fun handle(exchange: HttpExchange) {
            val html = """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>GCP Survey - Laptop Transfer Portal</title>
                    <style>
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
                        .card { width: 100%; max-width: 640px; background: #1e293b; border-radius: 20px; padding: 32px; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center; }
                        .pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
                        h1 { color: #38bdf8; font-size: 26px; font-weight: 800; margin-bottom: 8px; }
                        p.subtitle { color: #94a3b8; font-size: 14px; line-height: 1.5; margin-bottom: 28px; }
                        .buttons-grid { display: flex; flex-direction: column; gap: 14px; }
                        .btn { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; transition: transform 0.15s ease, filter 0.15s ease; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); }
                        .btn:hover { filter: brightness(1.1); transform: translateY(-2px); }
                        .btn-blue { background: #2563eb; color: #ffffff; }
                        .btn-green { background: #059669; color: #ffffff; }
                        .btn-slate { background: #475569; color: #ffffff; }
                        .btn-badge { font-size: 11px; background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 6px; text-transform: uppercase; }
                        .footer { margin-top: 28px; padding-top: 18px; border-top: 1px solid #334155; font-size: 12px; color: #64748b; font-family: monospace; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="pill">
                            <span>●</span> 100% Offline Hotspot Transfer Active
                        </div>
                        <h1>GCP Survey Data Transfer Portal</h1>
                        <p class="subtitle">Direct chunked streaming from Android phone to laptop over local Wi-Fi. No internet, cables, or external drivers required.</p>
                        
                        <div class="buttons-grid">
                            <a href="/download/zip" class="btn btn-blue">
                                <span>📁 Download All Photos (.zip)</span>
                                <span class="btn-badge">Nested Folders</span>
                            </a>
                            <a href="/download/xls" class="btn btn-green">
                                <span>📊 Download Master Excel (.xls)</span>
                                <span class="btn-badge">Distances + Timings</span>
                            </a>
                            <a href="/download/csv" class="btn btn-slate">
                                <span>📄 Download Survey Database (.csv)</span>
                                <span class="btn-badge">Clean Tabular</span>
                            </a>
                        </div>

                        <div class="footer">
                            Port 8080 • Chunked 64KB Stream • High Speed Local Transfer
                        </div>
                    </div>
                </body>
                </html>
            """.trimIndent()
            val bytes = html.toByteArray()
            exchange.responseHeaders.set("Content-Type", "text/html; charset=UTF-8")
            exchange.sendResponseHeaders(200, bytes.size.toLong())
            exchange.responseBody.use { it.write(bytes) }
        }
    }

    private class FileDownloadHandler(private val context: Context, private val ext: String) : HttpHandler {
        override fun handle(exchange: HttpExchange) {
            val docDir = context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS) ?: context.filesDir
            val surveyDir = File(docDir, "GCP_Survey")
            val searchDir = if (surveyDir.exists()) surveyDir else docDir

            val files = searchDir.walkTopDown().filter { it.isFile && it.extension.equals(ext, ignoreCase = true) }.toList()
            val fileToServe = files.maxByOrNull { it.lastModified() }

            if (fileToServe != null && fileToServe.exists()) {
                val mime = when (ext) {
                    "xls" -> "application/vnd.ms-excel"
                    "csv" -> "text/csv"
                    "zip" -> "application/zip"
                    else -> "application/octet-stream"
                }
                exchange.responseHeaders.set("Content-Type", mime)
                exchange.responseHeaders.set("Content-Disposition", "attachment; filename=\"${fileToServe.name}\"")
                
                exchange.sendResponseHeaders(200, fileToServe.length())
                FileInputStream(fileToServe).use { input ->
                    exchange.responseBody.use { output ->
                        val buffer = ByteArray(64 * 1024)
                        var bytesRead: Int
                        while (input.read(buffer).also { bytesRead = it } != -1) {
                            output.write(buffer, 0, bytesRead)
                        }
                    }
                }
            } else {
                val msg = "No .$ext file generated yet. Please open the Survey app on the phone and export first."
                exchange.responseHeaders.set("Content-Type", "text/plain")
                exchange.sendResponseHeaders(404, msg.length.toLong())
                exchange.responseBody.use { it.write(msg.toByteArray()) }
            }
        }
    }
}
