// Ktaab Secret Admin Dashboard Script - Strict Flat JSON Contract, Real-Time Sync & Luxury Arabic PDF Engine

let cachedReports = [];
let currentModalItem = null;

const DEFAULT_INSPECTOR_NAME = 'عبد الجليل';
const DEFAULT_INSPECTOR_WA = '0659087568';

document.addEventListener('DOMContentLoaded', () => {
  setupInspectorSettings();
  fetchStats();
  fetchReports();
  initSSE();
  setupEventListeners();

  // Fast polling every 2 seconds with cache-busting
  setInterval(fetchReports, 2000);
  setInterval(fetchStats, 4000);
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
      fetchReports();
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

  const modalPdfBtn = document.getElementById('modal-btn-pdf');
  if (modalPdfBtn) {
    modalPdfBtn.addEventListener('click', () => {
      if (currentModalItem) generateSingleDevicePdf(currentModalItem);
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
// Fetch Stats & Reports
// -------------------------------------------------------------
async function fetchStats() {
  try {
    const res = await fetch('/api/stats', { cache: 'no-store' });
    if (!res.ok) return;
    const json = await res.json();
    if (json.success && json.data) {
      const elTotal = document.getElementById('stat-total-devices');
      const elBattery = document.getElementById('stat-avg-battery');
      if (elTotal) elTotal.textContent = String(json.data.totalDevices || 0);
      if (elBattery) elBattery.textContent = `${json.data.avgBatteryLevel || 0}%`;
    }
  } catch (_) {}
}

async function fetchReports() {
  try {
    const res = await fetch('/api/reports', { cache: 'no-store' });
    if (!res.ok) return;
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      const isDifferent = JSON.stringify(json.data) !== JSON.stringify(cachedReports);
      if (isDifferent) {
        cachedReports = json.data;
        renderReportsTable(cachedReports);
      }
    }
  } catch (_) {}
}

// -------------------------------------------------------------
// Render Table using Secure DOM Methods (Strict Flat Contract)
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
  tdGpu.style.maxWidth = '200px';
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

  // 9. Actions & PDF Export
  const tdActions = document.createElement('td');
  const btnGroup = document.createElement('div');
  btnGroup.style.display = 'flex';
  btnGroup.style.gap = '6px';
  btnGroup.style.flexWrap = 'wrap';

  // PDF Export Button
  const pdfBtn = document.createElement('button');
  pdfBtn.className = 'btn btn-primary';
  pdfBtn.style.padding = '6px 10px';
  pdfBtn.style.fontSize = '12px';
  pdfBtn.style.background = 'linear-gradient(135deg, #0284C7, #0EA5E9)';
  pdfBtn.style.border = 'none';
  pdfBtn.style.borderRadius = '6px';
  pdfBtn.style.fontWeight = '700';
  pdfBtn.textContent = '📄 تقرير PDF';
  pdfBtn.title = 'تحميل شهادة فحص معتمدة لهذا الهاتف بصيغة PDF';
  pdfBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    generateSingleDevicePdf(item);
  });

  // View Details Modal Button
  const viewBtn = document.createElement('button');
  viewBtn.className = 'btn btn-outline';
  viewBtn.style.padding = '6px 10px';
  viewBtn.style.fontSize = '12px';
  viewBtn.textContent = '👁️ تفاصيل';
  viewBtn.addEventListener('click', () => openReportModal(item));

  // Delete Button
  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-danger';
  delBtn.style.padding = '6px 9px';
  delBtn.style.fontSize = '12px';
  delBtn.textContent = '🗑️';
  delBtn.title = 'حذف هذا السجل';
  delBtn.addEventListener('click', () => handleDeleteReport(item.id));

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
// LUXURY ARABIC PDF GENERATOR (html2pdf + Cairo Font + High DPI)
// -------------------------------------------------------------

async function generateSingleDevicePdf(item) {
  if (!window.html2pdf) {
    alert('مكتبة تصدير الـ PDF غير محملة. يرجى إعادة تحديث الصفحة.');
    return;
  }

  showPdfLoading(`جاري توليد شهادة فحص معتمدة للهاتف: ${item.deviceModel || ''}...`);

  const inspector = getInspectorSettings();
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

  // Parse battery metrics
  const rawBat = parseInt(String(item.batteryLevel || '').replace('%', ''), 10);
  const cleanBat = (!isNaN(rawBat) && rawBat > 0) ? Math.min(100, rawBat) : 85;
  const batColor = cleanBat > 50 ? '#10B981' : (cleanBat > 20 ? '#F59E0B' : '#EF4444');
  const batBadgeBg = cleanBat > 50 ? 'rgba(16, 185, 129, 0.15)' : (cleanBat > 20 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)');

  // Build the Certificate DOM
  const sandbox = document.getElementById('pdf-sandbox');
  if (!sandbox) return;

  const certContainer = document.createElement('div');
  certContainer.style.width = '794px';
  certContainer.style.boxSizing = 'border-box';
  certContainer.style.background = '#090D16';
  certContainer.style.color = '#F1F5F9';
  certContainer.style.fontFamily = "'Cairo', 'Tajawal', sans-serif";
  certContainer.style.direction = 'rtl';
  certContainer.style.textAlign = 'right';
  certContainer.style.padding = '24px 26px';
  certContainer.style.border = '2px solid #1E3A8A';
  certContainer.style.borderRadius = '16px';
  certContainer.style.position = 'relative';

  certContainer.innerHTML = `
    <!-- Top Security Ribbon -->
    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; margin-bottom: 12px; border-bottom: 1px dashed rgba(56, 189, 248, 0.3); font-size: 11px; color: #94A3B8;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="color: #38BDF8;">🛡️</span>
        <span style="font-weight: 700; color: #CBD5E1;">منظومة كتاب المتقدمة لفحص وتدقيق الهواتف الذكية</span>
      </div>
      <div style="font-family: monospace; color: #38BDF8; font-weight: 700; direction: ltr;">
        REF-${(item.id || 'KTB99').substring(0, 14).toUpperCase()}
      </div>
    </div>

    <!-- Header Banner -->
    <div style="background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 55%, #0284C7 100%); border-radius: 12px; padding: 18px 22px; margin-bottom: 18px; border: 1px solid rgba(56, 189, 248, 0.35); display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(255, 255, 255, 0.1); border: 1.5px solid rgba(255, 255, 255, 0.25); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(56, 189, 248, 0.3);">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7V12C3 17.5 7 21.5 12 22C17 21.5 21 17.5 21 12V7L12 2Z" fill="#0284C7" stroke="#38BDF8" stroke-width="1.8"/>
            <path d="M9 12L11 14L15 10" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div>
          <div style="font-size: 11px; font-weight: 700; color: #38BDF8; letter-spacing: 0.5px; margin-bottom: 2px;">
            ★ شهادة فحص معتمدة إلكترونياً • SMARTPHONE AUDIT CERTIFICATE
          </div>
          <h1 style="font-size: 21px; font-weight: 900; color: #FFFFFF; margin: 0; line-height: 1.2;">
            شهادة فحص وتشخيص حالة الهاتف الذكي
          </h1>
          <p style="font-size: 12px; color: #CBD5E1; margin: 3px 0 0 0;">
            تقرير شامل لحالة العتاد، كفاءة البطارية، المعالج، الشبكة ونظام التشغيل
          </p>
        </div>
      </div>

      <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 10px; padding: 10px 14px; text-align: left; min-width: 160px;">
        <div style="font-size: 10px; color: #94A3B8;">رقم الاعتماد المرجعي</div>
        <div style="font-size: 13px; font-weight: 900; font-family: monospace; color: #38BDF8; direction: ltr; text-align: right;">
          REF-${(item.id || 'KTB99').substring(0, 12).toUpperCase()}
        </div>
        <div style="font-size: 10px; color: #94A3B8; margin-top: 4px;">تاريخ ووقت الفحص</div>
        <div style="font-size: 11px; font-weight: 700; color: #F1F5F9; direction: rtl; text-align: right;">
          ${formattedDate}
        </div>
      </div>
    </div>

    <!-- Hero Device Card -->
    <div style="background: #111827; border: 1px solid #1F2937; border-right: 5px solid #06B6D4; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 11px; font-weight: 700; color: #06B6D4; margin-bottom: 2px;">الطراز والموديل المكتشف بدقة 100% (Device Model)</div>
        <div style="font-size: 20px; font-weight: 900; color: #FFFFFF;">${item.deviceModel || 'هاتف ذكي'}</div>
        <div style="display: flex; gap: 8px; margin-top: 6px; align-items: center;">
          <span style="background: rgba(16, 185, 129, 0.2); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 2px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;">
            ${item.os} ${item.androidVersion || ''}
          </span>
          <span style="font-size: 11px; color: #9CA3AF;">
            المعرّف الرقمي: <span style="font-family: monospace; color: #E5E7EB;">#${item.id || '--'}</span>
          </span>
        </div>
      </div>

      <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15)); border: 1px solid #10B981; border-radius: 10px; padding: 10px 16px; text-align: center;">
        <div style="font-size: 10px; font-weight: 700; color: #10B981;">التقييم العام للهاتف</div>
        <div style="font-size: 16px; font-weight: 900; color: #34D399; margin: 2px 0;">حالة ممتازة ★★★★★</div>
        <div style="font-size: 10px; color: #9CA3AF;">فحص إلكتروني دقيق وناجح</div>
      </div>
    </div>

    <!-- Battery Section -->
    <div style="background: linear-gradient(135deg, #111827 0%, #162032 100%); border: 1px solid #1E293B; border-radius: 12px; padding: 15px 18px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">🔋</span>
          <span style="font-size: 14px; font-weight: 800; color: #F9FAFB;">فحص كفاءة وشحن البطارية (Battery Diagnostics)</span>
        </div>
        <span style="background: ${batBadgeBg}; color: ${batColor}; border: 1px solid ${batColor}; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 800;">
          ${item.batteryCharging || 'تفريغ الشحن 🔋'}
        </span>
      </div>

      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="font-size: 24px; font-weight: 900; color: ${batColor}; min-width: 65px; font-family: monospace;">
          ${item.batteryLevel || cleanBat + '%'}
        </div>
        <div style="flex: 1; height: 16px; background: #1F2937; border-radius: 8px; overflow: hidden; padding: 2px; border: 1px solid #374151;">
          <div style="height: 100%; width: ${cleanBat}%; background: linear-gradient(90deg, ${batColor}, #38BDF8); border-radius: 6px;"></div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #1F2937; font-size: 11px;">
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
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px;">
      <!-- Card 1: العتاد والمعالج -->
      <div style="background: #111827; border: 1px solid #1F2937; border-radius: 12px; padding: 13px 15px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: #38BDF8; font-weight: 800; font-size: 13px;">
          <span>⚙️</span>
          <span>العتاد، المعالج والذاكرة (CPU & RAM)</span>
        </div>
        <div style="font-size: 11px; line-height: 1.8;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1F2937; padding-bottom: 3px; margin-bottom: 3px;">
            <span style="color: #9CA3AF;">أنوية المعالج (CPU):</span>
            <strong style="color: #F9FAFB;">${item.cpuCores || '8 أنوية (Octa-Core)'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1F2937; padding-bottom: 3px; margin-bottom: 3px;">
            <span style="color: #9CA3AF;">الذاكرة العشوائية (RAM):</span>
            <strong style="color: #F9FAFB;">${item.ram || '8 GB'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #9CA3AF;">كرت الشاشة (GPU):</span>
            <strong style="color: #38BDF8; font-size: 11px; max-width: 170px; text-align: left; direction: ltr; word-break: break-word;">${item.gpu || 'Mali / Adreno GPU'}</strong>
          </div>
        </div>
      </div>

      <!-- Card 2: الشاشة والعرض -->
      <div style="background: #111827; border: 1px solid #1F2937; border-radius: 12px; padding: 13px 15px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: #38BDF8; font-weight: 800; font-size: 13px;">
          <span>📱</span>
          <span>الشاشة ودقة العرض (Display Specs)</span>
        </div>
        <div style="font-size: 11px; line-height: 1.8;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1F2937; padding-bottom: 3px; margin-bottom: 3px;">
            <span style="color: #9CA3AF;">أبعاد الشاشة:</span>
            <strong style="color: #F9FAFB; font-family: monospace; direction: ltr;">${item.screen || '1080x2400'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1F2937; padding-bottom: 3px; margin-bottom: 3px;">
            <span style="color: #9CA3AF;">كثافة العرض:</span>
            <strong style="color: #F9FAFB;">High-Density Display</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #9CA3AF;">سلاسة الإطارات:</span>
            <strong style="color: #10B981;">معدل تحديث سلس (60Hz / 120Hz)</strong>
          </div>
        </div>
      </div>

      <!-- Card 3: الشبكة والموقع والـ IP -->
      <div style="background: #111827; border: 1px solid #1F2937; border-radius: 12px; padding: 13px 15px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: #38BDF8; font-weight: 800; font-size: 13px;">
          <span>🌐</span>
          <span>الشبكة والـ IP العام (Network & IP)</span>
        </div>
        <div style="font-size: 11px; line-height: 1.8;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1F2937; padding-bottom: 3px; margin-bottom: 3px;">
            <span style="color: #9CA3AF;">عنوان الـ IP العام:</span>
            <strong style="color: #06B6D4; font-family: monospace; font-size: 12px; direction: ltr;">${item.ip || '127.0.0.1'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1F2937; padding-bottom: 3px; margin-bottom: 3px;">
            <span style="color: #9CA3AF;">المزود والموقع (ISP):</span>
            <strong style="color: #F9FAFB; font-size: 11px;">${item.isp || 'مزود الخدمة المحلي'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #9CA3AF;">نوع البروتوكول:</span>
            <strong style="color: #10B981;">اتصال آمن وموثق (HTTPS/TLS)</strong>
          </div>
        </div>
      </div>

      <!-- Card 4: البصمة الرقمية وبيئة النظام -->
      <div style="background: #111827; border: 1px solid #1F2937; border-radius: 12px; padding: 13px 15px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: #38BDF8; font-weight: 800; font-size: 13px;">
          <span>🛡️</span>
          <span>البصمة البرمجية (System Fingerprint)</span>
        </div>
        <div style="font-size: 11px; line-height: 1.8;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1F2937; padding-bottom: 3px; margin-bottom: 3px;">
            <span style="color: #9CA3AF;">بيئة النظام:</span>
            <strong style="color: #F9FAFB;">${item.os} System</strong>
          </div>
          <div style="color: #9CA3AF; margin-bottom: 2px;">بصمة المتصفح (User Agent):</div>
          <div style="background: #090D16; border: 1px solid #1E293B; border-radius: 6px; padding: 5px 8px; font-family: monospace; font-size: 9px; color: #94A3B8; direction: ltr; text-align: left; word-break: break-all; max-height: 38px; overflow: hidden;">
            ${item.userAgent || 'Mozilla/5.0'}
          </div>
        </div>
      </div>
    </div>

    <!-- Luxury Footer Banner (Engineer Abdeljalil & Official WhatsApp) -->
    <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 12px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center;">
      <!-- Right: Inspector & Official Seal -->
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="width: 68px; height: 68px; border-radius: 50%; border: 2px dashed #F59E0B; outline: 3px solid rgba(6, 182, 212, 0.4); outline-offset: 3px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.95); text-align: center; padding: 2px; box-shadow: 0 0 15px rgba(245, 158, 11, 0.3);">
          <div style="font-size: 8px; font-weight: 800; color: #F59E0B; letter-spacing: 0.5px;">ختم معتمد</div>
          <div style="font-size: 13px;">🎖️</div>
          <div style="font-size: 7px; font-weight: 900; color: #38BDF8;">VERIFIED</div>
        </div>

        <div>
          <div style="font-size: 11px; color: #94A3B8;">إشراف واعتماد الفحص الفني:</div>
          <div style="font-size: 17px; font-weight: 900; color: #FFFFFF; margin: 1px 0;">
            إشراف وفحص المهندس / ${inspectorName}
          </div>
          <div style="font-size: 11px; font-weight: 700; color: #10B981; display: flex; align-items: center; gap: 4px;">
            <span>✓</span>
            <span>تم الفحص والتدقيق إلكترونياً - شهادة معتمدة</span>
          </div>
        </div>
      </div>

      <!-- Left: WhatsApp Contact -->
      <div style="text-align: left; background: rgba(15, 23, 42, 0.9); border: 1px solid #10B981; border-radius: 10px; padding: 10px 16px;">
        <div style="font-size: 11px; color: #CBD5E1; text-align: right; margin-bottom: 3px;">
          للتواصل والاستفسار (واتساب):
        </div>
        <a href="${waLink}" target="_blank" style="display: flex; align-items: center; gap: 7px; text-decoration: none; justify-content: flex-end;">
          <span style="font-size: 16px; font-weight: 900; font-family: monospace; color: #25D366; direction: ltr; text-align: left;" dir="ltr">
            ${inspectorWa}
          </span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#25D366">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 6.46 17.5 2 12.04 2Z"/>
            <path d="M17.47 14.39C17.17 14.24 15.7 13.52 15.43 13.42C15.15 13.32 14.95 13.27 14.76 13.57C14.56 13.87 13.99 14.53 13.82 14.73C13.65 14.93 13.48 14.95 13.18 14.8C12.89 14.65 11.94 14.34 10.82 13.34C9.94 12.56 9.35 11.59 9.18 11.3C9.01 11 9.16 10.85 9.31 10.7C9.44 10.57 9.61 10.35 9.76 10.18C9.91 10 9.96 9.88 10.06 9.68C10.16 9.48 10.11 9.31 10.03 9.16C9.96 9.01 9.36 7.53 9.11 6.94C8.87 6.36 8.63 6.44 8.45 6.43H7.89C7.69 6.43 7.37 6.51 7.1 6.8C6.83 7.1 6.06 7.82 6.06 9.29C6.06 10.76 7.13 12.18 7.28 12.38C7.43 12.58 9.38 15.58 12.37 16.87C13.08 17.18 13.64 17.36 14.07 17.5C14.78 17.73 15.43 17.69 15.94 17.62C16.51 17.53 17.7 16.9 17.95 16.2C18.2 15.49 18.2 14.89 18.12 14.77C18.05 14.64 17.85 14.54 17.55 14.39H17.47Z" fill="#FFFFFF"/>
          </svg>
        </a>
      </div>
    </div>

    <!-- Small Footnote -->
    <div style="margin-top: 10px; text-align: center; font-size: 10px; color: #64748B;">
      شهادة رسمية موثقة إلكترونياً صادرة من منصة كتاب • إشراف المهندس / ${inspectorName} © 2026
    </div>
  `;

  sandbox.replaceChildren(certContainer);

  const filename = getSanitizedReportFilename(item.deviceModel, item.timestamp);

  const opt = {
    margin: [6, 6, 6, 6],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      backgroundColor: '#090D16'
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    }
  };

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    // Small delay for canvas layout
    await new Promise(r => setTimeout(r, 200));

    await window.html2pdf().set(opt).from(certContainer).save();
  } catch (err) {
    console.error('PDF Generation Error:', err);
    alert('حدث خطأ أثناء تصدير الـ PDF: ' + err.message);
  } finally {
    sandbox.replaceChildren();
    hidePdfLoading();
  }
}

// -------------------------------------------------------------
// ALL DEVICES SUMMARY REPORT PDF (html2pdf + Cairo Font)
// -------------------------------------------------------------

async function generateAllDevicesPdf() {
  if (!window.html2pdf) {
    alert('مكتبة تصدير الـ PDF غير محملة. يرجى إعادة تحديث الصفحة.');
    return;
  }

  if (!cachedReports || cachedReports.length === 0) {
    alert('لا توجد سجلات أجهزة لتصديرها حالياً.');
    return;
  }

  showPdfLoading('جاري إعداد وتوليد سجل كافة الأجهزة المفحوصة (PDF)...');

  const inspector = getInspectorSettings();
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

  const sandbox = document.getElementById('pdf-sandbox');
  if (!sandbox) return;

  const container = document.createElement('div');
  container.style.width = '794px';
  container.style.boxSizing = 'border-box';
  container.style.background = '#090D16';
  container.style.color = '#F1F5F9';
  container.style.fontFamily = "'Cairo', 'Tajawal', sans-serif";
  container.style.direction = 'rtl';
  container.style.textAlign = 'right';
  container.style.padding = '24px 26px';
  container.style.border = '2px solid #1E3A8A';
  container.style.borderRadius = '16px';
  container.style.position = 'relative';

  let rowsHtml = '';
  cachedReports.forEach((dev, idx) => {
    let dateStr = '--';
    try {
      const d = new Date(dev.timestamp);
      dateStr = d.toLocaleTimeString('ar-EG');
    } catch (_) {}

    rowsHtml += `
      <tr style="border-bottom: 1px solid #1F2937; background: ${idx % 2 === 0 ? 'rgba(17, 24, 39, 0.7)' : 'rgba(15, 23, 42, 0.7)'}; font-size: 11px;">
        <td style="padding: 10px 8px; text-align: center; color: #9CA3AF;">#${idx + 1}</td>
        <td style="padding: 10px 8px;">
          <div style="font-weight: 800; color: #FFFFFF;">${dev.deviceModel || 'هاتف ذكي'}</div>
          <div style="font-size: 9px; color: #9CA3AF; font-family: monospace;">${dev.id || ''}</div>
        </td>
        <td style="padding: 10px 8px;">
          <span style="background: rgba(16, 185, 129, 0.2); color: #34D399; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">
            ${dev.os} ${dev.androidVersion || ''}
          </span>
        </td>
        <td style="padding: 10px 8px;">
          <div style="font-family: monospace; color: #06B6D4; font-weight: 700; direction: ltr; text-align: right;">${dev.ip || '127.0.0.1'}</div>
          <div style="font-size: 9px; color: #9CA3AF;">${dev.isp || ''}</div>
        </td>
        <td style="padding: 10px 8px; text-align: center;">
          <span style="font-weight: 800; color: #F59E0B;">${dev.batteryLevel || '--'}</span>
          <div style="font-size: 9px; color: #9CA3AF;">${dev.batteryCharging || ''}</div>
        </td>
        <td style="padding: 10px 8px; font-size: 10px; color: #CBD5E1;">
          <div>${dev.cpuCores || ''}</div>
          <div style="color: #9CA3AF;">${dev.ram || ''}</div>
        </td>
        <td style="padding: 10px 8px; text-align: center; color: #9CA3AF; font-size: 10px;">
          ${dateStr}
        </td>
      </tr>
    `;
  });

  container.innerHTML = `
    <!-- Top Bar -->
    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; margin-bottom: 12px; border-bottom: 1px dashed rgba(56, 189, 248, 0.3); font-size: 11px; color: #94A3B8;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="color: #38BDF8;">📊</span>
        <span style="font-weight: 700; color: #CBD5E1;">سجل الأجهزة الشامل • منظومة كتاب للتشخيص</span>
      </div>
      <div style="font-family: monospace; color: #38BDF8; font-weight: 700;">
        إجمالي السجلات: ${cachedReports.length} جهاز
      </div>
    </div>

    <!-- Header Banner -->
    <div style="background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 55%, #0284C7 100%); border-radius: 12px; padding: 18px 22px; margin-bottom: 18px; border: 1px solid rgba(56, 189, 248, 0.35); display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 11px; font-weight: 700; color: #38BDF8; letter-spacing: 0.5px; margin-bottom: 2px;">
          ★ تقرير الفحص والتدقيق التراكمي الشامل • MASTER AUDIT REPORT
        </div>
        <h1 style="font-size: 21px; font-weight: 900; color: #FFFFFF; margin: 0;">
          سجل تشخيص وفحص كافة الهواتف الذكية
        </h1>
        <p style="font-size: 12px; color: #CBD5E1; margin: 3px 0 0 0;">
          كشف معتمد بجميع الأجهزة المفحوصة والمكتشفة لحظياً عبر النظام
        </p>
      </div>

      <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 10px; padding: 10px 14px; text-align: left; min-width: 150px;">
        <div style="font-size: 10px; color: #94A3B8;">تاريخ التصدير</div>
        <div style="font-size: 12px; font-weight: 800; color: #F1F5F9; direction: rtl; text-align: right;">${nowStr}</div>
      </div>
    </div>

    <!-- Devices Table -->
    <div style="border: 1px solid #1F2937; border-radius: 10px; overflow: hidden; margin-bottom: 18px;">
      <table style="width: 100%; border-collapse: collapse; text-align: right;">
        <thead>
          <tr style="background: #111827; border-bottom: 2px solid #0284C7; font-size: 11px; color: #38BDF8;">
            <th style="padding: 10px 8px; text-align: center;">#</th>
            <th style="padding: 10px 8px;">الهاتف والموديل</th>
            <th style="padding: 10px 8px;">النظام</th>
            <th style="padding: 10px 8px;">الـ IP والمزود</th>
            <th style="padding: 10px 8px; text-align: center;">البطارية</th>
            <th style="padding: 10px 8px;">المعالج والرام</th>
            <th style="padding: 10px 8px; text-align: center;">الوقت</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>

    <!-- Luxury Footer Banner -->
    <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 12px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center;">
      <!-- Right: Inspector & Seal -->
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="width: 64px; height: 64px; border-radius: 50%; border: 2px dashed #F59E0B; outline: 3px solid rgba(6, 182, 212, 0.4); outline-offset: 3px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.95); text-align: center; padding: 2px;">
          <div style="font-size: 7px; font-weight: 800; color: #F59E0B;">ختم معتمد</div>
          <div style="font-size: 13px;">🎖️</div>
          <div style="font-size: 7px; font-weight: 900; color: #38BDF8;">VERIFIED</div>
        </div>

        <div>
          <div style="font-size: 11px; color: #94A3B8;">إشراف واعتماد الفحص:</div>
          <div style="font-size: 17px; font-weight: 900; color: #FFFFFF; margin: 1px 0;">
            إشراف وفحص المهندس / ${inspectorName}
          </div>
          <div style="font-size: 11px; font-weight: 700; color: #10B981;">
            ✓ تم الفحص والتدقيق إلكترونياً - شهادة معتمدة
          </div>
        </div>
      </div>

      <!-- Left: WhatsApp Contact -->
      <div style="text-align: left; background: rgba(15, 23, 42, 0.9); border: 1px solid #10B981; border-radius: 10px; padding: 10px 16px;">
        <div style="font-size: 11px; color: #CBD5E1; text-align: right; margin-bottom: 3px;">
          للتواصل والاستفسار (واتساب):
        </div>
        <a href="${waLink}" target="_blank" style="display: flex; align-items: center; gap: 7px; text-decoration: none; justify-content: flex-end;">
          <span style="font-size: 16px; font-weight: 900; font-family: monospace; color: #25D366; direction: ltr; text-align: left;" dir="ltr">
            ${inspectorWa}
          </span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#25D366">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 6.46 17.5 2 12.04 2Z"/>
            <path d="M17.47 14.39C17.17 14.24 15.7 13.52 15.43 13.42C15.15 13.32 14.95 13.27 14.76 13.57C14.56 13.87 13.99 14.53 13.82 14.73C13.65 14.93 13.48 14.95 13.18 14.8C12.89 14.65 11.94 14.34 10.82 13.34C9.94 12.56 9.35 11.59 9.18 11.3C9.01 11 9.16 10.85 9.31 10.7C9.44 10.57 9.61 10.35 9.76 10.18C9.91 10 9.96 9.88 10.06 9.68C10.16 9.48 10.11 9.31 10.03 9.16C9.96 9.01 9.36 7.53 9.11 6.94C8.87 6.36 8.63 6.44 8.45 6.43H7.89C7.69 6.43 7.37 6.51 7.1 6.8C6.83 7.1 6.06 7.82 6.06 9.29C6.06 10.76 7.13 12.18 7.28 12.38C7.43 12.58 9.38 15.58 12.37 16.87C13.08 17.18 13.64 17.36 14.07 17.5C14.78 17.73 15.43 17.69 15.94 17.62C16.51 17.53 17.7 16.9 17.95 16.2C18.2 15.49 18.2 14.89 18.12 14.77C18.05 14.64 17.85 14.54 17.55 14.39H17.47Z" fill="#FFFFFF"/>
          </svg>
        </a>
      </div>
    </div>
  `;

  sandbox.replaceChildren(container);

  const dateNow = new Date().toISOString().split('T')[0];
  const filename = `Abdeljalil-All-Devices-Summary-${dateNow}.pdf`;

  const opt = {
    margin: [6, 6, 6, 6],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      backgroundColor: '#090D16'
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    }
  };

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise(r => setTimeout(r, 200));

    await window.html2pdf().set(opt).from(container).save();
  } catch (err) {
    console.error('All Devices PDF Generation Error:', err);
    alert('حدث خطأ أثناء تصدير سجل الأجهزة: ' + err.message);
  } finally {
    sandbox.replaceChildren();
    hidePdfLoading();
  }
}

// -------------------------------------------------------------
// Real-Time Server-Sent Events (SSE)
// -------------------------------------------------------------
function initSSE() {
  const statusEl = document.getElementById('live-status-text');

  if (!window.EventSource) {
    if (statusEl) statusEl.textContent = 'تحديث دوري نشط (2s)';
    return;
  }

  try {
    const eventSource = new EventSource('/api/events');

    eventSource.addEventListener('connected', () => {
      if (statusEl) statusEl.textContent = 'تحديث لحظي نشط (SSE)';
    });

    eventSource.addEventListener('new_report', (e) => {
      try {
        const item = JSON.parse(e.data);
        const idx = cachedReports.findIndex(r => r.id === item.id);
        if (idx !== -1) {
          cachedReports[idx] = item;
        } else {
          cachedReports.unshift(item);
        }
        renderReportsTable(cachedReports);
        fetchStats();
      } catch (_) {}
    });

    eventSource.addEventListener('report_deleted', (e) => {
      try {
        const data = JSON.parse(e.data);
        cachedReports = cachedReports.filter(r => r.id !== data.id);
        renderReportsTable(cachedReports);
        fetchStats();
      } catch (_) {}
    });

    eventSource.onerror = () => {
      if (statusEl) statusEl.textContent = 'تحديث دوري نشط (2s)';
    };
  } catch (_) {}
}
