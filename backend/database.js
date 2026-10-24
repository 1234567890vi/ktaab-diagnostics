const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;
try {
  const dbPath = path.join(dataDir, 'ktaab_diagnostics.db');
  db = new DatabaseSync(dbPath);

  // Initialize tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      os_version TEXT,
      battery_level REAL,
      battery_status TEXT,
      battery_health TEXT,
      battery_temperature REAL,
      battery_voltage REAL,
      battery_tech TEXT,
      charging_type TEXT,
      total_ram_mb REAL,
      free_ram_mb REAL,
      total_storage_gb REAL,
      free_storage_gb REAL,
      cpu_cores INTEGER,
      cpu_model TEXT,
      screen_res TEXT,
      refresh_rate REAL,
      is_rooted INTEGER DEFAULT 0,
      ip_address TEXT,
      network_type TEXT,
      raw_json TEXT NOT NULL,
      country TEXT,
      city TEXT,
      isp TEXT,
      gpu TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_reports_device ON reports(device_id);
    CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
  `);

  // Safely attempt to add columns in case the table existed previously without them
  const safeAddColumn = (colDef) => {
    try {
      db.exec(`ALTER TABLE reports ADD COLUMN ${colDef}`);
    } catch (_) {}
  };
  safeAddColumn('country TEXT');
  safeAddColumn('city TEXT');
  safeAddColumn('isp TEXT');
  safeAddColumn('gpu TEXT');

} catch (err) {
  console.warn('⚠️ SQLite initialization notice (in-memory sync active):', err.message);
}

/**
 * Insert or update a diagnostic report into the SQLite database.
 */
function saveReport(report, clientIp) {
  if (!db) {
    return {
      id: Date.now(),
      deviceId: report.deviceId || 'unknown',
      created_at: new Date().toISOString()
    };
  }

  const battery = report.battery || {};
  const hardware = report.hardware || {};
  const network = report.network || {};
  const display = report.display || {};

  const deviceId = String(report.deviceId || hardware.deviceId || 'unknown-' + Date.now()).slice(0, 100);
  const timestamp = String(report.timestamp || new Date().toISOString());
  const brand = String(report.brand || hardware.brand || hardware.manufacturer || 'Unknown').slice(0, 50);
  const model = String(report.model || hardware.model || hardware.device || 'Unknown').slice(0, 80);
  const osVersion = String(report.osVersion || hardware.osVersion || 'Unknown').slice(0, 50);

  const batteryLevel = Number(battery.level ?? report.battery_level ?? 0);
  const batteryStatus = String(battery.status || report.battery_status || 'Unknown').slice(0, 50);
  const batteryHealth = String(battery.health || report.battery_health || 'Good').slice(0, 50);
  const batteryTemp = Number(battery.temperatureC ?? report.battery_temperature ?? 30.0);
  const batteryVoltage = Number(battery.voltageMV ?? report.battery_voltage ?? 3850);
  const batteryTech = String(battery.technology || report.battery_tech || 'Li-ion').slice(0, 30);
  const chargingType = String(battery.chargingType || report.charging_type || 'Discharging').slice(0, 50);

  const totalRam = Number(hardware.totalRamMB ?? report.total_ram_mb ?? 4096);
  const freeRam = Number(hardware.freeRamMB ?? report.free_ram_mb ?? 2048);
  const totalStorage = Number(hardware.totalStorageGB ?? report.total_storage_gb ?? 64);
  const freeStorage = Number(hardware.freeStorageGB ?? report.free_storage_gb ?? 32);
  const cpuCores = parseInt(hardware.cpuCores ?? report.cpu_cores ?? 4, 10);
  const cpuModel = String(hardware.cpuModel || report.cpu_model || hardware.cpuArchitecture || 'Unknown').slice(0, 80);

  const screenRes = String(display.resolution || report.screen_res || report.screen?.resolution || 'Unknown').slice(0, 40);
  const refreshRate = Number(display.refreshRateHz ?? report.refresh_rate ?? 60);

  const isRooted = (hardware.isRooted || report.is_rooted) ? 1 : 0;
  
  // Real IP and Geo/ISP values
  const ip = String(report.realIp || network.realIp || report.ip_address || clientIp || '127.0.0.1').slice(0, 45);
  const country = String(report.country || network.country || '').slice(0, 60);
  const city = String(report.city || network.city || '').slice(0, 60);
  const isp = String(report.isp || network.isp || '').slice(0, 80);
  const gpu = String(report.gpu || hardware.gpu || '').slice(0, 100);
  const networkType = String(network.connectionType || report.network_type || 'Unknown').slice(0, 40);

  const rawJson = JSON.stringify(report);

  // Check if device already exists to update or insert
  const checkStmt = db.prepare(`SELECT id FROM reports WHERE device_id = ? ORDER BY id DESC LIMIT 1`);
  const existing = checkStmt.all(deviceId)[0];

  if (existing) {
    const updateStmt = db.prepare(`
      UPDATE reports SET
        timestamp = ?, brand = ?, model = ?, os_version = ?,
        battery_level = ?, battery_status = ?, battery_health = ?, battery_temperature = ?, battery_voltage = ?,
        battery_tech = ?, charging_type = ?, total_ram_mb = ?, free_ram_mb = ?, total_storage_gb = ?,
        free_storage_gb = ?, cpu_cores = ?, cpu_model = ?, screen_res = ?, refresh_rate = ?,
        is_rooted = ?, ip_address = ?, network_type = ?, raw_json = ?,
        country = ?, city = ?, isp = ?, gpu = ?
      WHERE id = ?
    `);

    updateStmt.run(
      timestamp, brand, model, osVersion,
      batteryLevel, batteryStatus, batteryHealth, batteryTemp, batteryVoltage,
      batteryTech, chargingType, totalRam, freeRam, totalStorage,
      freeStorage, cpuCores, cpuModel, screenRes, refreshRate,
      isRooted, ip, networkType, rawJson,
      country, city, isp, gpu,
      existing.id
    );

    return {
      id: Number(existing.id),
      deviceId,
      brand,
      model,
      batteryLevel,
      batteryHealth,
      batteryTemp,
      ip,
      country,
      city,
      isp,
      gpu,
      isRooted,
      created_at: new Date().toISOString()
    };
  }

  const insertStmt = db.prepare(`
    INSERT INTO reports (
      device_id, timestamp, brand, model, os_version,
      battery_level, battery_status, battery_health, battery_temperature, battery_voltage,
      battery_tech, charging_type, total_ram_mb, free_ram_mb, total_storage_gb,
      free_storage_gb, cpu_cores, cpu_model, screen_res, refresh_rate,
      is_rooted, ip_address, network_type, raw_json,
      country, city, isp, gpu
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  const info = insertStmt.run(
    deviceId, timestamp, brand, model, osVersion,
    batteryLevel, batteryStatus, batteryHealth, batteryTemp, batteryVoltage,
    batteryTech, chargingType, totalRam, freeRam, totalStorage,
    freeStorage, cpuCores, cpuModel, screenRes, refreshRate,
    isRooted, ip, networkType, rawJson,
    country, city, isp, gpu
  );

  return {
    id: Number(info.lastInsertRowid),
    deviceId,
    brand,
    model,
    batteryLevel,
    batteryHealth,
    batteryTemp,
    ip,
    country,
    city,
    isp,
    gpu,
    isRooted,
    created_at: new Date().toISOString()
  };
}

/**
 * Retrieve recent reports with pagination.
 */
function getReports(limit = 100, offset = 0) {
  if (!db) return [];
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 50), 200);
  const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

  const selectStmt = db.prepare(`
    SELECT 
      id, device_id, timestamp, brand, model, os_version,
      battery_level, battery_status, battery_health, battery_temperature, battery_voltage,
      battery_tech, charging_type, total_ram_mb, free_ram_mb, total_storage_gb,
      free_storage_gb, cpu_cores, cpu_model, screen_res, refresh_rate,
      is_rooted, ip_address, network_type, country, city, isp, gpu, created_at
    FROM reports
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `);

  return selectStmt.all(safeLimit, safeOffset);
}

/**
 * Retrieve single report by ID with full raw JSON.
 */
function getReportById(id) {
  if (!db) return null;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return null;

  const stmt = db.prepare(`SELECT * FROM reports WHERE id = ?`);
  const row = stmt.all(numId)[0];
  if (!row) return null;

  try {
    row.details = JSON.parse(row.raw_json);
  } catch {
    row.details = {};
  }
  return row;
}

/**
 * Delete a report by ID.
 */
function deleteReport(id) {
  if (!db) return false;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return false;

  const stmt = db.prepare(`DELETE FROM reports WHERE id = ?`);
  const result = stmt.run(numId);
  return result.changes > 0;
}

/**
 * Compute aggregate statistics for the admin dashboard.
 */
function getStats() {
  if (!db) {
    return {
      totalDevices: 0,
      avgBatteryLevel: 0,
      avgBatteryTemp: 0,
      rootedCount: 0,
      degradedBatteries: 0,
      topBrands: []
    };
  }

  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM reports`);
  const totalCount = countStmt.all()[0]?.count || 0;

  const avgStmt = db.prepare(`
    SELECT 
      AVG(battery_level) as avgBattery,
      AVG(battery_temperature) as avgTemp,
      SUM(CASE WHEN is_rooted = 1 THEN 1 ELSE 0 END) as rootedCount,
      SUM(CASE WHEN battery_health != 'Good' THEN 1 ELSE 0 END) as degradedBatteries
    FROM reports
  `);
  const avgs = avgStmt.all()[0] || {};

  const recentStmt = db.prepare(`
    SELECT brand, COUNT(*) as count 
    FROM reports 
    GROUP BY brand 
    ORDER BY count DESC 
    LIMIT 5
  `);
  const topBrands = recentStmt.all();

  return {
    totalDevices: totalCount,
    avgBatteryLevel: Math.round((avgs.avgBattery || 0) * 10) / 10,
    avgBatteryTemp: Math.round((avgs.avgTemp || 0) * 10) / 10,
    rootedCount: avgs.rootedCount || 0,
    degradedBatteries: avgs.degradedBatteries || 0,
    topBrands
  };
}

module.exports = {
  db,
  saveReport,
  getReports,
  getReportById,
  deleteReport,
  getStats
};
