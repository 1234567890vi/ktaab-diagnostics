const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'ktaab_diagnostics.db');
const db = new DatabaseSync(dbPath);

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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_reports_device ON reports(device_id);
  CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
`);

/**
 * Insert a diagnostic report into the SQLite database.
 * Uses prepared statement for SQL injection prevention.
 */
function saveReport(report, clientIp) {
  const insertStmt = db.prepare(`
    INSERT INTO reports (
      device_id, timestamp, brand, model, os_version,
      battery_level, battery_status, battery_health, battery_temperature, battery_voltage,
      battery_tech, charging_type, total_ram_mb, free_ram_mb, total_storage_gb,
      free_storage_gb, cpu_cores, cpu_model, screen_res, refresh_rate,
      is_rooted, ip_address, network_type, raw_json
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  const battery = report.battery || {};
  const hardware = report.hardware || {};
  const network = report.network || {};
  const display = report.display || {};

  const deviceId = String(hardware.deviceId || report.deviceId || 'unknown-' + Date.now()).slice(0, 100);
  const timestamp = String(report.timestamp || new Date().toISOString());
  const brand = String(hardware.brand || hardware.manufacturer || 'Unknown').slice(0, 50);
  const model = String(hardware.model || hardware.device || 'Unknown').slice(0, 80);
  const osVersion = String(hardware.osVersion || hardware.systemVersion || 'Unknown').slice(0, 50);

  const batteryLevel = Number(battery.level ?? 0);
  const batteryStatus = String(battery.status || 'Unknown').slice(0, 50);
  const batteryHealth = String(battery.health || 'Good').slice(0, 50);
  const batteryTemp = Number(battery.temperatureC ?? 0);
  const batteryVoltage = Number(battery.voltageMV ?? 0);
  const batteryTech = String(battery.technology || 'Li-ion').slice(0, 30);
  const chargingType = String(battery.chargingType || 'Discharging').slice(0, 50);

  const totalRam = Number(hardware.totalRamMB ?? 0);
  const freeRam = Number(hardware.freeRamMB ?? 0);
  const totalStorage = Number(hardware.totalStorageGB ?? 0);
  const freeStorage = Number(hardware.freeStorageGB ?? 0);
  const cpuCores = parseInt(hardware.cpuCores ?? 0, 10);
  const cpuModel = String(hardware.cpuModel || hardware.cpuArchitecture || 'Unknown').slice(0, 80);

  const screenRes = String(display.resolution || `${display.width || 0}x${display.height || 0}`).slice(0, 40);
  const refreshRate = Number(display.refreshRateHz ?? 60);

  const isRooted = hardware.isRooted ? 1 : 0;
  const ip = String(network.localIp || clientIp || '127.0.0.1').slice(0, 45);
  const networkType = String(network.connectionType || 'Unknown').slice(0, 40);

  const rawJson = JSON.stringify(report);

  const info = insertStmt.run(
    deviceId, timestamp, brand, model, osVersion,
    batteryLevel, batteryStatus, batteryHealth, batteryTemp, batteryVoltage,
    batteryTech, chargingType, totalRam, freeRam, totalStorage,
    freeStorage, cpuCores, cpuModel, screenRes, refreshRate,
    isRooted, ip, networkType, rawJson
  );

  return {
    id: Number(info.lastInsertRowid),
    deviceId,
    brand,
    model,
    batteryLevel,
    batteryHealth,
    batteryTemp,
    isRooted,
    created_at: new Date().toISOString()
  };
}

/**
 * Retrieve recent reports with pagination.
 */
function getReports(limit = 100, offset = 0) {
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 50), 200);
  const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

  const selectStmt = db.prepare(`
    SELECT 
      id, device_id, timestamp, brand, model, os_version,
      battery_level, battery_status, battery_health, battery_temperature, battery_voltage,
      battery_tech, charging_type, total_ram_mb, free_ram_mb, total_storage_gb,
      free_storage_gb, cpu_cores, cpu_model, screen_res, refresh_rate,
      is_rooted, ip_address, network_type, created_at
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
