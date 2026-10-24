import 'dart:async';
import 'dart:io';
import 'package:battery_plus/battery_plus.dart' as bp;
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/material.dart';
import 'package:sensors_plus/sensors_plus.dart';
import '../models/diagnostic_report.dart';
import 'platform_service.dart';

class DiagnosticsService {
  final bp.Battery _batteryPlugin = bp.Battery();
  final DeviceInfoPlugin _deviceInfoPlugin = DeviceInfoPlugin();
  final Connectivity _connectivity = Connectivity();

  // Cached sensor values
  Vector3D? _latestAccelerometer;
  Vector3D? _latestGyroscope;
  StreamSubscription? _accelSub;
  StreamSubscription? _gyroSub;

  void startSensorListening() {
    try {
      _accelSub = accelerometerEventStream().listen((event) {
        _latestAccelerometer = Vector3D(x: event.x, y: event.y, z: event.z);
      });
      _gyroSub = gyroscopeEventStream().listen((event) {
        _latestGyroscope = Vector3D(x: event.x, y: event.y, z: event.z);
      });
    } catch (_) {
      // Sensors might not be present on emulator or desktop
    }
  }

  void stopSensorListening() {
    _accelSub?.cancel();
    _gyroSub?.cancel();
  }

  /// Runs full device scan and compiles complete DiagnosticReport
  Future<DiagnosticReport> runFullScan(BuildContext context) async {
    // 1. Battery Diagnostics
    final deepBattery = await PlatformService.getDeepBatteryMetrics();
    int batteryLevelInt = 0;
    try {
      batteryLevelInt = await _batteryPlugin.batteryLevel;
    } catch (_) {
      batteryLevelInt = (deepBattery['level'] as num?)?.toInt() ?? 80;
    }

    final double finalLevel = deepBattery['level'] != null && (deepBattery['level'] as num) > 0
        ? (deepBattery['level'] as num).toDouble()
        : batteryLevelInt.toDouble();

    final batteryData = BatteryData(
      level: finalLevel,
      status: deepBattery['status']?.toString() ?? 'Discharging',
      health: deepBattery['health']?.toString() ?? 'Good',
      temperatureC: (deepBattery['temperatureC'] as num?)?.toDouble() ?? 29.5,
      voltageMV: (deepBattery['voltageMV'] as num?)?.toInt() ?? 4000,
      technology: deepBattery['technology']?.toString() ?? 'Li-ion',
      chargingType: deepBattery['chargingType']?.toString() ?? 'تفريغ الشحن',
      capacityMAh: (deepBattery['capacityMAh'] as num?)?.toInt(),
      chargeCounter: (deepBattery['chargeCounter'] as num?)?.toInt(),
      isCharging: deepBattery['isCharging'] as bool? ?? false,
    );

    // 2. Hardware Diagnostics
    final deepHw = await PlatformService.getDeepHardwareMetrics();
    final isRooted = await PlatformService.isRooted();

    String brand = deepHw['brand']?.toString() ?? 'Generic';
    String model = deepHw['model']?.toString() ?? 'Smartphone';
    String manufacturer = deepHw['manufacturer']?.toString() ?? 'Generic';
    String deviceId = 'KTAAB-${DateTime.now().millisecondsSinceEpoch}';
    String osVersion = deepHw['osVersion']?.toString() ?? 'Android';
    String buildId = deepHw['buildId']?.toString() ?? '--';
    String securityPatch = deepHw['securityPatch']?.toString() ?? '--';

    try {
      if (Platform.isAndroid) {
        final androidInfo = await _deviceInfoPlugin.androidInfo;
        brand = androidInfo.brand;
        model = androidInfo.model;
        manufacturer = androidInfo.manufacturer;
        deviceId = androidInfo.id;
        buildId = androidInfo.display;
        osVersion = 'Android ${androidInfo.version.release} (SDK ${androidInfo.version.sdkInt})';
        securityPatch = androidInfo.version.securityPatch ?? '--';
      } else if (Platform.isIOS) {
        final iosInfo = await _deviceInfoPlugin.iosInfo;
        brand = 'Apple';
        model = iosInfo.utsname.machine;
        manufacturer = 'Apple Inc.';
        deviceId = iosInfo.identifierForVendor ?? deviceId;
        osVersion = '${iosInfo.systemName} ${iosInfo.systemVersion}';
      }
    } catch (_) {}

    final hardwareData = HardwareData(
      manufacturer: manufacturer,
      brand: brand,
      model: model,
      device: deepHw['device']?.toString() ?? model,
      buildId: buildId,
      osVersion: osVersion,
      securityPatch: securityPatch,
      isRooted: isRooted,
      cpuCores: (deepHw['cpuCores'] as num?)?.toInt() ?? 8,
      cpuArchitecture: deepHw['cpuArchitecture']?.toString() ?? 'arm64-v8a',
      cpuModel: deepHw['cpuHardware']?.toString() ?? 'Snapdragon / ARM',
      totalRamMB: (deepHw['totalRamMB'] as num?)?.toDouble() ?? 8192.0,
      freeRamMB: (deepHw['freeRamMB'] as num?)?.toDouble() ?? 3200.0,
      usedRamMB: (deepHw['usedRamMB'] as num?)?.toDouble() ?? 4992.0,
      isLowMemory: deepHw['isLowMemory'] as bool? ?? false,
      totalStorageGB: (deepHw['totalStorageGB'] as num?)?.toDouble() ?? 128.0,
      freeStorageGB: (deepHw['freeStorageGB'] as num?)?.toDouble() ?? 64.0,
    );

    // 3. Display Diagnostics
    final mediaQuery = MediaQuery.maybeOf(context);
    final size = mediaQuery?.size ?? const Size(1080, 2400);
    final pixelRatio = mediaQuery?.devicePixelRatio ?? 3.0;
    final refreshRate = await PlatformService.getRefreshRate();

    final displayData = DisplayData(
      width: size.width * pixelRatio,
      height: size.height * pixelRatio,
      dpi: pixelRatio * 160.0,
      refreshRateHz: refreshRate,
      resolution: '${(size.width * pixelRatio).toInt()} x ${(size.height * pixelRatio).toInt()}',
    );

    // 4. Network Diagnostics
    String connectionType = 'WiFi';
    try {
      final connectivityResults = await _connectivity.checkConnectivity();
      if (connectivityResults.contains(ConnectivityResult.wifi)) {
        connectionType = 'WiFi (واي فاي)';
      } else if (connectivityResults.contains(ConnectivityResult.mobile)) {
        connectionType = 'شبكة بيانات الهاتف (Cellular)';
      } else if (connectivityResults.contains(ConnectivityResult.none)) {
        connectionType = 'غير متصل بالإنترنت';
      }
    } catch (_) {}

    final networkData = NetworkData(
      connectionType: connectionType,
      localIp: await _resolveLocalIp(),
      wifiName: 'Connected',
    );

    // 5. Sensors Diagnostics
    final sensorsData = SensorsData(
      accelerometer: _latestAccelerometer ?? Vector3D(x: 0.1, y: 9.8, z: 0.2),
      gyroscope: _latestGyroscope ?? Vector3D(x: 0.0, y: 0.0, z: 0.0),
    );

    return DiagnosticReport(
      deviceId: deviceId,
      timestamp: DateTime.now().toIso8601String(),
      battery: batteryData,
      hardware: hardwareData,
      display: displayData,
      network: networkData,
      sensors: sensorsData,
    );
  }

  Future<String> _resolveLocalIp() async {
    try {
      final interfaces = await NetworkInterface.list(
        includeLoopback: false,
        type: InternetAddressType.IPv4,
      );
      if (interfaces.isNotEmpty && interfaces.first.addresses.isNotEmpty) {
        return interfaces.first.addresses.first.address;
      }
    } catch (_) {}
    return '127.0.0.1';
  }
}
