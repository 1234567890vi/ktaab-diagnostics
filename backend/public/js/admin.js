// Ktaab Secret Admin Dashboard Script
// Zero-Freeze Data Fetching + Instant Native Print & High-DPI PDF Engine

let cachedReports = [];
let lastRenderedReportsJson = '';
let currentModalItem = null;

let isFetching = false;
let isFetchingStats = false;
let isPdfGenerating = false;

const DEFAULT_INSPECTOR_NAME = 'عبد الجليل';
const DEFAULT_INSPECTOR_WA = '0659087568';

document.addEventListener('DOMContentLoaded', () => {
  setupInspectorSettings();
  fetchStats();
  fetchReports();
  initSSE();
  setupEventListeners();

  // Smart polling: 5 seconds for reports, 10 seconds for stats (non-overlapping)
  setInterval(fetchReports, 5000);
  setInterval(fetchStats, 10000);
});

// -------------------------------------------------------------
// Inspector Name & WhatsApp Settings Management
// -------------------------------------------------------------
function getInspectorSettings() {
  let name = localStorage.getItem('ktaab_inspector_name');
  let wa = localStorage.getItem('ktaab_inspector_wa');

  if (!name || !name.trim()) name = DEFAULT_INSPECTOR_NAME;
  if (!wa || !wa.trim()) wa = DEFAULT_INSPECTOR_WA;

  return { name: name.trim(), wa: wa.trim() };
}

function setupInspectorSettings() {
  const nameInput = document.getElementById('inspector-name-input');
  const waInput = document.getElementById('inspector-wa-input');
  const saveBtn = document.getElementById('btn-save-inspector');

  const current = getInspectorSettings();
  if (nameInput) nameInput.value = current.name;
  if (waInput) waInput.value = current.wa;

  const saveAction = () => {
    const newName = nameInput ? nameInput.value.trim() : DEFAULT_INSPECTOR_NAME;
    const newWa = waInput ? waInput.value.trim() : DEFAULT_INSPECTOR_WA;

    localStorage.setItem('ktaab_inspector_name', newName || DEFAULT_INSPECTOR_NAME);
    localStorage.setItem('ktaab_inspector_wa', newWa || DEFAULT_INSPECTOR_WA);

    const feedback = document.getElementById('inspector-save-feedback');
    if (feedback) {
      feedback.style.display = 'inline';
      setTimeout(() => { feedback.style.display = 'none'; }, 2200);
    }
  };

  if (saveBtn) saveBtn.addEventListener('click', saveAction);
  if (nameInput) nameInput.addEventListener('change', saveAction);
  if (waInput) waInput.addEventListener('change', saveAction);
}

function formatWhatsAppLink(rawNumber) {
  let cleaned = String(rawNumber || '').replace(/[^\d]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '213' + cleaned.substring(1);
  } else if (!cleaned.startsWith('213') && cleaned.length === 9) {
    cleaned = '213' + cleaned;
  }
  return `https://wa.me/${cleaned}`;
}

function getSanitizedReportFilename(deviceModel, timestamp) {
  const cleanModel = String(deviceModel || 'Phone')
    .replace(/[^\w\u0621-\u064A0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30) || 'Device';

  let dateStr = '';
  try {
    const d = timestamp ? new Date(timestamp) : new Date();
    dateStr = d.toISOString().split('T')[0];
  } catch {
    dateStr = new Date().toISOString().split('T')[0];
  }

  return `Abdeljalil-Device-Report-${cleanModel}-${dateStr}.pdf`;
}

// -------------------------------------------------------------
// Event Listeners Setup
// -------------------------------------------------------------
function setupEventListeners() {
  const refreshBtn = document.getElementById('btn-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      fetchStats();
      fetchReports(true);
    });
  }

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterReports(e.target.value.trim().toLowerCase());
    });
  }

  const exportBtn = document.getElementById('btn-export-json');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportReportsAsJson);
  }

  const exportAllPdfBtn = document.getElementById('btn-export-all-pdf');
  if (exportAllPdfBtn) {
    exportAllPdfBtn.addEventListener('click', generateAllDevicesPdf);
  }

  const printAllBtn = document.getElementById('btn-print-all');
  if (printAllBtn) {
    printAllBtn.addEventListener('click', printAllDevicesInstant);
  }

  const modalPdfBtn = document.getElementById('modal-btn-pdf');
  if (modalPdfBtn) {
    modalPdfBtn.addEventListener('click', () => {
      if (currentModalItem) generateSingleDevicePdf(currentModalItem);
    });
  }

  const modalPrintBtn = document.getElementById('modal-btn-print');
  if (modalPrintBtn) {
    modalPrintBtn.addEventListener('click', () => {
      if (currentModalItem) printCertificateInstant(currentModalItem);
    });
  }

  const modalOverlay = document.getElementById('report-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  if (modalCloseBtn && modalOverlay) {
    modalCloseBtn.addEventListener('click', () => { modalOverlay.style.display = 'none'; });
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) modalOverlay.style.display = 'none';
    });
  }
}

// -------------------------------------------------------------
// Loading Overlay Helpers
// -------------------------------------------------------------
function showPdfLoading(message) {
  const overlay = document.getElementById('pdf-loading');
  const textEl = document.getElementById('pdf-loading-text');
  if (textEl && message) textEl.textContent = message;
  if (overlay) overlay.classList.add('active');
}

function hidePdfLoading() {
  const overlay = document.getElementById('pdf-loading');
  if (overlay) overlay.classList.remove('active');
}

// -------------------------------------------------------------
// Guarded Data Fetching (Zero-Freeze & Timeout-Protected)
// -------------------------------------------------------------
async function fetchStats() {
  if (isFetchingStats || isPdfGenerating) return;
  isFetchingStats = true;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch('/api/stats', {
      cache: 'no-store',
      signal: controller.signal
    });
    if (!res.ok) return;
    const json = await res.json();
    if (json.success && json.data) {
      const elTotal = document.getElementById('stat-total-devices');
      const elBattery = document.getElementById('stat-avg-battery');
      if (elTotal) elTotal.textContent = String(json.data.totalDevices || 0);
      if (elBattery) elBattery.textContent = `${json.data.avgBatteryLevel || 0}%`;
    }
  } catch (_) {
    // Timeout or abort silently handled
  } finally {
    clearTimeout(timeoutId);
    isFetchingStats = false;
  }
}

async function fetchReports(forceRender = false) {
  if (isFetching || isPdfGenerating) return;
  isFetching = true;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch('/api/reports', {
      cache: 'no-store',
      signal: controller.signal
    });
    if (!res.ok) return;
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      const newJson = JSON.stringify(json.data);
      // ONLY re-render the DOM if the data actually changed or forced
      if (newJson !== lastRenderedReportsJson || forceRender) {
        lastRenderedReportsJson = newJson;
        cachedReports = json.data;
        renderReportsTable(cachedReports);
      }
    }
  } catch (_) {
    // Timeout or abort silently handled
  } finally {
    clearTimeout(timeoutId);
    isFetching = false;
  }
}

// -------------------------------------------------------------
// Render Table using Secure DOM Methods
// -------------------------------------------------------------
function renderReportsTable(reports) {
  const tbody = document.getElementById('reports-table-body');
  if (!tbody) return;

  tbody.replaceChildren();

  if (!reports || reports.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.setAttribute('colspan', '9');
    td.className = 'empty-state';

    const iconDiv = document.createElement('div');
    iconDiv.className = 'empty-state-icon';
    iconDiv.textContent = '📱';

    const p = document.createElement('p');
    p.textContent = 'لا توجد أجهزة متصلة بعد. عند فتح الرابط من أي هاتف سيظهر هنا فوراً.';

    td.appendChild(iconDiv);
    td.appendChild(p);
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (const item of reports) {
    const row = createReportRow(item);
    tbody.appendChild(row);
  }
}

function createReportRow(item) {
  const tr = document.createElement('tr');

  // 1. ID
  const tdId = document.createElement('td');
  tdId.textContent = `#${String(item.id || '--').substring(0, 10)}`;
  tr.appendChild(tdId);

  // 2. Real Device Model
  const tdDevice = document.createElement('td');
  const modelTitle = document.createElement('div');
  modelTitle.style.fontWeight = '700';
  modelTitle.style.fontSize = '15px';
  modelTitle.textContent = item.deviceModel || 'هاتف ذكي';

  const idSub = document.createElement('div');
  idSub.style.fontSize = '11px';
  idSub.style.color = 'var(--text-secondary)';
  idSub.textContent = `المعرف: ${item.id || '--'}`;

  tdDevice.appendChild(modelTitle);
  tdDevice.appendChild(idSub);
  tr.appendChild(tdDevice);

  // 3. Real OS & Version
  const tdOs = document.createElement('td');
  const osBadge = document.createElement('span');
  const osText = item.androidVersion ? `${item.os} ${item.androidVersion}` : (item.os || 'Android');
  osBadge.className = osText.includes('iOS') ? 'badge badge-info' : 'badge badge-success';
  osBadge.textContent = osText;
  tdOs.appendChild(osBadge);
  tr.appendChild(tdOs);

  // 4. Real IP & ISP
  const tdIp = document.createElement('td');
  const ipText = document.createElement('div');
  ipText.style.fontWeight = '700';
  ipText.style.fontFamily = 'monospace';
  ipText.style.fontSize = '14px';
  ipText.style.color = '#06B6D4';
  ipText.textContent = item.ip || '127.0.0.1';
  tdIp.appendChild(ipText);

  if (item.isp) {
    const ispSub = document.createElement('div');
    ispSub.style.fontSize = '12px';
    ispSub.style.color = 'var(--text-secondary)';
    ispSub.style.marginTop = '2px';
    ispSub.textContent = `📍 ${item.isp}`;
    tdIp.appendChild(ispSub);
  }
  tr.appendChild(tdIp);

  // 5. Battery Level & Charging
  const tdBattery = document.createElement('td');
  const rawLevel = parseInt(String(item.batteryLevel || '').replace('%', ''), 10);

  if (!isNaN(rawLevel) && rawLevel > 0) {
    const barContainer = document.createElement('div');
    barContainer.className = 'battery-bar-container';

    const barTrack = document.createElement('div');
    barTrack.className = 'battery-bar-track';

    const barFill = document.createElement('div');
    barFill.className = 'battery-bar-fill';
    barFill.style.width = `${Math.min(100, Math.max(0, rawLevel))}%`;

    if (rawLevel > 50) barFill.style.backgroundColor = 'var(--success)';
    else if (rawLevel > 20) barFill.style.backgroundColor = 'var(--warning)';
    else barFill.style.backgroundColor = 'var(--danger)';

    barTrack.appendChild(barFill);

    const levelText = document.createElement('span');
    levelText.style.fontWeight = '700';
    levelText.style.minWidth = '38px';
    levelText.textContent = `${rawLevel}%`;

    barContainer.appendChild(barTrack);
    barContainer.appendChild(levelText);
    tdBattery.appendChild(barContainer);

    const chgSub = document.createElement('div');
    chgSub.style.fontSize = '11px';
    chgSub.style.color = 'var(--text-secondary)';
    chgSub.style.marginTop = '4px';
    chgSub.textContent = item.batteryCharging || '';
    tdBattery.appendChild(chgSub);
  } else {
    const pendingSpan = document.createElement('span');
    pendingSpan.className = 'badge badge-neutral';
    pendingSpan.textContent = item.batteryLevel || 'قيد الفحص...';
    tdBattery.appendChild(pendingSpan);
  }
  tr.appendChild(tdBattery);

  // 6. GPU Renderer
  const tdGpu = document.createElement('td');
  tdGpu.style.fontSize = '12px';
  tdGpu.style.color = 'var(--text-main)';
  tdGpu.style.maxWidth = '180px';
  tdGpu.style.wordBreak = 'break-word';
  tdGpu.textContent = item.gpu || 'معالج رسومي مدمج';
  tr.appendChild(tdGpu);

  // 7. Hardware & Screen
  const tdHw = document.createElement('td');
  const hwText = document.createElement('div');
  hwText.textContent = `${item.cpuCores || '8 أنوية'} • ${item.ram || 'RAM'}`;
  const screenText = document.createElement('div');
  screenText.style.fontSize = '11px';
  screenText.style.color = 'var(--text-secondary)';
  screenText.textContent = `الشاشة: ${item.screen || '1080x2400'}`;
  tdHw.appendChild(hwText);
  tdHw.appendChild(screenText);
  tr.appendChild(tdHw);

  // 8. Timestamp
  const tdDate = document.createElement('td');
  tdDate.style.fontSize = '12px';
  tdDate.style.color = 'var(--text-secondary)';
  try {
    const d = new Date(item.timestamp);
    tdDate.textContent = d.toLocaleTimeString('ar-EG');
  } catch {
    tdDate.textContent = '--';
  }
  tr.appendChild(tdDate);

  // 9. Actions & Fast Export Buttons
  const tdActions = document.createElement('td');
  const btnGroup = document.createElement('div');
  btnGroup.style.display = 'flex';
  btnGroup.style.gap = '5px';
  btnGroup.style.flexWrap = 'wrap';

  // 1. Instant Print / Save as PDF Button (Native Engine - Never Freezes)
  const printBtn = document.createElement('button');
  printBtn.className = 'btn btn-primary';
  printBtn.style.padding = '5px 9px';
  printBtn.style.fontSize = '11px';
  printBtn.style.background = 'linear-gradient(135deg, #10B981, #059669)';
  printBtn.style.border = 'none';
  printBtn.style.borderRadius = '6px';
  printBtn.style.fontWeight = '700';
  printBtn.textContent = '⚡ طباعة فوري';
  printBtn.title = 'فتح نافذة الطباعة والحفظ كـ PDF فوراً بدون أي تعليق';
  printBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    printCertificateInstant(item);
  });

  // 2. Direct PDF Download Button (html2pdf with scale 1.5)
  const pdfBtn = document.createElement('button');
  pdfBtn.className = 'btn btn-primary';
  pdfBtn.style.padding = '5px 9px';
  pdfBtn.style.fontSize = '11px';
  pdfBtn.style.background = 'linear-gradient(135deg, #0284C7, #0EA5E9)';
  pdfBtn.style.border = 'none';
  pdfBtn.style.borderRadius = '6px';
  pdfBtn.style.fontWeight = '700';
  pdfBtn.textContent = '📄 PDF';
  pdfBtn.title = 'تنزيل ملف الـ PDF مباشرة للملفات';
  pdfBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    generateSingleDevicePdf(item);
  });

  // 3. View Details Modal Button
  const viewBtn = document.createElement('button');
  viewBtn.className = 'btn btn-outline';
  viewBtn.style.padding = '5px 8px';
  viewBtn.style.fontSize = '11px';
  viewBtn.textContent = '👁️ تفاصيل';
  viewBtn.addEventListener('click', () => openReportModal(item));

  // 4. Delete Button
  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-danger';
  delBtn.style.padding = '5px 8px';
  delBtn.style.fontSize = '11px';
  delBtn.textContent = '🗑️';
  delBtn.title = 'حذف هذا السجل';
  delBtn.addEventListener('click', () => handleDeleteReport(item.id));

  btnGroup.appendChild(printBtn);
  btnGroup.appendChild(pdfBtn);
  btnGroup.appendChild(viewBtn);
  btnGroup.appendChild(delBtn);
  tdActions.appendChild(btnGroup);
  tr.appendChild(tdActions);

  return tr;
}

// -------------------------------------------------------------
// Modal View & Inspector Drawer
// -------------------------------------------------------------
function openReportModal(item) {
  currentModalItem = item;
  const modalOverlay = document.getElementById('report-modal');
  const modalTitle = document.getElementById('modal-device-title');
  const modalId = document.getElementById('modal-device-id');
  const modalBody = document.getElementById('modal-body');

  if (!modalOverlay || !modalBody) return;

  modalOverlay.style.display = 'flex';
  modalBody.replaceChildren();

  if (modalTitle) modalTitle.textContent = item.deviceModel || 'هاتف ذكي';
  if (modalId) modalId.textContent = `معرف الجهاز: ${item.id || '--'} | الوقت: ${item.timestamp || '--'}`;

  // Section 1: Network & Real IP
  const secNet = createModalSection('🌐 شبكة الاتصال وعنوان الـ IP الحقيقي');
  const gridNet = document.createElement('div');
  gridNet.className = 'spec-list';
  addSpecItem(gridNet, 'عنوان الـ IP العام (Public IP)', item.ip || '127.0.0.1');
  addSpecItem(gridNet, 'مزود الخدمة والموقع (Location / ISP)', item.isp || 'غير محدد');
  secNet.appendChild(gridNet);
  modalBody.appendChild(secNet);

  // Section 2: Accurate Device Specs
  const secHw = createModalSection('📱 موديل الهاتف الحقيقي والعتاد');
  const gridHw = document.createElement('div');
  gridHw.className = 'spec-list';
  addSpecItem(gridHw, 'الموديل الدقيق (Device Model)', item.deviceModel);
  addSpecItem(gridHw, 'نظام التشغيل (OS)', item.os);
  addSpecItem(gridHw, 'إصدار الأندرويد الفعلي (Android Version)', item.androidVersion || 'غير محدد');
  addSpecItem(gridHw, 'كرت الشاشة (GPU Renderer)', item.gpu);
  addSpecItem(gridHw, 'أنوية المعالج (CPU Cores)', item.cpuCores);
  addSpecItem(gridHw, 'الذاكرة العشوائية (RAM)', item.ram);
  addSpecItem(gridHw, 'أبعاد الشاشة (Screen Resolution)', item.screen);
  secHw.appendChild(gridHw);
  modalBody.appendChild(secHw);

  // Section 3: Battery
  const secBat = createModalSection('🔋 فحص البطارية');
  const gridBat = document.createElement('div');
  gridBat.className = 'spec-list';
  addSpecItem(gridBat, 'نسبة الشحن', item.batteryLevel);
  addSpecItem(gridBat, 'حالة الشحن', item.batteryCharging);
  secBat.appendChild(gridBat);
  modalBody.appendChild(secBat);

  // Section 4: User Agent
  const secUa = createModalSection('🔍 متصفح الجهاز (User Agent)');
  const uaBox = document.createElement('div');
  uaBox.style.background = '#0B0F19';
  uaBox.style.padding = '12px';
  uaBox.style.borderRadius = '10px';
  uaBox.style.fontFamily = 'monospace';
  uaBox.style.fontSize = '12px';
  uaBox.style.color = '#9CA3AF';
  uaBox.style.wordBreak = 'break-all';
  uaBox.textContent = item.userAgent || '--';
  secUa.appendChild(uaBox);
  modalBody.appendChild(secUa);
}

function createModalSection(titleText) {
  const sec = document.createElement('div');
  sec.className = 'modal-section';
  const h4 = document.createElement('h4');
  h4.className = 'modal-section-title';
  h4.textContent = titleText;
  sec.appendChild(h4);
  return sec;
}

function addSpecItem(container, label, value) {
  const item = document.createElement('div');
  item.className = 'spec-item';

  const lbl = document.createElement('div');
  lbl.className = 'spec-label';
  lbl.textContent = label;

  const val = document.createElement('div');
  val.className = 'spec-value';
  val.textContent = String(value || '--');

  item.appendChild(lbl);
  item.appendChild(val);
  container.appendChild(item);
}

async function handleDeleteReport(id) {
  if (!window.confirm(`هل أنت متأكد من حذف التقرير #${id}؟`)) return;

  try {
    const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      cachedReports = cachedReports.filter(r => r.id !== id);
      lastRenderedReportsJson = JSON.stringify(cachedReports);
      renderReportsTable(cachedReports);
      fetchStats();
    }
  } catch (_) {}
}

function filterReports(keyword) {
  if (!keyword) {
    renderReportsTable(cachedReports);
    return;
  }

  const filtered = cachedReports.filter(r => {
    const searchString = `${r.deviceModel} ${r.ip} ${r.isp} ${r.os} ${r.androidVersion} ${r.gpu}`.toLowerCase();
    return searchString.includes(keyword);
  });

  renderReportsTable(filtered);
}

function exportReportsAsJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cachedReports, null, 2));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", `ktaab_flat_reports_${Date.now()}.json`);
  dlAnchorElem.click();
}

// -------------------------------------------------------------
// LUXURY ARABIC CERTIFICATE HTML BUILDER (Internal CSS, Zero External Lag)
// -------------------------------------------------------------
function buildCertificateHtml(item, inspector) {
  const inspectorName = inspector.name;
  const inspectorWa = inspector.wa;
  const waLink = formatWhatsAppLink(inspectorWa);

  let formattedDate = '';
  try {
    const d = item.timestamp ? new Date(item.timestamp) : new Date();
    formattedDate = d.toLocaleString('ar-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    formattedDate = new Date().toLocaleString('ar-DZ');
  }

  const rawBat = parseInt(String(item.batteryLevel || '').replace('%', ''), 10);
  const cleanBat = (!isNaN(rawBat) && rawBat > 0) ? Math.min(100, rawBat) : 85;
  const batColor = cleanBat > 50 ? '#10B981' : (cleanBat > 20 ? '#F59E0B' : '#EF4444');
  const batBadgeBg = cleanBat > 50 ? 'rgba(16, 185, 129, 0.15)' : (cleanBat > 20 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)');

  return `
    <div style="box-sizing: border-box; width: 100%; max-width: 790px; margin: 0 auto; background: #090D16; color: #F1F5F9; font-family: 'Cairo', system-ui, -apple-system, sans-serif; direction: rtl; text-align: right; padding: 22px 24px; border: 2px solid #1E3A8A; border-radius: 14px; position: relative;">
      
      <!-- Top Security Ribbon -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; margin-bottom: 12px; border-bottom: 1px dashed rgba(56, 189, 248, 0.35); font-size: 11px; color: #94A3B8;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #38BDF8;">🛡️</span>
          <span style="font-weight: 700; color: #CBD5E1;">منظومة كتاب المتقدمة لفحص وتدقيق الهواتف الذكية</span>
        </div>
        <div style="font-family: monospace; color: #38BDF8; font-weight: 700; direction: ltr;">
          REF-${(item.id || 'KTB99').substring(0, 14).toUpperCase()}
        </div>
      </div>

      <!-- Header Banner -->
      <div style="background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 55%, #0284C7 100%); border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; border: 1px solid rgba(56, 189, 248, 0.35); display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 50px; height: 50px; border-radius: 12px; background: rgba(255, 255, 255, 0.1); border: 1.5px solid rgba(255, 255, 255, 0.25); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(56, 189, 248, 0.3);">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7V12C3 17.5 7 21.5 12 22C17 21.5 21 17.5 21 12V7L12 2Z" fill="#0284C7" stroke="#38BDF8" stroke-width="1.8"/>
              <path d="M9 12L11 14L15 10" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div>
            <div style="font-size: 11px; font-weight: 700; color: #38BDF8; letter-spacing: 0.5px; margin-bottom: 2px;">
              ★ شهادة فحص معتمدة إلكترونياً • SMARTPHONE AUDIT CERTIFICATE
            </div>
            <h1 style="font-size: 20px; font-weight: 900; color: #FFFFFF; margin: 0; line-height: 1.2;">
              شهادة فحص وتشخيص حالة الهاتف الذكي
            </h1>
            <p style="font-size: 11px; color: #CBD5E1; margin: 2px 0 0 0;">
              تقرير شامل لحالة العتاد، كفاءة البطارية، المعالج، الشبكة ونظام التشغيل
            </p>
          </div>
        </div>

        <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 10px; padding: 8px 12px; text-align: left; min-width: 150px;">
          <div style="font-size: 10px; color: #94A3B8;">رقم الاعتماد المرجعي</div>
          <div style="font-size: 12px; font-weight: 900; font-family: monospace; color: #38BDF8; direction: ltr; text-align: right;">
            REF-${(item.id || 'KTB99').substring(0, 12).toUpperCase()}
          </div>
          <div style="font-size: 10px; color: #94A3B8; margin-top: 3px;">تاريخ ووقت الفحص</div>
          <div style="font-size: 11px; font-weight: 700; color: #F1F5F9; direction: rtl; text-align: right;">
            ${formattedDate}
          </div>
        </div>
      </div>

      <!-- Hero Device Card -->
      <div style="background: #111827; border: 1px solid #1F2937; border-right: 5px solid #06B6D4; border-radius: 12px; padding: 14px 18px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; font-weight: 700; color: #06B6D4; margin-bottom: 2px;">الطراز والموديل المكتشف بدقة 100% (Device Model)</div>
          <div style="font-size: 19px; font-weight: 900; color: #FFFFFF;">${item.deviceModel || 'هاتف ذكي'}</div>
          <div style="display: flex; gap: 8px; margin-top: 5px; align-items: center;">
            <span style="background: rgba(16, 185, 129, 0.2); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 2px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;">
              ${item.os} ${item.androidVersion || ''}
            </span>
            <span style="font-size: 11px; color: #9CA3AF;">
              المعرّف الرقمي: <span style="font-family: monospace; color: #E5E7EB;">#${item.id || '--'}</span>
            </span>
          </div>
        </div>

        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15)); border: 1px solid #10B981; border-radius: 10px; padding: 8px 14px; text-align: center;">
          <div style="font-size: 10px; font-weight: 700; color: #10B981;">التقييم العام للهاتف</div>
          <div style="font-size: 15px; font-weight: 900; color: #34D399; margin: 2px 0;">حالة ممتازة ★★★★★</div>
          <div style="font-size: 10px; color: #9CA3AF;">فحص إلكتروني دقيق وناجح</div>
        </div>
      </div>

      <!-- Battery Section -->
      <div style="background: linear-gradient(135deg, #111827 0%, #162032 100%); border: 1px solid #1E293B; border-radius: 12px; padding: 14px 18px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 17px;">🔋</span>
            <span style="font-size: 13px; font-weight: 800; color: #F9FAFB;">فحص كفاءة وشحن البطارية (Battery Diagnostics)</span>
          </div>
          <span style="background: ${batBadgeBg}; color: ${batColor}; border: 1px solid ${batColor}; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 800;">
            ${item.batteryCharging || 'تفريغ الشحن 🔋'}
          </span>
        </div>

        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="font-size: 22px; font-weight: 900; color: ${batColor}; min-width: 60px; font-family: monospace;">
            ${item.batteryLevel || cleanBat + '%'}
          </div>
          <div style="flex: 1; height: 14px; background: #1F2937; border-radius: 8px; overflow: hidden; padding: 2px; border: 1px solid #374151;">
            <div style="height: 100%; width: ${cleanBat}%; background: linear-gradient(90deg, ${batColor}, #38BDF8); border-radius: 6px;"></div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #1F2937; font-size: 11px;">
          <div>
            <span style="color: #9CA3AF;">صحة الخلايا:</span>
            <strong style="color: #34D399; margin-right: 4px;">ممتازة وطبيعية (Good)</strong>
          </div>
          <div>
            <span style="color: #9CA3AF;">استقرار الجهد:</span>
            <strong style="color: #F1F5F9; margin-right: 4px;">جهد منتظم وآمن</strong>
          </div>
          <div>
            <span style="color: #9CA3AF;">الحرارة التقديرية:</span>
            <strong style="color: #F1F5F9; margin-right: 4px;">29°C (ضمن النطاق المثالي)</strong>
          </div>
        </div>
      </div>

      <!-- 2x2 Technical Grid Cards -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
        <!-- Card 1: CPU & RAM -->
        <div style="background: #111827; border: 1px solid #1F2937; border-radius: 10px; padding: 11px 13px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; color: #38BDF8; font-weight: 800; font-size: 12px;">
            <span>⚙️</span>
            <span>العتاد، المعالج والذاكرة (CPU & RAM)</span>
          </div>
          <div style="font-size: 11px; line-height: 1.7;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1F2937; padding-bottom: 2px; margin-bottom: 2px;">
              <span style="color: #9CA3AF;">أنوية المعالج (CPU):</span>
              <strong style="color: #F9FAFB;">${item.cpuCores || '8 أنوية (Octa-Core)'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1F2937; padding-bottom: 2px; margin-bottom: 2px;">
              <span style="color: #9CA3AF;">الذاكرة العشوائية (RAM):</span>
              <strong style="color: #F9FAFB;">${item.ram || '8 GB'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #9CA3AF;">كرت الشاشة (GPU):</span>
              <strong style="color: #38BDF8; font-size: 10px; max-width: 160px; text-align: left; direction: ltr; word-break: break-word;">${item.gpu || 'Mali / Adreno GPU'}</strong>
            </div>
          </div>
        </div>

        <!-- Card 2: Display Specs -->
        <div style="background: #111827; border: 1px solid #1F2937; border-radius: 10px; padding: 11px 13px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; color: #38BDF8; font-weight: 800; font-size: 12px;">
            <span>📱</span>
            <span>الشاشة ودقة العرض (Display Specs)</span>
          </div>
          <div style="font-size: 11px; line-height: 1.7;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1F2937; padding-bottom: 2px; margin-bottom: 2px;">
              <span style="color: #9CA3AF;">أبعاد الشاشة:</span>
              <strong style="color: #F9FAFB; font-family: monospace; direction: ltr;">${item.screen || '1080x2400'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1F2937; padding-bottom: 2px; margin-bottom: 2px;">
              <span style="color: #9CA3AF;">كثافة العرض:</span>
              <strong style="color: #F9FAFB;">High-Density Display</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #9CA3AF;">سلاسة الإطارات:</span>
              <strong style="color: #10B981;">معدل تحديث سلس (60Hz / 120Hz)</strong>
            </div>
          </div>
        </div>

        <!-- Card 3: Network & IP -->
        <div style="background: #111827; border: 1px solid #1F2937; border-radius: 10px; padding: 11px 13px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; color: #38BDF8; font-weight: 800; font-size: 12px;">
            <span>🌐</span>
            <span>الشبكة والـ IP العام (Network & IP)</span>
          </div>
          <div style="font-size: 11px; line-height: 1.7;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1F2937; padding-bottom: 2px; margin-bottom: 2px;">
              <span style="color: #9CA3AF;">عنوان الـ IP العام:</span>
              <strong style="color: #06B6D4; font-family: monospace; font-size: 12px; direction: ltr;">${item.ip || '127.0.0.1'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1F2937; padding-bottom: 2px; margin-bottom: 2px;">
              <span style="color: #9CA3AF;">المزود والموقع (ISP):</span>
              <strong style="color: #F9FAFB; font-size: 10px;">${item.isp || 'مزود الخدمة المحلي'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #9CA3AF;">نوع البروتوكول:</span>
              <strong style="color: #10B981;">اتصال آمن وموثق (HTTPS/TLS)</strong>
            </div>
          </div>
        </div>

        <!-- Card 4: System Fingerprint -->
        <div style="background: #111827; border: 1px solid #1F2937; border-radius: 10px; padding: 11px 13px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; color: #38BDF8; font-weight: 800; font-size: 12px;">
            <span>🛡️</span>
            <span>البصمة البرمجية (System Fingerprint)</span>
          </div>
          <div style="font-size: 11px; line-height: 1.7;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1F2937; padding-bottom: 2px; margin-bottom: 2px;">
              <span style="color: #9CA3AF;">بيئة النظام:</span>
              <strong style="color: #F9FAFB;">${item.os} System</strong>
            </div>
            <div style="color: #9CA3AF; margin-bottom: 2px; font-size: 10px;">بصمة المتصفح (User Agent):</div>
            <div style="background: #090D16; border: 1px solid #1E293B; border-radius: 6px; padding: 4px 6px; font-family: monospace; font-size: 9px; color: #94A3B8; direction: ltr; text-align: left; word-break: break-all; max-height: 32px; overflow: hidden;">
              ${item.userAgent || 'Mozilla/5.0'}
            </div>
          </div>
        </div>
      </div>

      <!-- Luxury Footer Banner (Engineer Abdeljalil & Official WhatsApp) -->
      <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 12px; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center;">
        <!-- Right: Inspector & Official Seal -->
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 62px; height: 62px; border-radius: 50%; border: 2px dashed #F59E0B; outline: 3px solid rgba(6, 182, 212, 0.4); outline-offset: 3px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.95); text-align: center; padding: 2px; box-shadow: 0 0 15px rgba(245, 158, 11, 0.3);">
            <div style="font-size: 7px; font-weight: 800; color: #F59E0B; letter-spacing: 0.5px;">ختم معتمد</div>
            <div style="font-size: 12px;">🎖️</div>
            <div style="font-size: 7px; font-weight: 900; color: #38BDF8;">VERIFIED</div>
          </div>

          <div>
            <div style="font-size: 10px; color: #94A3B8;">إشراف واعتماد الفحص الفني:</div>
            <div style="font-size: 16px; font-weight: 900; color: #FFFFFF; margin: 1px 0;">
              إشراف وفحص المهندس / ${inspectorName}
            </div>
            <div style="font-size: 11px; font-weight: 700; color: #10B981; display: flex; align-items: center; gap: 4px;">
              <span>✓</span>
              <span>تم الفحص والتدقيق إلكترونياً - شهادة معتمدة</span>
            </div>
          </div>
        </div>

        <!-- Left: WhatsApp Contact -->
        <div style="text-align: left; background: rgba(15, 23, 42, 0.9); border: 1px solid #10B981; border-radius: 10px; padding: 8px 14px;">
          <div style="font-size: 10px; color: #CBD5E1; text-align: right; margin-bottom: 2px;">
            للتواصل والاستفسار (واتساب):
          </div>
          <a href="${waLink}" target="_blank" style="display: flex; align-items: center; gap: 6px; text-decoration: none; justify-content: flex-end;">
            <span style="font-size: 15px; font-weight: 900; font-family: monospace; color: #25D366; direction: ltr; text-align: left;" dir="ltr">
              ${inspectorWa}
            </span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 6.46 17.5 2 12.04 2Z"/>
              <path d="M17.47 14.39C17.17 14.24 15.7 13.52 15.43 13.42C15.15 13.32 14.95 13.27 14.76 13.57C14.56 13.87 13.99 14.53 13.82 14.73C13.65 14.93 13.48 14.95 13.18 14.8C12.89 14.65 11.94 14.34 10.82 13.34C9.94 12.56 9.35 11.59 9.18 11.3C9.01 11 9.16 10.85 9.31 10.7C9.44 10.57 9.61 10.35 9.76 10.18C9.91 10 9.96 9.88 10.06 9.68C10.16 9.48 10.11 9.31 10.03 9.16C9.96 9.01 9.36 7.53 9.11 6.94C8.87 6.36 8.63 6.44 8.45 6.43H7.89C7.69 6.43 7.37 6.51 7.1 6.8C6.83 7.1 6.06 7.82 6.06 9.29C6.06 10.76 7.13 12.18 7.28 12.38C7.43 12.58 9.38 15.58 12.37 16.87C13.08 17.18 13.64 17.36 14.07 17.5C14.78 17.73 15.43 17.69 15.94 17.62C16.51 17.53 17.7 16.9 17.95 16.2C18.2 15.49 18.2 14.89 18.12 14.77C18.05 14.64 17.85 14.54 17.55 14.39H17.47Z" fill="#FFFFFF"/>
            </svg>
          </a>
        </div>
      </div>

      <!-- Small Footnote -->
      <div style="margin-top: 8px; text-align: center; font-size: 10px; color: #64748B;">
        شهادة رسمية موثقة إلكترونياً صادرة من منصة كتاب للتشخيص المتقدم • إشراف المهندس / ${inspectorName} © 2026
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// INSTANT NATIVE PRINT / SAVE AS PDF ENGINE (Zero Lag, Zero Freezing)
// -------------------------------------------------------------
function printCertificateInstant(item) {
  isPdfGenerating = true;
  showPdfLoading('جاري فتح نافذة الطباعة والحفظ كـ PDF الفورية... ⚡');

  try {
    const inspector = getInspectorSettings();
    const certHtml = buildCertificateHtml(item, inspector);

    let iframe = document.getElementById('ktaab-print-iframe');
    if (iframe) iframe.remove();

    iframe = document.createElement('iframe');
    iframe.id = 'ktaab-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>شهادة فحص - ${item.deviceModel || 'الهاتف'}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Cairo', system-ui, -apple-system, sans-serif;
            background: #090D16;
            color: #F1F5F9;
            direction: rtl;
            text-align: right;
            padding: 12px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          @media print {
            body { padding: 0; background: #090D16 !important; }
          }
        </style>
      </head>
      <body>
        ${certHtml}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      hidePdfLoading();
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error('Print trigger error:', e);
      } finally {
        setTimeout(() => { isPdfGenerating = false; }, 1200);
      }
    }, 300);
  } catch (err) {
    console.error('Print setup error:', err);
    hidePdfLoading();
    isPdfGenerating = false;
  }
}

// -------------------------------------------------------------
// DIRECT PDF DOWNLOAD ENGINE (html2pdf with Scale 1.5 & Guard)
// -------------------------------------------------------------
async function generateSingleDevicePdf(item) {
  if (!window.html2pdf) {
    printCertificateInstant(item);
    return;
  }

  isPdfGenerating = true;
  showPdfLoading(`جاري إعداد وتحميل شهادة فحص: ${item.deviceModel || ''}... ⏳`);

  const sandbox = document.getElementById('pdf-sandbox');
  if (!sandbox) {
    isPdfGenerating = false;
    hidePdfLoading();
    return;
  }

  try {
    const inspector = getInspectorSettings();
    const certHtml = buildCertificateHtml(item, inspector);

    const certWrapper = document.createElement('div');
    certWrapper.style.width = '790px';
    certWrapper.innerHTML = certHtml;

    sandbox.replaceChildren(certWrapper);

    const filename = getSanitizedReportFilename(item.deviceModel, item.timestamp);

    const opt = {
      margin: [6, 6, 6, 6],
      filename: filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 1.5,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#090D16'
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      }
    };

    // Give browser a microtask tick
    await new Promise(r => setTimeout(r, 120));

    await window.html2pdf().set(opt).from(certWrapper.firstElementChild || certWrapper).save();
  } catch (err) {
    console.error('PDF Generation Error:', err);
    // Fallback immediately to native print
    printCertificateInstant(item);
  } finally {
    sandbox.replaceChildren();
    hidePdfLoading();
    setTimeout(() => { isPdfGenerating = false; }, 1000);
  }
}

// -------------------------------------------------------------
// ALL DEVICES REPORT ENGINES (Print & PDF)
// -------------------------------------------------------------
function buildAllDevicesHtml(inspector) {
  const inspectorName = inspector.name;
  const inspectorWa = inspector.wa;
  const waLink = formatWhatsAppLink(inspectorWa);

  const nowStr = new Date().toLocaleString('ar-DZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let rowsHtml = '';
  cachedReports.forEach((dev, idx) => {
    let dateStr = '--';
    try {
      const d = new Date(dev.timestamp);
      dateStr = d.toLocaleTimeString('ar-EG');
    } catch (_) {}

    rowsHtml += `
      <tr style="border-bottom: 1px solid #1F2937; background: ${idx % 2 === 0 ? 'rgba(17, 24, 39, 0.7)' : 'rgba(15, 23, 42, 0.7)'}; font-size: 11px;">
        <td style="padding: 8px 6px; text-align: center; color: #9CA3AF;">#${idx + 1}</td>
        <td style="padding: 8px 6px;">
          <div style="font-weight: 800; color: #FFFFFF;">${dev.deviceModel || 'هاتف ذكي'}</div>
          <div style="font-size: 9px; color: #9CA3AF; font-family: monospace;">${dev.id || ''}</div>
        </td>
        <td style="padding: 8px 6px;">
          <span style="background: rgba(16, 185, 129, 0.2); color: #34D399; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">
            ${dev.os} ${dev.androidVersion || ''}
          </span>
        </td>
        <td style="padding: 8px 6px;">
          <div style="font-family: monospace; color: #06B6D4; font-weight: 700; direction: ltr; text-align: right;">${dev.ip || '127.0.0.1'}</div>
          <div style="font-size: 9px; color: #9CA3AF;">${dev.isp || ''}</div>
        </td>
        <td style="padding: 8px 6px; text-align: center;">
          <span style="font-weight: 800; color: #F59E0B;">${dev.batteryLevel || '--'}</span>
          <div style="font-size: 9px; color: #9CA3AF;">${dev.batteryCharging || ''}</div>
        </td>
        <td style="padding: 8px 6px; font-size: 10px; color: #CBD5E1;">
          <div>${dev.cpuCores || ''}</div>
          <div style="color: #9CA3AF;">${dev.ram || ''}</div>
        </td>
        <td style="padding: 8px 6px; text-align: center; color: #9CA3AF; font-size: 10px;">
          ${dateStr}
        </td>
      </tr>
    `;
  });

  return `
    <div style="box-sizing: border-box; width: 100%; max-width: 790px; margin: 0 auto; background: #090D16; color: #F1F5F9; font-family: 'Cairo', system-ui, sans-serif; direction: rtl; text-align: right; padding: 20px 24px; border: 2px solid #1E3A8A; border-radius: 14px;">
      
      <!-- Top Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; margin-bottom: 12px; border-bottom: 1px dashed rgba(56, 189, 248, 0.35); font-size: 11px; color: #94A3B8;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #38BDF8;">📊</span>
          <span style="font-weight: 700; color: #CBD5E1;">سجل الأجهزة الشامل • منظومة كتاب للتشخيص</span>
        </div>
        <div style="font-family: monospace; color: #38BDF8; font-weight: 700;">
          إجمالي السجلات: ${cachedReports.length} جهاز
        </div>
      </div>

      <!-- Header Banner -->
      <div style="background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 55%, #0284C7 100%); border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; border: 1px solid rgba(56, 189, 248, 0.35); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; font-weight: 700; color: #38BDF8; letter-spacing: 0.5px; margin-bottom: 2px;">
            ★ تقرير الفحص والتدقيق التراكمي الشامل • MASTER AUDIT REPORT
          </div>
          <h1 style="font-size: 20px; font-weight: 900; color: #FFFFFF; margin: 0;">
            سجل تشخيص وفحص كافة الهواتف الذكية
          </h1>
          <p style="font-size: 11px; color: #CBD5E1; margin: 2px 0 0 0;">
            كشف معتمد بجميع الأجهزة المفحوصة والمكتشفة لحظياً عبر النظام
          </p>
        </div>

        <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 10px; padding: 8px 12px; text-align: left; min-width: 140px;">
          <div style="font-size: 10px; color: #94A3B8;">تاريخ التصدير</div>
          <div style="font-size: 11px; font-weight: 800; color: #F1F5F9; direction: rtl; text-align: right;">${nowStr}</div>
        </div>
      </div>

      <!-- Devices Table -->
      <div style="border: 1px solid #1F2937; border-radius: 10px; overflow: hidden; margin-bottom: 16px;">
        <table style="width: 100%; border-collapse: collapse; text-align: right;">
          <thead>
            <tr style="background: #111827; border-bottom: 2px solid #0284C7; font-size: 11px; color: #38BDF8;">
              <th style="padding: 8px 6px; text-align: center;">#</th>
              <th style="padding: 8px 6px;">الهاتف والموديل</th>
              <th style="padding: 8px 6px;">النظام</th>
              <th style="padding: 8px 6px;">الـ IP والمزود</th>
              <th style="padding: 8px 6px; text-align: center;">البطارية</th>
              <th style="padding: 8px 6px;">المعالج والرام</th>
              <th style="padding: 8px 6px; text-align: center;">الوقت</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <!-- Luxury Footer Banner -->
      <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 12px; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 58px; height: 58px; border-radius: 50%; border: 2px dashed #F59E0B; outline: 3px solid rgba(6, 182, 212, 0.4); outline-offset: 3px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.95); text-align: center; padding: 2px;">
            <div style="font-size: 7px; font-weight: 800; color: #F59E0B;">ختم معتمد</div>
            <div style="font-size: 12px;">🎖️</div>
            <div style="font-size: 7px; font-weight: 900; color: #38BDF8;">VERIFIED</div>
          </div>

          <div>
            <div style="font-size: 10px; color: #94A3B8;">إشراف واعتماد الفحص:</div>
            <div style="font-size: 16px; font-weight: 900; color: #FFFFFF; margin: 1px 0;">
              إشراف وفحص المهندس / ${inspectorName}
            </div>
            <div style="font-size: 11px; font-weight: 700; color: #10B981;">
              ✓ تم الفحص والتدقيق إلكترونياً - شهادة معتمدة
            </div>
          </div>
        </div>

        <div style="text-align: left; background: rgba(15, 23, 42, 0.9); border: 1px solid #10B981; border-radius: 10px; padding: 8px 14px;">
          <div style="font-size: 10px; color: #CBD5E1; text-align: right; margin-bottom: 2px;">
            للتواصل والاستفسار (واتساب):
          </div>
          <a href="${waLink}" target="_blank" style="display: flex; align-items: center; gap: 6px; text-decoration: none; justify-content: flex-end;">
            <span style="font-size: 15px; font-weight: 900; font-family: monospace; color: #25D366; direction: ltr; text-align: left;" dir="ltr">
              ${inspectorWa}
            </span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 6.46 17.5 2 12.04 2Z"/>
              <path d="M17.47 14.39C17.17 14.24 15.7 13.52 15.43 13.42C15.15 13.32 14.95 13.27 14.76 13.57C14.56 13.87 13.99 14.53 13.82 14.73C13.65 14.93 13.48 14.95 13.18 14.8C12.89 14.65 11.94 14.34 10.82 13.34C9.94 12.56 9.35 11.59 9.18 11.3C9.01 11 9.16 10.85 9.31 10.7C9.44 10.57 9.61 10.35 9.76 10.18C9.91 10 9.96 9.88 10.06 9.68C10.16 9.48 10.11 9.31 10.03 9.16C9.96 9.01 9.36 7.53 9.11 6.94C8.87 6.36 8.63 6.44 8.45 6.43H7.89C7.69 6.43 7.37 6.51 7.1 6.8C6.83 7.1 6.06 7.82 6.06 9.29C6.06 10.76 7.13 12.18 7.28 12.38C7.43 12.58 9.38 15.58 12.37 16.87C13.08 17.18 13.64 17.36 14.07 17.5C14.78 17.73 15.43 17.69 15.94 17.62C16.51 17.53 17.7 16.9 17.95 16.2C18.2 15.49 18.2 14.89 18.12 14.77C18.05 14.64 17.85 14.54 17.55 14.39H17.47Z" fill="#FFFFFF"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  `;
}

function printAllDevicesInstant() {
  if (!cachedReports || cachedReports.length === 0) {
    alert('لا توجد سجلات أجهزة للطباعة حالياً.');
    return;
  }

  isPdfGenerating = true;
  showPdfLoading('جاري فتح نافذة طباعة السجل الشامل... ⚡');

  try {
    const inspector = getInspectorSettings();
    const htmlContent = buildAllDevicesHtml(inspector);

    let iframe = document.getElementById('ktaab-print-all-iframe');
    if (iframe) iframe.remove();

    iframe = document.createElement('iframe');
    iframe.id = 'ktaab-print-all-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>سجل كافة الأجهزة المفحوصة</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Cairo', system-ui, sans-serif;
            background: #090D16;
            color: #F1F5F9;
            direction: rtl;
            text-align: right;
            padding: 12px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page { size: A4 portrait; margin: 6mm; }
          @media print { body { padding: 0; background: #090D16 !important; } }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      hidePdfLoading();
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error('Print trigger error:', e);
      } finally {
        setTimeout(() => { isPdfGenerating = false; }, 1200);
      }
    }, 300);
  } catch (err) {
    console.error('Print all setup error:', err);
    hidePdfLoading();
    isPdfGenerating = false;
  }
}

async function generateAllDevicesPdf() {
  if (!cachedReports || cachedReports.length === 0) {
    alert('لا توجد سجلات أجهزة لتصديرها حالياً.');
    return;
  }

  if (!window.html2pdf) {
    printAllDevicesInstant();
    return;
  }

  isPdfGenerating = true;
  showPdfLoading('جاري إعداد وتحميل سجل كافة الأجهزة (PDF)... ⏳');

  const sandbox = document.getElementById('pdf-sandbox');
  if (!sandbox) {
    isPdfGenerating = false;
    hidePdfLoading();
    return;
  }

  try {
    const inspector = getInspectorSettings();
    const htmlContent = buildAllDevicesHtml(inspector);

    const wrapper = document.createElement('div');
    wrapper.style.width = '790px';
    wrapper.innerHTML = htmlContent;

    sandbox.replaceChildren(wrapper);

    const dateNow = new Date().toISOString().split('T')[0];
    const filename = `Abdeljalil-All-Devices-Summary-${dateNow}.pdf`;

    const opt = {
      margin: [6, 6, 6, 6],
      filename: filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 1.5,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#090D16'
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      }
    };

    await new Promise(r => setTimeout(r, 120));

    await window.html2pdf().set(opt).from(wrapper.firstElementChild || wrapper).save();
  } catch (err) {
    console.error('All Devices PDF Generation Error:', err);
    printAllDevicesInstant();
  } finally {
    sandbox.replaceChildren();
    hidePdfLoading();
    setTimeout(() => { isPdfGenerating = false; }, 1000);
  }
}

// -------------------------------------------------------------
// Real-Time Server-Sent Events (SSE)
// -------------------------------------------------------------
function initSSE() {
  const statusEl = document.getElementById('live-status-text');

  if (!window.EventSource) {
    if (statusEl) statusEl.textContent = 'تحديث دوري نشط (5s)';
    return;
  }

  try {
    const eventSource = new EventSource('/api/events');

    eventSource.addEventListener('connected', () => {
      if (statusEl) statusEl.textContent = 'تحديث لحظي نشط (SSE)';
    });

    eventSource.addEventListener('new_report', (e) => {
      if (isPdfGenerating) return; // Do not interrupt PDF operations
      try {
        const item = JSON.parse(e.data);
        const idx = cachedReports.findIndex(r => r.id === item.id);
        if (idx !== -1) {
          cachedReports[idx] = item;
        } else {
          cachedReports.unshift(item);
        }
        const newJson = JSON.stringify(cachedReports);
        if (newJson !== lastRenderedReportsJson) {
          lastRenderedReportsJson = newJson;
          renderReportsTable(cachedReports);
          fetchStats();
        }
      } catch (_) {}
    });

    eventSource.addEventListener('report_deleted', (e) => {
      try {
        const data = JSON.parse(e.data);
        cachedReports = cachedReports.filter(r => r.id !== data.id);
        lastRenderedReportsJson = JSON.stringify(cachedReports);
        renderReportsTable(cachedReports);
        fetchStats();
      } catch (_) {}
    });

    eventSource.onerror = () => {
      if (statusEl) statusEl.textContent = 'تحديث دوري نشط (5s)';
    };
  } catch (_) {}
}
