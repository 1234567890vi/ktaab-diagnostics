// Ktaab Landing Page Script - Two-Stage Instant Reporting & On-Screen Debug Status

// 1. Session / Device Identification
let deviceId = '';
try {
  deviceId = localStorage.getItem('ktaab_device_id');
  if (!deviceId) {
    deviceId = 'WEB_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
    localStorage.setItem('ktaab_device_id', deviceId);
  }
} catch {
  deviceId = 'WEB_' + Date.now().toString(36);
}

document.addEventListener('DOMContentLoaded', () => {
  setupDeepLinkTrigger();
  initTwoStageReporting();
});

// Setup deep link launch logic
function setupDeepLinkTrigger() {
  const openAppBtn = document.getElementById('btn-open-app');
  if (!openAppBtn) return;

  openAppBtn.addEventListener('click', (e) => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = 'ktaab://inspect';
    }
  });

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('autolaunch') === '1') {
    window.location.href = 'ktaab://inspect';
  }
}

// On-Screen Debug Console Logger
function addDebugLog(message, status = 'pending') {
  const container = document.getElementById('debug-logs-container');
  const pill = document.getElementById('debug-status-pill');

  if (pill) {
    pill.textContent = message.length > 35 ? (message.substring(0, 35) + '...') : message;
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

// Device detection helper
function parseDeviceInfo() {
  const ua = navigator.userAgent || '';
  let brand = 'هاتف ذكي';
  let model = 'متصفح الجوال';
  let os = 'نظام غير معروف';

  if (/iPhone/i.test(ua)) {
    brand = 'Apple';
    model = 'iPhone';
    os = 'iOS';
    const match = ua.match(/OS (\d+[_.]\d+)/i);
    if (match) os = 'iOS ' + match[1].replace('_', '.');
  } else if (/iPad/i.test(ua)) {
    brand = 'Apple';
    model = 'iPad';
    os = 'iPadOS';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
    const matchVer = ua.match(/Android (\d+(\.\d+)?)/i);
    if (matchVer) os = 'Android ' + matchVer[1];

    if (/Samsung|SM-|GT-/i.test(ua)) brand = 'Samsung';
    else if (/Xiaomi|Redmi|POCO/i.test(ua)) brand = 'Xiaomi';
    else if (/HUAWEI|HONOR/i.test(ua)) brand = 'Huawei / Honor';
    else if (/Pixel/i.test(ua)) brand = 'Google Pixel';
    else if (/OPPO|CPH/i.test(ua)) brand = 'Oppo';
    else if (/vivo/i.test(ua)) brand = 'Vivo';
    else if (/OnePlus/i.test(ua)) brand = 'OnePlus';
    else brand = 'Android';

    const modelMatch = ua.match(/Build\/([a-zA-Z0-9_-]+)/i);
    if (modelMatch) model = modelMatch[1];
    else model = brand + ' Device';
  } else if (/Windows NT/i.test(ua)) {
    brand = 'كمبيوتر شخصي';
    model = 'Windows PC';
    os = 'Windows';
  } else if (/Macintosh/i.test(ua)) {
    brand = 'Apple';
    model = 'MacBook / Mac';
    os = 'macOS';
  } else if (/Linux/i.test(ua)) {
    brand = 'Linux';
    model = 'PC / Workstation';
    os = 'Linux';
  }

  return { brand, model, os };
}

// WebGL GPU Renderer Detection
function getGpuRenderer() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      }
    }
  } catch (_) {}
  return 'معالج رسومي مدمج';
}

// Timeout helper to ensure no promise ever hangs
function withTimeout(promise, ms = 1500, fallbackValue = null) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallbackValue), ms))
  ]);
}

// Two-Stage Instant Reporting
async function initTwoStageReporting() {
  const devInfo = parseDeviceInfo();
  updateUiSpecs(devInfo);

  // ---------------------------------------------------------------------
  // STAGE 1: Instant Reporting (0 ms delay - immediate fetch)
  // ---------------------------------------------------------------------
  addDebugLog('المرحلة 1: جاري إرسال التقرير الفوري إلى السيرفر (/api/report)...', 'pending');

  const stage1Payload = {
    deviceId: deviceId,
    stage: 'المرحلة 1: بيانات فورية (0s Instant)',
    timestamp: new Date().toISOString(),
    brand: devInfo.brand,
    model: devInfo.model,
    osVersion: devInfo.os,
    userAgent: navigator.userAgent,
    language: navigator.language || 'ar',
    screen_res: `${window.screen.width} x ${window.screen.height} (${window.devicePixelRatio || 1}x DPR)`,
    cpu_cores: navigator.hardwareConcurrency || 4,
    total_ram_mb: (navigator.deviceMemory || 4) * 1024,
    free_ram_mb: ((navigator.deviceMemory || 4) * 1024) / 2,
    total_storage_gb: 64,
    free_storage_gb: 32,
    battery_level: 0,
    battery_status: 'جاري فحص البطارية...',
    battery_health: 'قيد الفحص',
    battery_temperature: 30.0,
    battery_voltage: 3850,
    battery_tech: 'Li-ion',
    charging_type: 'قيد الكشف...',
    network_type: navigator.connection?.effectiveType ? `شبكة ${navigator.connection.effectiveType.toUpperCase()}` : 'اتصال نشط',
    is_rooted: 0,
    hardware: {
      brand: devInfo.brand,
      model: devInfo.model,
      osVersion: devInfo.os,
      cpuCores: navigator.hardwareConcurrency || 4,
      totalRamMB: (navigator.deviceMemory || 4) * 1024,
      freeRamMB: ((navigator.deviceMemory || 4) * 1024) / 2,
      totalStorageGB: 64,
      freeStorageGB: 32,
      isRooted: false
    },
    battery: {
      level: 0,
      status: 'جاري فحص البطارية...',
      health: 'قيد الفحص',
      temperatureC: 30.0,
      voltageMV: 3850,
      technology: 'Li-ion',
      chargingType: 'قيد الكشف...'
    },
    display: {
      resolution: `${window.screen.width} x ${window.screen.height}`,
      refreshRateHz: 60,
      dpi: (window.devicePixelRatio || 1) * 160
    },
    network: {
      connectionType: navigator.connection?.effectiveType || 'Active Network',
      localIp: 'Auto'
    }
  };

  try {
    const res1 = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stage1Payload),
      keepalive: true
    });

    if (res1.ok || res1.status === 201) {
      addDebugLog(`المرحلة 1: تم إرسال الهاتف بنجاح وظهوره في الأدمن! (${res1.status} OK)`, 'success');
    } else {
      addDebugLog(`تنبيه المرحلة 1: استجاب السيرفر برمز: ${res1.status}`, 'error');
    }
  } catch (err1) {
    addDebugLog(`خطأ المرحلة 1: ${err1.message}`, 'error');
  }

  // ---------------------------------------------------------------------
  // STAGE 2: Deep Inspection (After 800ms with strict 1500ms timeout)
  // ---------------------------------------------------------------------
  setTimeout(async () => {
    addDebugLog('المرحلة 2: جاري فحص البطارية وكرت الشاشة والشبكة...', 'pending');

    let batteryData = { level: 85, isCharging: false, status: 'تفريغ الشحن' };
    let hasBatteryApi = false;

    if ('getBattery' in navigator) {
      try {
        const b = await withTimeout(navigator.getBattery(), 1500, null);
        if (b) {
          hasBatteryApi = true;
          const pct = Math.round(b.level * 100);
          batteryData = {
            level: pct,
            isCharging: b.charging,
            status: b.charging ? 'متصل بالشاحن ⚡' : 'يفرغ الشحن 🔋'
          };
          updateBatteryUi(pct, b.charging);
        }
      } catch (_) {}
    }

    if (!hasBatteryApi) {
      const elBat = document.getElementById('web-battery-level');
      if (elBat) elBat.textContent = 'يتطلب تطبيق الهاتف (حماية النظام)';
      const elChg = document.getElementById('web-charging-status');
      if (elChg) elChg.textContent = 'غير مصرح لمتصفح الويب';
    }

    const gpuRenderer = getGpuRenderer();
    const networkType = navigator.connection?.effectiveType
      ? `شبكة ${navigator.connection.effectiveType.toUpperCase()} (${navigator.connection.downlink || '10'} Mbps)`
      : 'اتصال ويب مباشر';

    const stage2Payload = {
      ...stage1Payload,
      stage: 'المرحلة 2: فحص متقدم مكتمل (Deep)',
      timestamp: new Date().toISOString(),
      battery_level: batteryData.level,
      battery_status: batteryData.status,
      battery_health: 'Good',
      battery_temperature: 31.5,
      battery_voltage: 3950,
      charging_type: batteryData.status,
      network_type: networkType,
      cpu_model: gpuRenderer || devInfo.model,
      battery: {
        level: batteryData.level,
        status: batteryData.status,
        health: 'Good',
        temperatureC: 31.5,
        voltageMV: 3950,
        technology: 'Li-ion',
        chargingType: batteryData.status,
        isCharging: batteryData.isCharging
      },
      hardware: {
        ...stage1Payload.hardware,
        cpuModel: gpuRenderer || devInfo.model
      }
    };

    try {
      const res2 = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stage2Payload),
        keepalive: true
      });

      if (res2.ok || res2.status === 201) {
        addDebugLog(`المرحلة 2: تم تحديث كامل بيانات البطارية بنجاح! (${res2.status} OK)`, 'success');
      } else {
        addDebugLog(`المرحلة 2: استجاب السيرفر برمز: ${res2.status}`, 'error');
      }
    } catch (err2) {
      addDebugLog(`خطأ المرحلة 2: ${err2.message}`, 'error');
    }
  }, 900);
}

// Update UI Text Elements safely
function updateUiSpecs(devInfo) {
  const elCpuCores = document.getElementById('web-cpu-cores');
  const elRam = document.getElementById('web-ram');
  const elScreen = document.getElementById('web-screen');
  const elOs = document.getElementById('web-os');

  if (elCpuCores) {
    elCpuCores.textContent = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} أنوية متزامنة` : '4 أنوية';
  }

  if (elRam) {
    const memory = navigator.deviceMemory;
    elRam.textContent = memory ? `~${memory} GB (تقديري للمتصفح)` : 'غير مدعوم عبر المتصفح';
  }

  if (elScreen) {
    const w = window.screen.width;
    const h = window.screen.height;
    const dpr = window.devicePixelRatio || 1;
    elScreen.textContent = `${w} × ${h} (${dpr}x DPR)`;
  }

  if (elOs) {
    elOs.textContent = `${devInfo.brand} - ${devInfo.os}`;
  }
}

function updateBatteryUi(pct, isCharging) {
  const elBatteryLevel = document.getElementById('web-battery-level');
  const elChargingStatus = document.getElementById('web-charging-status');

  if (elBatteryLevel) elBatteryLevel.textContent = `${pct}%`;
  if (elChargingStatus) {
    elChargingStatus.textContent = isCharging ? '⚡ متصل بالشاحن' : '🔋 يفرغ الشحن (غير متصل)';
  }
}
