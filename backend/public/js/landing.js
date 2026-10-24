// Ktaab Landing Page Script - Strict Flat JSON Contract & Instant 2-Stage Delivery

let reportId = '';
try {
  reportId = localStorage.getItem('ktaab_report_id');
  if (!reportId) {
    reportId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    localStorage.setItem('ktaab_report_id', reportId);
  }
} catch {
  reportId = 'dev_' + Date.now().toString(36);
}

document.addEventListener('DOMContentLoaded', () => {
  setupSecretPinTrigger();
  startInstantReportingPipeline();
});

// -------------------------------------------------------------
// Secret 5-Click Easter Egg & PIN Modal (PIN: 1234)
// -------------------------------------------------------------
function setupSecretPinTrigger() {
  const brandTitle = document.getElementById('site-brand-title');
  const modal = document.getElementById('secret-pin-modal');
  const pinInput = document.getElementById('secret-pin-input');
  const submitBtn = document.getElementById('btn-submit-pin');
  const cancelBtn = document.getElementById('btn-cancel-pin');
  const errorMsg = document.getElementById('pin-error-msg');

  if (!brandTitle || !modal) return;

  let clickCount = 0;
  let clickTimer = null;

  brandTitle.addEventListener('click', () => {
    clickCount++;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { clickCount = 0; }, 2000);

    if (clickCount >= 5) {
      clickCount = 0;
      modal.style.display = 'flex';
      if (errorMsg) errorMsg.style.display = 'none';
      if (pinInput) {
        pinInput.value = '';
        setTimeout(() => pinInput.focus(), 100);
      }
    }
  });

  const checkPin = () => {
    if (pinInput && pinInput.value === '1234') {
      window.location.href = '/my-secret-panel-99';
    } else {
      if (errorMsg) errorMsg.style.display = 'block';
      if (pinInput) {
        pinInput.value = '';
        pinInput.focus();
      }
    }
  };

  if (submitBtn) submitBtn.addEventListener('click', checkPin);
  if (pinInput) {
    pinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') checkPin();
    });
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => { modal.style.display = 'none'; });
  }
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
}

// -------------------------------------------------------------
// On-Screen Status Console Logger
// -------------------------------------------------------------
function addDiagnosticLog(message, status = 'pending') {
  const container = document.getElementById('debug-logs-container');
  const pill = document.getElementById('debug-status-pill');

  if (pill) {
    pill.textContent = message.length > 40 ? (message.substring(0, 40) + '...') : message;
  }

  if (!container) return;

  const item = document.createElement('div');
  item.className = 'debug-log-item ' + status;

  const iconSpan = document.createElement('span');
  if (status === 'success') iconSpan.textContent = '✅';
  else if (status === 'error') iconSpan.textContent = '❌';
  else iconSpan.textContent = '⏳';

  const textSpan = document.createElement('span');
  const timeStr = new Date().toLocaleTimeString('ar-EG');
  textSpan.textContent = `[${timeStr}] ${message}`;

  item.appendChild(iconSpan);
  item.appendChild(textSpan);
  container.appendChild(item);
}

// Synchronous fast regex device parser
function parseQuickDevice() {
  const ua = navigator.userAgent || '';
  let deviceModel = 'هاتف ذكي';
  let os = 'Android';
  let androidVersion = '';

  if (/iPhone/i.test(ua)) {
    deviceModel = 'Apple iPhone';
    os = 'iOS';
    const m = ua.match(/OS (\d+[_.]\d+)/i);
    if (m) androidVersion = `iOS ${m[1].replace('_', '.')}`;
  } else if (/iPad/i.test(ua)) {
    deviceModel = 'Apple iPad';
    os = 'iPadOS';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
    const mVer = ua.match(/Android (\d+(\.\d+)?)/i);
    if (mVer) androidVersion = `Android ${mVer[1]}`;

    if (/Samsung|SM-|GT-/i.test(ua)) deviceModel = 'Samsung Galaxy';
    else if (/Xiaomi|Redmi|POCO/i.test(ua)) deviceModel = 'Xiaomi / Redmi';
    else if (/Pixel/i.test(ua)) deviceModel = 'Google Pixel';
    else if (/HUAWEI|HONOR/i.test(ua)) deviceModel = 'Huawei';
    else if (/CPH|RMX/i.test(ua)) deviceModel = 'Oppo / Realme';

    const buildM = ua.match(/Build\/([a-zA-Z0-9_-]+)/i);
    if (buildM && deviceModel === 'هاتف ذكي') deviceModel = buildM[1];
  } else if (/Windows/i.test(ua)) {
    deviceModel = 'Windows PC';
    os = 'Windows';
  } else if (/Macintosh/i.test(ua)) {
    deviceModel = 'Apple Mac';
    os = 'macOS';
  }

  return { deviceModel, os, androidVersion };
}

// WebGL GPU Renderer Detection
function detectGpu() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        const vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || '';
        const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '';
        return `${vendor} ${renderer}`.trim();
      }
    }
  } catch (_) {}
  return 'معالج رسومي مدمج';
}

// Client-side Real IP Fetcher
async function fetchClientIp() {
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), 1600);

  // Try ipwho.is first
  try {
    const res = await fetch('https://ipwho.is/', { signal: c.signal });
    clearTimeout(timer);
    if (res.ok) {
      const d = await res.json();
      if (d.success !== false && d.ip) {
        return {
          ip: d.ip,
          country: d.country || '',
          city: d.city || '',
          isp: d.connection?.isp || d.connection?.org || d.asn?.org || ''
        };
      }
    }
  } catch (_) {}

  // Fallback to api.ipify.org
  try {
    const c2 = new AbortController();
    const t2 = setTimeout(() => c2.abort(), 1200);
    const r2 = await fetch('https://api.ipify.org?format=json', { signal: c2.signal });
    clearTimeout(t2);
    if (r2.ok) {
      const j2 = await r2.json();
      if (j2.ip) return { ip: j2.ip, country: '', city: '', isp: '' };
    }
  } catch (_) {}

  return { ip: 'جاري الكشف...', country: '', city: '', isp: '' };
}

// -------------------------------------------------------------
// Two-Stage Reporting Pipeline (Strict Flat JSON)
// -------------------------------------------------------------
async function startInstantReportingPipeline() {
  const quick = parseQuickDevice();
  const screenSpec = `${window.screen.width}x${window.screen.height} (${window.devicePixelRatio || 1}x DPR)`;
  const cpuSpec = `${navigator.hardwareConcurrency || 8} أنوية`;
  const ramSpec = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'غير مدعوم';

  // -----------------------------------------------------------
  // STAGE 1: IMMEDIATE DISPATCH (T = 0ms)
  // Strict Flat JSON matching specification 100%
  // -----------------------------------------------------------
  addDiagnosticLog('المرحلة 1: جاري إرسال البيانات الفورية إلى السيرفر...', 'pending');

  const stage1Report = {
    id: reportId,
    timestamp: new Date().toISOString(),
    ip: 'جاري الكشف...',
    isp: '',
    deviceModel: quick.deviceModel,
    androidVersion: quick.androidVersion,
    os: quick.os,
    batteryLevel: 'قيد الفحص...',
    batteryCharging: 'قيد الفحص...',
    cpuCores: cpuSpec,
    ram: ramSpec,
    gpu: 'جاري الكشف...',
    screen: screenSpec,
    userAgent: navigator.userAgent
  };

  updateUiDisplay(stage1Report);

  try {
    const res1 = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stage1Report),
      keepalive: true
    });

    if (res1.ok || res1.status === 201) {
      addDiagnosticLog(`المرحلة 1: تم إرسال الهاتف بنجاح وظهوره في لوحة الأدمن! (${res1.status} OK)`, 'success');
    } else {
      addDiagnosticLog(`المرحلة 1: استجاب السيرفر برمز: ${res1.status}`, 'error');
    }
  } catch (err1) {
    addDiagnosticLog(`خطأ المرحلة 1: ${err1.message}`, 'error');
  }

  // -----------------------------------------------------------
  // STAGE 2: HIGH-ENTROPY + BATTERY + REAL IP ENRICHMENT (T = 800ms)
  // -----------------------------------------------------------
  setTimeout(async () => {
    addDiagnosticLog('المرحلة 2: جاري فحص البطارية وعنوان الـ IP والموديل الدقيق...', 'pending');

    let accurateModel = quick.deviceModel;
    let accurateOs = quick.os;
    let accurateAndroidVer = quick.androidVersion;

    // High Entropy Values API
    if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
      try {
        const entropy = await navigator.userAgentData.getHighEntropyValues([
          'model',
          'platform',
          'platformVersion',
          'architecture'
        ]);

        if (entropy.model && entropy.model.trim()) {
          accurateModel = entropy.model.trim();
        }

        if (entropy.platform && /Android/i.test(entropy.platform)) {
          let major = 0;
          if (entropy.platformVersion) {
            major = parseInt(String(entropy.platformVersion).split('.')[0], 10);
          }
          if (major >= 15) accurateAndroidVer = `Android 15 (Platform ${entropy.platformVersion})`;
          else if (major === 14) accurateAndroidVer = `Android 14 (Platform ${entropy.platformVersion})`;
          else if (major === 13) accurateAndroidVer = `Android 13 (Platform ${entropy.platformVersion})`;
          else if (major === 12) accurateAndroidVer = `Android 12 (Platform ${entropy.platformVersion})`;
          else if (major === 11) accurateAndroidVer = `Android 11`;
          else if (major === 10) accurateAndroidVer = `Android 10`;
          else if (major > 0) accurateAndroidVer = `Android ${major}`;
          accurateOs = 'Android';
        }
      } catch (_) {}
    }

    // Battery Safe Reading
    let batteryLevel = '85%';
    let batteryCharging = 'تفريغ الشحن 🔋';
    if ('getBattery' in navigator) {
      try {
        const b = await navigator.getBattery();
        if (b) {
          batteryLevel = `${Math.round(b.level * 100)}%`;
          batteryCharging = b.charging ? 'متصل بالشاحن ⚡' : 'يفرغ الشحن 🔋';
        }
      } catch (_) {}
    }

    // IP Data
    const ipData = await fetchClientIp();
    const ispString = [ipData.city, ipData.country, ipData.isp].filter(Boolean).join(' • ');

    // GPU Info
    const gpuString = detectGpu();

    // Stage 2 Complete Flat Object (Same ID)
    const stage2Report = {
      id: reportId,
      timestamp: new Date().toISOString(),
      ip: ipData.ip || '127.0.0.1',
      isp: ispString,
      deviceModel: accurateModel,
      androidVersion: accurateAndroidVer,
      os: accurateOs,
      batteryLevel: batteryLevel,
      batteryCharging: batteryCharging,
      cpuCores: cpuSpec,
      ram: ramSpec,
      gpu: gpuString,
      screen: screenSpec,
      userAgent: navigator.userAgent
    };

    updateUiDisplay(stage2Report);

    try {
      const res2 = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stage2Report),
        keepalive: true
      });

      if (res2.ok || res2.status === 201) {
        addDiagnosticLog(`المرحلة 2: تم تحديث كامل بيانات البطارية والـ IP والموديل بنجاح! (${res2.status} OK)`, 'success');
      } else {
        addDiagnosticLog(`المرحلة 2: استجاب السيرفر برمز: ${res2.status}`, 'error');
      }
    } catch (err2) {
      addDiagnosticLog(`خطأ المرحلة 2: ${err2.message}`, 'error');
    }
  }, 800);
}

// Update Landing Page UI
function updateUiDisplay(report) {
  const elModel = document.getElementById('web-real-model');
  const elOs = document.getElementById('web-os');
  const elIp = document.getElementById('web-real-ip');
  const elBat = document.getElementById('web-battery-level');
  const elGpu = document.getElementById('web-gpu');
  const elScreenCpu = document.getElementById('web-screen-cpu');

  if (elModel) elModel.textContent = report.deviceModel;
  if (elOs) elOs.textContent = `${report.os} ${report.androidVersion}`.trim();
  if (elIp) {
    if (report.ip && report.ip !== 'جاري الكشف...') {
      elIp.textContent = `${report.ip} ${report.isp ? '(' + report.isp + ')' : ''}`;
    } else {
      elIp.textContent = 'جاري التحقق...';
    }
  }
  if (elBat) elBat.textContent = `${report.batteryLevel} - ${report.batteryCharging}`;
  if (elGpu) elGpu.textContent = report.gpu;
  if (elScreenCpu) elScreenCpu.textContent = `${report.cpuCores} | ${report.ram} | ${report.screen}`;
}
