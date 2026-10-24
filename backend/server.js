const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { saveReport, getReports, getReportById, deleteReport, getStats } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Enable trust proxy for accurate real IP resolution behind reverse tunnels/proxies
app.set('trust proxy', true);

// Global in-memory reports array ensuring zero latency and 100% sync
const reports = [];

// Pre-load recent reports from SQLite if available
try {
  const existing = getReports(100, 0);
  if (Array.isArray(existing) && existing.length > 0) {
    reports.push(...existing);
    console.log(`📦 Loaded ${reports.length} existing reports into memory.`);
  }
} catch (e) {
  console.warn('Note: SQLite pre-load skipped (using active in-memory store):', e.message);
}

// Store connected SSE clients for real-time live dashboard updates
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
// Security & Middleware Configuration (per mandatory-secure-web-skills)
// -------------------------------------------------------------

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://ipwho.is https://api.ipify.org https://ipapi.co *"
  );
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// JSON parser with safe payload limit
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// CORS configuration (allow all origins, web views, mobile browsers)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Generous rate limiter to prevent DoS while never blocking mobile reporting
const requestCounts = new Map();
function rateLimiter(limit = 600, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const clientData = requestCounts.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + windowMs;
    } else {
      clientData.count++;
    }
    requestCounts.set(ip, clientData);

    if (clientData.count > limit) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.'
      });
    }
    next();
  };
}

// -------------------------------------------------------------
// App Links & Deep Linking Metadata
// -------------------------------------------------------------

// Android Digital Asset Links (for App Links verification)
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.ktaab.diagnostics",
        sha256_cert_fingerprints: [
          "14:6D:E9:7C:0F:CD:CF:4E:9A:9E:C1:27:AE:E1:92:07:3E:C2:59:7A:B1:D3:58:65:F4:75:5D:89:12:F3:A8:86"
        ]
      }
    }
  ]);
});

// iOS Universal Links (apple-app-site-association)
app.get('/.well-known/apple-app-site-association', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    applinks: {
      apps: [],
      details: [
        {
          appID: "TEAMID.com.ktaab.diagnostics",
          paths: ["/inspect", "/inspect/*"]
        }
      ]
    }
  });
});

// Deep link redirect endpoint
app.get('/inspect', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>جاري الفحص المباشر...</title>
      <style>
        body { background: #0B0F19; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
        .box { background: #111827; padding: 32px; border-radius: 16px; border: 1px solid #1F2937; max-width: 420px; }
        .spinner { width: 48px; height: 48px; border: 4px solid #1F2937; border-top-color: #06B6D4; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        a { color: #06B6D4; text-decoration: none; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="box">
        <div class="spinner"></div>
        <h2>جاري تشغيل فحص الهاتف...</h2>
        <p style="margin-top: 14px; font-size: 14px; color: #9CA3AF;">إذا لم يفتح التطبيق تلقائياً، يمكنك النقر على الزر:</p>
        <p><a href="ktaab://inspect">فتح تطبيق الفحص مباشرة</a></p>
        <p><a href="/" style="font-size: 13px; color: #9CA3AF;">العودة للصفحة الرئيسية</a></p>
      </div>
      <script>
        setTimeout(() => { window.location.href = 'ktaab://inspect'; }, 200);
        setTimeout(() => { window.location.href = '/'; }, 3500);
      </script>
    </body>
    </html>
  `);
});

// -------------------------------------------------------------
// Admin Security & Stealth Routes
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
// API Endpoints
// -------------------------------------------------------------

/**
 * POST /api/report
 * Receives reports from mobile devices and web browser diagnostics
 */
app.post('/api/report', rateLimiter(600), (req, res) => {
  try {
    const reportData = req.body;

    if (!reportData || typeof reportData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON payload. Object expected.'
      });
    }

    // Server-side real IP extraction prioritizing client-verified IP, then proxies
    const serverDetectedIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                             req.headers['x-real-ip'] || 
                             req.ip || 
                             req.socket.remoteAddress || 
                             '127.0.0.1';

    const realIp = String(reportData.realIp || reportData.network?.realIp || (serverDetectedIp !== '127.0.0.1' ? serverDetectedIp : '127.0.0.1')).slice(0, 45);
    const country = String(reportData.country || reportData.network?.country || '').slice(0, 60);
    const city = String(reportData.city || reportData.network?.city || '').slice(0, 60);
    const isp = String(reportData.isp || reportData.network?.isp || '').slice(0, 80);
    const gpu = String(reportData.gpu || reportData.hardware?.gpu || '').slice(0, 100);

    // Save to SQLite database
    let dbSaved = null;
    try {
      dbSaved = saveReport({ ...reportData, realIp, country, city, isp, gpu }, realIp);
    } catch (dbErr) {
      console.warn('SQLite storage fallback active:', dbErr.message);
    }

    // Normalized in-memory report item
    const hw = reportData.hardware || {};
    const bat = reportData.battery || {};
    const disp = reportData.display || {};
    const net = reportData.network || {};

    const deviceId = String(reportData.deviceId || hw.deviceId || 'DEV-' + Date.now()).slice(0, 100);
    const brand = String(reportData.brand || hw.brand || hw.manufacturer || 'الهاتف').slice(0, 50);
    const model = String(reportData.model || hw.model || hw.device || 'هاتف ذكي').slice(0, 80);
    const osVersion = String(reportData.osVersion || hw.osVersion || 'Mobile OS').slice(0, 50);

    const memoryItem = {
      id: dbSaved?.id || (reports.length > 0 ? (reports[0].id + 1) : 1),
      device_id: deviceId,
      timestamp: reportData.timestamp || new Date().toISOString(),
      brand: brand,
      model: model,
      os_version: osVersion,
      battery_level: Number(bat.level ?? reportData.battery_level ?? 0),
      battery_status: String(bat.status || reportData.battery_status || 'فحص أولي'),
      battery_health: String(bat.health || reportData.battery_health || 'Good'),
      battery_temperature: Number(bat.temperatureC ?? reportData.battery_temperature ?? 30.0),
      battery_voltage: Number(bat.voltageMV ?? reportData.battery_voltage ?? 3850),
      battery_tech: String(bat.technology || reportData.battery_tech || 'Li-ion'),
      charging_type: String(bat.chargingType || reportData.charging_type || 'تفريغ الشحن'),
      total_ram_mb: Number(hw.totalRamMB ?? reportData.total_ram_mb ?? 4096),
      free_ram_mb: Number(hw.freeRamMB ?? reportData.free_ram_mb ?? 2048),
      total_storage_gb: Number(hw.totalStorageGB ?? reportData.total_storage_gb ?? 64),
      free_storage_gb: Number(hw.freeStorageGB ?? reportData.free_storage_gb ?? 32),
      cpu_cores: parseInt(hw.cpuCores ?? reportData.cpu_cores ?? 4, 10),
      cpu_model: String(hw.cpuModel || reportData.cpu_model || hw.cpuArchitecture || 'ARM'),
      screen_res: String(disp.resolution || reportData.screen_res || (reportData.screen?.resolution) || '1080x1920'),
      refresh_rate: Number(disp.refreshRateHz ?? reportData.refresh_rate ?? 60),
      is_rooted: (hw.isRooted || reportData.is_rooted) ? 1 : 0,
      ip_address: realIp,
      country: country,
      city: city,
      isp: isp,
      gpu: gpu,
      network_type: String(net.connectionType || reportData.network_type || 'Mobile Web'),
      stage: reportData.stage || 'مكتمل',
      created_at: new Date().toISOString(),
      details: { ...reportData, realIp, country, city, isp, gpu }
    };

    // Update existing device entry or unshift to beginning of reports array
    const existingIndex = reports.findIndex(r => r.device_id === deviceId);
    if (existingIndex !== -1) {
      memoryItem.id = reports[existingIndex].id;
      reports[existingIndex] = { ...reports[existingIndex], ...memoryItem };
    } else {
      reports.unshift(memoryItem);
    }

    if (reports.length > 250) reports.pop();

    console.log(`📥 [REPORT RECEIVED] Device: ${brand} ${model} | Real IP: ${realIp} (${country}) | OS: ${osVersion}`);

    // Broadcast the new/updated report to open secret dashboard streams
    broadcastEvent('new_report', memoryItem);

    return res.status(201).json({
      success: true,
      message: 'Report received and synchronized successfully',
      data: memoryItem
    });
  } catch (error) {
    console.error('Error handling report:', error);
    return res.status(200).json({
      success: true,
      message: 'Report accepted with fallback',
      error: error.message
    });
  }
});

/**
 * GET /api/reports
 * Returns list of recent reports with no-cache headers
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
 * GET /api/reports/:id
 * Returns single full report details
 */
app.get('/api/reports/:id', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const targetId = parseInt(req.params.id, 10);

  const memoryFound = reports.find(r => r.id === targetId);
  if (memoryFound) {
    return res.json({
      success: true,
      data: memoryFound
    });
  }

  try {
    const report = getReportById(req.params.id);
    if (report) {
      return res.json({
        success: true,
        data: report
      });
    }
  } catch (_) {}

  return res.status(404).json({
    success: false,
    error: 'Report not found'
  });
});

/**
 * DELETE /api/reports/:id
 * Delete a report from admin dashboard
 */
app.delete('/api/reports/:id', (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  const idx = reports.findIndex(r => r.id === targetId);
  if (idx !== -1) {
    reports.splice(idx, 1);
  }

  try {
    deleteReport(req.params.id);
  } catch (_) {}

  broadcastEvent('report_deleted', { id: targetId });

  return res.json({
    success: true,
    message: 'Report deleted successfully'
  });
});

/**
 * GET /api/stats
 * Summary statistics for dashboard cards
 */
app.get('/api/stats', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const totalDevices = reports.length;
  let sumBattery = 0;
  let sumTemp = 0;
  let rootedCount = 0;
  let degradedBatteries = 0;
  const brandMap = {};

  for (const r of reports) {
    sumBattery += Number(r.battery_level) || 0;
    sumTemp += Number(r.battery_temperature) || 30;
    if (r.is_rooted === 1) rootedCount++;
    if (r.battery_health && r.battery_health !== 'Good' && r.battery_health !== 'قيد الفحص') {
      degradedBatteries++;
    }
    const b = r.brand || 'الهاتف';
    brandMap[b] = (brandMap[b] || 0) + 1;
  }

  const topBrands = Object.entries(brandMap)
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return res.json({
    success: true,
    data: {
      totalDevices,
      avgBatteryLevel: totalDevices ? Math.round((sumBattery / totalDevices) * 10) / 10 : 0,
      avgBatteryTemp: totalDevices ? Math.round((sumTemp / totalDevices) * 10) / 10 : 0,
      rootedCount,
      degradedBatteries,
      topBrands
    }
  });
});

/**
 * GET /api/events
 * Real-time Server-Sent Events (SSE) stream for admin dashboard
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

// -------------------------------------------------------------
// Static UI Routes & Pages
// -------------------------------------------------------------

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint or resource not found'
  });
});

// Start listening
const server = app.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Ktaab Diagnostics Backend Server running!`);
  console.log(`📡 URL: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`🔒 Secret Owner Panel: http://localhost:${PORT}/my-secret-panel-99`);
  console.log(`📱 Deep Linking Endpoint: http://localhost:${PORT}/inspect`);
  console.log(`=======================================================`);
});

module.exports = { app, server, reports };
