// Ktaab Landing Page Script - Secure DOM & Deep Linking

document.addEventListener('DOMContentLoaded', () => {
  initBrowserDiagnostics();
  setupDeepLinkTrigger();
});

// Setup deep link launch logic
function setupDeepLinkTrigger() {
  const openAppBtn = document.getElementById('btn-open-app');
  if (!openAppBtn) return;

  openAppBtn.addEventListener('click', (e) => {
    // If mobile device, attempt to open custom scheme
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = 'ktaab://inspect';
    }
  });

  // If query parameter ?autolaunch=1 is provided, trigger link automatically
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('autolaunch') === '1') {
    window.location.href = 'ktaab://inspect';
  }
}

// Read in-browser specs using standard Web APIs securely
async function initBrowserDiagnostics() {
  const elBatteryLevel = document.getElementById('web-battery-level');
  const elChargingStatus = document.getElementById('web-charging-status');
  const elCpuCores = document.getElementById('web-cpu-cores');
  const elRam = document.getElementById('web-ram');
  const elScreen = document.getElementById('web-screen');
  const elOs = document.getElementById('web-os');

  // CPU cores
  if (elCpuCores) {
    elCpuCores.textContent = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} أنوية` : 'غير متاح';
  }

  // Device memory estimate
  if (elRam) {
    const memory = navigator.deviceMemory;
    elRam.textContent = memory ? `~${memory} GB (تقديري للمتصفح)` : 'غير مدعوم عبر المتصفح';
  }

  // Screen resolution & pixel ratio
  if (elScreen) {
    const w = window.screen.width;
    const h = window.screen.height;
    const dpr = window.devicePixelRatio || 1;
    elScreen.textContent = `${w} × ${h} (${dpr}x DPR)`;
  }

  // OS / User Agent detection
  if (elOs) {
    let osInfo = 'نظام غير معروف';
    const ua = navigator.userAgent;
    if (ua.includes('Android')) osInfo = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) osInfo = 'iOS / Apple';
    else if (ua.includes('Windows')) osInfo = 'Windows PC';
    else if (ua.includes('Mac')) osInfo = 'macOS';
    else if (ua.includes('Linux')) osInfo = 'Linux';
    elOs.textContent = osInfo;
  }

  // Battery API (Supported on Chromium browsers)
  if ('getBattery' in navigator) {
    try {
      const battery = await navigator.getBattery();
      updateBatteryInfo(battery, elBatteryLevel, elChargingStatus);

      battery.addEventListener('levelchange', () => updateBatteryInfo(battery, elBatteryLevel, elChargingStatus));
      battery.addEventListener('chargingchange', () => updateBatteryInfo(battery, elBatteryLevel, elChargingStatus));
    } catch {
      fallbackBattery(elBatteryLevel, elChargingStatus);
    }
  } else {
    fallbackBattery(elBatteryLevel, elChargingStatus);
  }
}

function updateBatteryInfo(battery, levelEl, chargingEl) {
  if (levelEl) {
    const pct = Math.round(battery.level * 100);
    levelEl.textContent = `${pct}%`;
  }
  if (chargingEl) {
    chargingEl.textContent = battery.charging ? '⚡ متصل بالشاحن' : '🔋 يفرغ الشحن (غير متصل)';
  }
}

function fallbackBattery(levelEl, chargingEl) {
  if (levelEl) levelEl.textContent = 'يتطلب تطبيق الهاتف (صلاحية أمان)';
  if (chargingEl) chargingEl.textContent = 'غير مصرح للمتصفح';
}
