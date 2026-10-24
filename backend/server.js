const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { saveReport, getReports, getReportById, deleteReport, getStats } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

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
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'"
  );
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// JSON parser with safe payload limit to prevent buffer / DoS attacks
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '500kb' }));

// CORS configuration (allow requests from Flutter app, local network and origins)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic in-memory rate limiter for reports
const requestCounts = new Map();
function rateLimiter(limit = 60, windowMs = 60000) {
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
          // Replace with real release / debug keystore SHA-256 fingerprint when deploying
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
  // Renders a fast redirect page that tries to launch custom URI scheme, or falls back to landing page
  res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>جاري فتح فحص كتاب...</title>
      <style>
        body { background: #0B0F19; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
        .box { background: #111827; padding: 32px; border-radius: 16px; border: 1px solid #1F2937; max-width: 400px; }
        .spinner { width: 48px; height: 48px; border: 4px solid #1F2937; border-top-color: #06B6D4; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        a { color: #06B6D4; text-decoration: none; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="box">
        <div class="spinner"></div>
        <h2>جاري فتح تطبيق كتاب...</h2>
        <p>إذا لم يفتح التطبيق تلقائياً، يمكنك الضغط على الزر أدناه:</p>
        <p><a href="ktaab://inspect">فتح التطبيق مباشرة</a></p>
        <p><a href="/" style="font-size: 14px; color: #9CA3AF;">أو تحميل التطبيق من الصفحة الرئيسية</a></p>
      </div>
      <script>
        // Attempt deep link scheme launch immediately
        window.location.href = 'ktaab://inspect';
        setTimeout(() => {
          // If still on this page after 2.5s, direct to landing page
          window.location.href = '/';
        }, 3000);
      </script>
    </body>
    </html>
  `);
});

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

/**
 * POST /api/report
 * Receives complete diagnostic report from Flutter mobile app
 */
app.post('/api/report', rateLimiter(120), (req, res) => {
  try {
    const reportData = req.body;

    if (!reportData || typeof reportData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON payload. Object expected.'
      });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const saved = saveReport(reportData, clientIp);

    // Broadcast the new report to all open admin dashboard SSE streams
    broadcastEvent('new_report', saved);

    return res.status(201).json({
      success: true,
      message: 'Report saved successfully',
      data: saved
    });
  } catch (error) {
    console.error('Error saving diagnostic report:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while storing report'
    });
  }
});

/**
 * GET /api/reports
 * Returns list of recent reports for admin dashboard
 */
app.get('/api/reports', (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const reports = getReports(limit, offset);
    return res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve reports'
    });
  }
});

/**
 * GET /api/reports/:id
 * Returns single full report details
 */
app.get('/api/reports/:id', (req, res) => {
  try {
    const report = getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }
    return res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error fetching report details:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve report details'
    });
  }
});

/**
 * DELETE /api/reports/:id
 * Delete a report from admin dashboard
 */
app.delete('/api/reports/:id', (req, res) => {
  try {
    const deleted = deleteReport(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Report not found or already deleted'
      });
    }

    broadcastEvent('report_deleted', { id: Number(req.params.id) });

    return res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete report'
    });
  }
});

/**
 * GET /api/stats
 * Summary statistics for the dashboard cards
 */
app.get('/api/stats', (req, res) => {
  try {
    const stats = getStats();
    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error computing stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to compute stats'
    });
  }
});

/**
 * GET /api/events
 * Real-time Server-Sent Events (SSE) stream for admin dashboard
 */
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);

  // Initial ping
  res.write(`event: connected\ndata: ${JSON.stringify({ time: Date.now() })}\n\n`);

  // Keep-alive heartbeat every 20 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 20000);

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

// Explicit page routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

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
  console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
  console.log(`📱 Deep Linking Endpoint: http://localhost:${PORT}/inspect`);
  console.log(`=======================================================`);
});

module.exports = { app, server };
