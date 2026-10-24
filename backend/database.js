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

  // Initialize flat reports table with strict schema contract
  db.exec(`
    CREATE TABLE IF NOT EXISTS flat_reports (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      ip TEXT,
      isp TEXT,
      deviceModel TEXT,
      androidVersion TEXT,
      os TEXT,
      batteryLevel TEXT,
      batteryCharging TEXT,
      cpuCores TEXT,
      ram TEXT,
      gpu TEXT,
      screen TEXT,
      userAgent TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
} catch (err) {
  console.warn('⚠️ SQLite in-memory fallback active:', err.message);
}

/**
 * Save or update a flat report into SQLite
 */
function saveFlatReport(report) {
  if (!db) return;

  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO flat_reports (
        id, timestamp, ip, isp, deviceModel, androidVersion, os,
        batteryLevel, batteryCharging, cpuCores, ram, gpu, screen, userAgent, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, datetime('now')
      )
    `);

    stmt.run(
      String(report.id || 'dev-' + Date.now()),
      String(report.timestamp || new Date().toISOString()),
      String(report.ip || '127.0.0.1'),
      String(report.isp || ''),
      String(report.deviceModel || 'هاتف غير محدد'),
      String(report.androidVersion || ''),
      String(report.os || 'Android'),
      String(report.batteryLevel || '0%'),
      String(report.batteryCharging || 'غير متصل'),
      String(report.cpuCores || '8'),
      String(report.ram || '4 GB'),
      String(report.gpu || 'معالج رسومي'),
      String(report.screen || '1080x2400'),
      String(report.userAgent || '')
    );
  } catch (e) {
    console.warn('SQLite flat report insert warning:', e.message);
  }
}

/**
 * Get all flat reports sorted by most recent
 */
function getAllFlatReports() {
  if (!db) return [];
  try {
    const stmt = db.prepare(`SELECT * FROM flat_reports ORDER BY updated_at DESC LIMIT 150`);
    return stmt.all();
  } catch (e) {
    return [];
  }
}

/**
 * Delete a report by id
 */
function deleteFlatReport(id) {
  if (!db) return false;
  try {
    const stmt = db.prepare(`DELETE FROM flat_reports WHERE id = ?`);
    const res = stmt.run(id);
    return res.changes > 0;
  } catch (e) {
    return false;
  }
}

module.exports = {
  db,
  saveFlatReport,
  getAllFlatReports,
  deleteFlatReport
};
