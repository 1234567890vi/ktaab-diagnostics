/// Data models representing all diagnostic readings across battery, hardware,
/// display, network, and real-time sensors.

class BatteryData {
  final double level; // 0 to 100%
  final String status; // Charging, Discharging, Full, etc.
  final String health; // Good, Overheat, Dead, Over Voltage, Cold, etc.
  final double temperatureC; // in Celsius
  final int voltageMV; // in millivolts
  final String technology; // Li-ion, Li-poly
  final String chargingType; // AC, USB, Wireless, Discharging
  final int? capacityMAh; // Design or current capacity
  final int? chargeCounter; // in microampere-hours
  final bool isCharging;

  BatteryData({
    required this.level,
    required this.status,
    required this.health,
    required this.temperatureC,
    required this.voltageMV,
    required this.technology,
    required this.chargingType,
    this.capacityMAh,
    this.chargeCounter,
    required this.isCharging,
  });

  Map<String, dynamic> toJson() => {
    'level': level,
    'status': status,
    'health': health,
    'temperatureC': temperatureC,
    'voltageMV': voltageMV,
    'technology': technology,
    'chargingType': chargingType,
    'capacityMAh': capacityMAh,
    'chargeCounter': chargeCounter,
    'isCharging': isCharging,
  };

  factory BatteryData.fromJson(Map<String, dynamic> json) {
    return BatteryData(
      level: (json['level'] as num?)?.toDouble() ?? 0.0,
      status: json['status']?.toString() ?? 'Unknown',
      health: json['health']?.toString() ?? 'Good',
      temperatureC: (json['temperatureC'] as num?)?.toDouble() ?? 0.0,
      voltageMV: (json['voltageMV'] as num?)?.toInt() ?? 0,
      technology: json['technology']?.toString() ?? 'Li-ion',
      chargingType: json['chargingType']?.toString() ?? 'Discharging',
      capacityMAh: (json['capacityMAh'] as num?)?.toInt(),
      chargeCounter: (json['chargeCounter'] as num?)?.toInt(),
      isCharging: json['isCharging'] as bool? ?? false,
    );
  }
}

class HardwareData {
  final String manufacturer;
  final String brand;
  final String model;
  final String device;
  final String buildId;
  final String osVersion;
  final String securityPatch;
  final bool isRooted;
  final int cpuCores;
  final String cpuArchitecture;
  final String cpuModel;
  final double totalRamMB;
  final double freeRamMB;
  final double usedRamMB;
  final bool isLowMemory;
  final double totalStorageGB;
  final double freeStorageGB;

  HardwareData({
    required this.manufacturer,
    required this.brand,
    required this.model,
    required this.device,
    required this.buildId,
    required this.osVersion,
    required this.securityPatch,
    required this.isRooted,
    required this.cpuCores,
    required this.cpuArchitecture,
    required this.cpuModel,
    required this.totalRamMB,
    required this.freeRamMB,
    required this.usedRamMB,
    required this.isLowMemory,
    required this.totalStorageGB,
    required this.freeStorageGB,
  });

  Map<String, dynamic> toJson() => {
    'manufacturer': manufacturer,
    'brand': brand,
    'model': model,
    'device': device,
    'buildId': buildId,
    'osVersion': osVersion,
    'securityPatch': securityPatch,
    'isRooted': isRooted,
    'cpuCores': cpuCores,
    'cpuArchitecture': cpuArchitecture,
    'cpuModel': cpuModel,
    'totalRamMB': totalRamMB,
    'freeRamMB': freeRamMB,
    'usedRamMB': usedRamMB,
    'isLowMemory': isLowMemory,
    'totalStorageGB': totalStorageGB,
    'freeStorageGB': freeStorageGB,
  };

  factory HardwareData.fromJson(Map<String, dynamic> json) {
    return HardwareData(
      manufacturer: json['manufacturer']?.toString() ?? 'Unknown',
      brand: json['brand']?.toString() ?? 'Unknown',
      model: json['model']?.toString() ?? 'Unknown',
      device: json['device']?.toString() ?? 'Unknown',
      buildId: json['buildId']?.toString() ?? '--',
      osVersion: json['osVersion']?.toString() ?? 'Unknown',
      securityPatch: json['securityPatch']?.toString() ?? '--',
      isRooted: json['isRooted'] as bool? ?? false,
      cpuCores: (json['cpuCores'] as num?)?.toInt() ?? 8,
      cpuArchitecture: json['cpuArchitecture']?.toString() ?? 'ARM',
      cpuModel: json['cpuModel']?.toString() ?? 'ARM Processor',
      totalRamMB: (json['totalRamMB'] as num?)?.toDouble() ?? 0.0,
      freeRamMB: (json['freeRamMB'] as num?)?.toDouble() ?? 0.0,
      usedRamMB: (json['usedRamMB'] as num?)?.toDouble() ?? 0.0,
      isLowMemory: json['isLowMemory'] as bool? ?? false,
      totalStorageGB: (json['totalStorageGB'] as num?)?.toDouble() ?? 0.0,
      freeStorageGB: (json['freeStorageGB'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class DisplayData {
  final double width;
  final double height;
  final double dpi;
  final double refreshRateHz;
  final String resolution;

  DisplayData({
    required this.width,
    required this.height,
    required this.dpi,
    required this.refreshRateHz,
    required this.resolution,
  });

  Map<String, dynamic> toJson() => {
    'width': width,
    'height': height,
    'dpi': dpi,
    'refreshRateHz': refreshRateHz,
    'resolution': resolution,
  };

  factory DisplayData.fromJson(Map<String, dynamic> json) {
    return DisplayData(
      width: (json['width'] as num?)?.toDouble() ?? 1080.0,
      height: (json['height'] as num?)?.toDouble() ?? 2400.0,
      dpi: (json['dpi'] as num?)?.toDouble() ?? 400.0,
      refreshRateHz: (json['refreshRateHz'] as num?)?.toDouble() ?? 60.0,
      resolution: json['resolution']?.toString() ?? '1080x2400',
    );
  }
}

class NetworkData {
  final String connectionType;
  final String localIp;
  final String wifiName;

  NetworkData({
    required this.connectionType,
    required this.localIp,
    required this.wifiName,
  });

  Map<String, dynamic> toJson() => {
    'connectionType': connectionType,
    'localIp': localIp,
    'wifiName': wifiName,
  };

  factory NetworkData.fromJson(Map<String, dynamic> json) {
    return NetworkData(
      connectionType: json['connectionType']?.toString() ?? 'WiFi',
      localIp: json['localIp']?.toString() ?? '127.0.0.1',
      wifiName: json['wifiName']?.toString() ?? 'Connected',
    );
  }
}

class Vector3D {
  final double x;
  final double y;
  final double z;

  Vector3D({required this.x, required this.y, required this.z});

  Map<String, dynamic> toJson() => {'x': x, 'y': y, 'z': z};

  factory Vector3D.fromJson(Map<String, dynamic> json) {
    return Vector3D(
      x: (json['x'] as num?)?.toDouble() ?? 0.0,
      y: (json['y'] as num?)?.toDouble() ?? 0.0,
      z: (json['z'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class SensorsData {
  final Vector3D? accelerometer;
  final Vector3D? gyroscope;

  SensorsData({this.accelerometer, this.gyroscope});

  Map<String, dynamic> toJson() => {
    'accelerometer': accelerometer?.toJson(),
    'gyroscope': gyroscope?.toJson(),
  };

  factory SensorsData.fromJson(Map<String, dynamic> json) {
    return SensorsData(
      accelerometer: json['accelerometer'] != null ? Vector3D.fromJson(json['accelerometer']) : null,
      gyroscope: json['gyroscope'] != null ? Vector3D.fromJson(json['gyroscope']) : null,
    );
  }
}

class DiagnosticReport {
  final String deviceId;
  final String timestamp;
  final BatteryData battery;
  final HardwareData hardware;
  final DisplayData display;
  final NetworkData network;
  final SensorsData sensors;

  DiagnosticReport({
    required this.deviceId,
    required this.timestamp,
    required this.battery,
    required this.hardware,
    required this.display,
    required this.network,
    required this.sensors,
  });

  Map<String, dynamic> toJson() => {
    'deviceId': deviceId,
    'timestamp': timestamp,
    'battery': battery.toJson(),
    'hardware': hardware.toJson(),
    'display': display.toJson(),
    'network': network.toJson(),
    'sensors': sensors.toJson(),
  };

  factory DiagnosticReport.fromJson(Map<String, dynamic> json) {
    return DiagnosticReport(
      deviceId: json['deviceId']?.toString() ?? 'unknown',
      timestamp: json['timestamp']?.toString() ?? DateTime.now().toIso8601String(),
      battery: BatteryData.fromJson(json['battery'] as Map<String, dynamic>? ?? {}),
      hardware: HardwareData.fromJson(json['hardware'] as Map<String, dynamic>? ?? {}),
      display: DisplayData.fromJson(json['display'] as Map<String, dynamic>? ?? {}),
      network: NetworkData.fromJson(json['network'] as Map<String, dynamic>? ?? {}),
      sensors: SensorsData.fromJson(json['sensors'] as Map<String, dynamic>? ?? {}),
    );
  }
}
