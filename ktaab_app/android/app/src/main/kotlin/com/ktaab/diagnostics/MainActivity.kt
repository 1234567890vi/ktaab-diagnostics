package com.ktaab.diagnostics

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.os.Environment
import android.os.StatFs
import android.view.Display
import android.view.WindowManager
import androidx.annotation.NonNull
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.BufferedReader
import java.io.File
import java.io.FileReader

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.ktaab.diagnostics/deep_battery"

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "getDeepBatteryInfo" -> {
                    val batteryData = getDeepBatteryMetrics()
                    result.success(batteryData)
                }
                "getDeepHardwareInfo" -> {
                    val hardwareData = getDeepHardwareMetrics()
                    result.success(hardwareData)
                }
                "checkRootStatus" -> {
                    result.success(isDeviceRooted())
                }
                "getRefreshRate" -> {
                    result.success(getDisplayRefreshRate())
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    /**
     * Reads deep battery diagnostics via Android BatteryManager and ACTION_BATTERY_CHANGED
     */
    private fun getDeepBatteryMetrics(): Map<String, Any?> {
        val map = HashMap<String, Any?>()
        val batteryIntent: Intent? = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))

        if (batteryIntent != null) {
            val level = batteryIntent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
            val scale = batteryIntent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
            val percentage = if (level >= 0 && scale > 0) (level * 100.0 / scale) else 0.0

            val tempTenths = batteryIntent.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0)
            val tempCelsius = tempTenths / 10.0

            val voltageMV = batteryIntent.getIntExtra(BatteryManager.EXTRA_VOLTAGE, 0)
            val technology = batteryIntent.getStringExtra(BatteryManager.EXTRA_TECHNOLOGY) ?: "Li-ion"

            val rawHealth = batteryIntent.getIntExtra(BatteryManager.EXTRA_HEALTH, BatteryManager.BATTERY_HEALTH_UNKNOWN)
            val healthString = when (rawHealth) {
                BatteryManager.BATTERY_HEALTH_GOOD -> "Good"
                BatteryManager.BATTERY_HEALTH_OVERHEAT -> "Overheat"
                BatteryManager.BATTERY_HEALTH_DEAD -> "Dead"
                BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE -> "Over Voltage"
                BatteryManager.BATTERY_HEALTH_UNSPECIFIED_FAILURE -> "Unspecified Failure"
                BatteryManager.BATTERY_HEALTH_COLD -> "Cold"
                else -> "Unknown"
            }

            val rawStatus = batteryIntent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
            val isCharging = rawStatus == BatteryManager.BATTERY_STATUS_CHARGING || rawStatus == BatteryManager.BATTERY_STATUS_FULL
            val statusString = when (rawStatus) {
                BatteryManager.BATTERY_STATUS_CHARGING -> "Charging"
                BatteryManager.BATTERY_STATUS_DISCHARGING -> "Discharging"
                BatteryManager.BATTERY_STATUS_FULL -> "Full"
                BatteryManager.BATTERY_STATUS_NOT_CHARGING -> "Not Charging"
                else -> "Unknown"
            }

            val plugged = batteryIntent.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1)
            val chargingSource = when (plugged) {
                BatteryManager.BATTERY_PLUGGED_AC -> "شاحن جداري (AC)"
                BatteryManager.BATTERY_PLUGGED_USB -> "منفذ USB"
                BatteryManager.BATTERY_PLUGGED_WIRELESS -> "شحن لاسلكي (Wireless)"
                else -> if (isCharging) "متصل بالشاحن" else "تفريغ الشحن (Discharging)"
            }

            // Battery Manager System Service properties
            val batteryManager = getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
            var capacityPercent = -1
            var chargeCounter = -1L

            if (batteryManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    capacityPercent = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
                    chargeCounter = batteryManager.getLongProperty(BatteryManager.BATTERY_PROPERTY_CHARGE_COUNTER)
                }
            }

            map["level"] = percentage
            map["temperatureC"] = tempCelsius
            map["voltageMV"] = voltageMV
            map["technology"] = technology
            map["health"] = healthString
            map["status"] = statusString
            map["isCharging"] = isCharging
            map["chargingType"] = chargingSource
            map["chargeCounter"] = chargeCounter
            map["capacityMAh"] = if (chargeCounter > 0) (chargeCounter / 1000) else null
        }

        return map
    }

    /**
     * Reads deep hardware metrics: RAM, Internal Storage, CPU details
     */
    private fun getDeepHardwareMetrics(): Map<String, Any?> {
        val map = HashMap<String, Any?>()

        // RAM Info via ActivityManager
        val actManager = getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
        val memInfo = ActivityManager.MemoryInfo()
        if (actManager != null) {
            actManager.getMemoryInfo(memInfo)
            val totalRamMB = memInfo.totalMem / (1024 * 1024)
            val freeRamMB = memInfo.availMem / (1024 * 1024)
            val usedRamMB = totalRamMB - freeRamMB
            map["totalRamMB"] = totalRamMB
            map["freeRamMB"] = freeRamMB
            map["usedRamMB"] = usedRamMB
            map["isLowMemory"] = memInfo.lowMemory
        }

        // Storage Info via StatFs
        try {
            val path = Environment.getDataDirectory()
            val stat = StatFs(path.path)
            val blockSize = stat.blockSizeLong
            val totalBlocks = stat.blockCountLong
            val availableBlocks = stat.availableBlocksLong

            val totalStorageGB = (totalBlocks * blockSize) / (1024.0 * 1024.0 * 1024.0)
            val freeStorageGB = (availableBlocks * blockSize) / (1024.0 * 1024.0 * 1024.0)

            map["totalStorageGB"] = Math.round(totalStorageGB * 100.0) / 100.0
            map["freeStorageGB"] = Math.round(freeStorageGB * 100.0) / 100.0
        } catch (e: Exception) {
            map["totalStorageGB"] = 0.0
            map["freeStorageGB"] = 0.0
        }

        // CPU Information
        map["cpuCores"] = Runtime.getRuntime().availableProcessors()
        map["cpuArchitecture"] = Build.SUPPORTED_ABIS.firstOrNull() ?: System.getProperty("os.arch") ?: "Unknown"
        map["cpuHardware"] = getCpuHardwareFromProc()

        // Build & Security Info
        map["buildId"] = Build.DISPLAY ?: Build.ID
        map["securityPatch"] = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) Build.VERSION.SECURITY_PATCH else "N/A"
        map["manufacturer"] = Build.MANUFACTURER
        map["brand"] = Build.BRAND
        map["model"] = Build.MODEL
        map["device"] = Build.DEVICE
        map["osVersion"] = "Android " + Build.VERSION.RELEASE

        return map
    }

    /**
     * Checks if the device is rooted by checking root binaries and test-keys build tags
     */
    private fun isDeviceRooted(): Boolean {
        // Check 1: Build tags
        val buildTags = Build.TAGS
        if (buildTags != null && buildTags.contains("test-keys")) {
            return true
        }

        // Check 2: Common su binary paths
        val paths = arrayOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su",
            "/su/bin/su"
        )
        for (p in paths) {
            try {
                if (File(p).exists()) return true
            } catch (ignored: Exception) {}
        }

        return false
    }

    /**
     * Reads display refresh rate (e.g. 60Hz, 90Hz, 120Hz)
     */
    private fun getDisplayRefreshRate(): Double {
        return try {
            val wm = getSystemService(Context.WINDOW_SERVICE) as? WindowManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                display?.refreshRate?.toDouble() ?: 60.0
            } else {
                @Suppress("DEPRECATION")
                wm?.defaultDisplay?.refreshRate?.toDouble() ?: 60.0
            }
        } catch (e: Exception) {
            60.0
        }
    }

    /**
     * Parse /proc/cpuinfo for Hardware name
     */
    private fun getCpuHardwareFromProc(): String {
        return try {
            val br = BufferedReader(FileReader("/proc/cpuinfo"))
            var line: String?
            var hardware = "Qualcomm / MediaTek / Exynos"
            while (br.readLine().also { line = it } != null) {
                if (line?.startsWith("Hardware") == true) {
                    val parts = line!!.split(":")
                    if (parts.size > 1) {
                        hardware = parts[1].trim()
                        break
                    }
                }
            }
            br.close()
            hardware
        } catch (e: Exception) {
            Build.HARDWARE ?: "ARM Processor"
        }
    }
}
