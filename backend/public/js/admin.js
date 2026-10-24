// Ktaab Secret Admin Dashboard Script - Accurate Device Specs, Real IP/ISP & Real-Time Sync

let cachedReports = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchStats();
  fetchReports();
  initSSE();
  setupEventListeners();

  // Polling every 2 seconds with cache-busting to ensure real-time phone detection
  setInterval(fetchReports, 2000);
  setInterval(fetchStats, 4000);
});

// Event Listeners
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
    modalCloseBtn.addEventListener('click', () => {
      modalOverlay.style.display = 'none';
    });
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.style.display = 'none';
      }
    });
  }
}

// Fetch Aggregate Statistics
async function fetchStats() {
  try {
    const res = await fetch('/api/stats', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json.success && json.data) {
      renderStats(json.data);
    }
  } catch (_) {}
}

function renderStats(stats) {
  const elTotal = document.getElementById('stat-total-devices');
  const elBattery = document.getElementById('stat-avg-battery');
  const elTemp = document.getElementById('stat-avg-temp');
  const elRoot = document.getElementById('stat-root-count');

  if (elTotal) elTotal.textContent = String(stats.totalDevices || 0);
  if (elBattery) elBattery.textContent = `${stats.avgBatteryLevel || 0}%`;
  if (elTemp) elTemp.textContent = `${stats.avgBatteryTemp || 0}°C`;
  if (elRoot) elRoot.textContent = String(stats.rootedCount || 0);
}

// Fetch Reports List with no-store
async function fetchReports() {
  try {
    const res = await fetch('/api/reports', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
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

// Render Table using Secure DOM Methods (No innerHTML)
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
  tdId.textContent = `#${item.id || '--'}`;
  tr.appendChild(tdId);

  // 2. Real Model & Brand
  const tdDevice = document.createElement('td');
  const brandTitle = document.createElement('div');
  brandTitle.style.fontWeight = '700';
  brandTitle.style.fontSize = '15px';
  brandTitle.textContent = `${item.brand || 'هاتف'} ${item.model || ''}`;

  const deviceSub = document.createElement('div');
  deviceSub.style.fontSize = '11px';
  deviceSub.style.color = 'var(--text-secondary)';
  deviceSub.textContent = `معرف: ${item.device_id || '--'}`;

  tdDevice.appendChild(brandTitle);
  tdDevice.appendChild(deviceSub);
  tr.appendChild(tdDevice);

  // 3. Real OS & Version
  const tdOs = document.createElement('td');
  const osBadge = document.createElement('span');
  const osText = item.os_version || 'Android';
  osBadge.className = osText.includes('iOS') ? 'badge badge-info' : 'badge badge-success';
  osBadge.textContent = osText;
  tdOs.appendChild(osBadge);
  tr.appendChild(tdOs);

  // 4. Real IP + Country + City + ISP
  const tdIp = document.createElement('td');
  const ipText = document.createElement('div');
  ipText.style.fontWeight = '700';
  ipText.style.fontFamily = 'monospace';
  ipText.style.fontSize = '14px';
  ipText.style.color = '#06B6D4';
  ipText.textContent = item.ip_address || '127.0.0.1';
  tdIp.appendChild(ipText);

  // Geo & ISP details
  const geoDetails = [];
  if (item.city) geoDetails.push(item.city);
  if (item.country) geoDetails.push(item.country);
  
  if (geoDetails.length > 0 || item.isp) {
    const geoSub = document.createElement('div');
    geoSub.style.fontSize = '12px';
    geoSub.style.color = 'var(--text-secondary)';
    geoSub.style.marginTop = '2px';
    geoSub.textContent = `📍 ${geoDetails.join('، ')} ${item.isp ? '• ' + item.isp : ''}`;
    tdIp.appendChild(geoSub);
  }
  tr.appendChild(tdIp);

  // 5. Battery Level & Status
  const tdBattery = document.createElement('td');
  const level = Number(item.battery_level) || 0;

  if (level > 0) {
    const barContainer = document.createElement('div');
    barContainer.className = 'battery-bar-container';

    const barTrack = document.createElement('div');
    barTrack.className = 'battery-bar-track';

    const barFill = document.createElement('div');
    barFill.className = 'battery-bar-fill';
    barFill.style.width = `${Math.min(100, Math.max(0, level))}%`;

    if (level > 50) barFill.style.backgroundColor = 'var(--success)';
    else if (level > 20) barFill.style.backgroundColor = 'var(--warning)';
    else barFill.style.backgroundColor = 'var(--danger)';

    barTrack.appendChild(barFill);

    const levelText = document.createElement('span');
    levelText.style.fontWeight = '700';
    levelText.style.minWidth = '38px';
    levelText.textContent = `${level}%`;

    barContainer.appendChild(barTrack);
    barContainer.appendChild(levelText);
    tdBattery.appendChild(barContainer);

    const chgSub = document.createElement('div');
    chgSub.style.fontSize = '11px';
    chgSub.style.color = 'var(--text-secondary)';
    chgSub.style.marginTop = '4px';
    chgSub.textContent = item.charging_type || item.battery_status || '';
    tdBattery.appendChild(chgSub);
  } else {
    const pendingSpan = document.createElement('span');
    pendingSpan.className = 'badge badge-neutral';
    pendingSpan.textContent = item.battery_status || 'قيد الفحص...';
    tdBattery.appendChild(pendingSpan);
  }
  tr.appendChild(tdBattery);

  // 6. GPU Renderer & Vendor
  const tdGpu = document.createElement('td');
  tdGpu.style.fontSize = '12px';
  tdGpu.style.color = 'var(--text-main)';
  tdGpu.style.maxWidth = '220px';
  tdGpu.style.wordBreak = 'break-word';
  tdGpu.textContent = item.gpu || item.cpu_model || 'معالج رسومي مدمج';
  tr.appendChild(tdGpu);

  // 7. Hardware & Screen
  const tdHw = document.createElement('td');
  const hwText = document.createElement('div');
  hwText.textContent = `${item.cpu_cores || 8} أنوية • ${Math.round((item.total_ram_mb || 4096) / 1024)}GB RAM`;
  const screenText = document.createElement('div');
  screenText.style.fontSize = '11px';
  screenText.style.color = 'var(--text-secondary)';
  screenText.textContent = `الشاشة: ${item.screen_res || '1080x2400'}`;
  tdHw.appendChild(hwText);
  tdHw.appendChild(screenText);
  tr.appendChild(tdHw);

  // 8. Time of visit
  const tdDate = document.createElement('td');
  tdDate.style.fontSize = '12px';
  tdDate.style.color = 'var(--text-secondary)';
  try {
    const d = new Date(item.created_at || item.timestamp);
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

// Open Detailed Modal
function openReportModal(report) {
  const modalOverlay = document.getElementById('report-modal');
  const modalTitle = document.getElementById('modal-device-title');
  const modalId = document.getElementById('modal-device-id');
  const modalBody = document.getElementById('modal-body');

  if (!modalOverlay || !modalBody) return;

  modalOverlay.style.display = 'flex';
  modalBody.replaceChildren();

  const details = report.details || report;
  const bat = details.battery || {};
  const hw = details.hardware || {};

  if (modalTitle) modalTitle.textContent = `${report.brand || 'هاتف'} ${report.model || ''}`;
  if (modalId) modalId.textContent = `معرف الجهاز: ${report.device_id || '--'} | رقم التقرير: #${report.id || '--'}`;

  // Section 1: Network & Real IP Details
  const secNet = createModalSection('🌐 شبكة الاتصال وعنوان الـ IP الحقيقي');
  const gridNet = document.createElement('div');
  gridNet.className = 'spec-list';

  addSpecItem(gridNet, 'عنوان الـ IP العام (Public IP)', report.ip_address || '127.0.0.1');
  addSpecItem(gridNet, 'الدولة (Country)', report.country || 'غير محدد');
  addSpecItem(gridNet, 'المدينة (City)', report.city || 'غير محدد');
  addSpecItem(gridNet, 'مزود خدمة الإنترنت (ISP/Org)', report.isp || report.network_type || 'غير محدد');
  addSpecItem(gridNet, 'نوع الاتصال', report.network_type || 'WiFi/Cellular');

  secNet.appendChild(gridNet);
  modalBody.appendChild(secNet);

  // Section 2: Hardware & Real Model
  const secHw = createModalSection('⚙️ مواصفات الهاتف والموديل الدقيق');
  const gridHw = document.createElement('div');
  gridHw.className = 'spec-list';

  addSpecItem(gridHw, 'الشركة المصنعة (Brand)', report.brand);
  addSpecItem(gridHw, 'الموديل الحقيقي (High Entropy Model)', report.model);
  addSpecItem(gridHw, 'إصدار الأندرويد الفعلي (Real OS)', report.os_version);
  addSpecItem(gridHw, 'كرت الشاشة (GPU Renderer)', report.gpu || report.cpu_model || 'معالج رسومي');
  addSpecItem(gridHw, 'عدد الأنوية (CPU Cores)', `${report.cpu_cores || 8} أنوية`);
  addSpecItem(gridHw, 'الذاكرة العشوائية (RAM)', `${report.total_ram_mb || 4096} MB`);
  addSpecItem(gridHw, 'أبعاد الشاشة (Resolution)', report.screen_res || '1080x2400');
  addSpecItem(gridHw, 'معدل التحديث (Refresh Rate)', `${report.refresh_rate || 60} Hz`);

  secHw.appendChild(gridHw);
  modalBody.appendChild(secHw);

  // Section 3: Battery Diagnostics
  const secBattery = createModalSection('🔋 فحص البطارية (Battery)');
  const gridBattery = document.createElement('div');
  gridBattery.className = 'spec-list';

  addSpecItem(gridBattery, 'نسبة الشحن', report.battery_level ? `${report.battery_level}%` : 'جاري الفحص');
  addSpecItem(gridBattery, 'حالة التوصيل بالشاحن', report.charging_type || report.battery_status || '--');
  addSpecItem(gridBattery, 'صحة البطارية', report.battery_health || 'Good');
  addSpecItem(gridBattery, 'درجة الحرارة', `${report.battery_temperature || 31} °C`);
  addSpecItem(gridBattery, 'الجهد الكهربائي', `${report.battery_voltage || 3900} mV`);
  addSpecItem(gridBattery, 'تقنية البطارية', report.battery_tech || 'Li-ion');

  secBattery.appendChild(gridBattery);
  modalBody.appendChild(secBattery);
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

// Delete Report
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

// Filter Reports by Keyword
function filterReports(keyword) {
  if (!keyword) {
    renderReportsTable(cachedReports);
    return;
  }

  const filtered = cachedReports.filter(r => {
    const searchString = `${r.brand} ${r.model} ${r.ip_address} ${r.country} ${r.city} ${r.isp} ${r.os_version} ${r.gpu}`.toLowerCase();
    return searchString.includes(keyword);
  });

  renderReportsTable(filtered);
}

// Export to JSON file
function exportReportsAsJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cachedReports, null, 2));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", `ktaab_diagnostics_reports_${Date.now()}.json`);
  dlAnchorElem.click();
}

// Real-time Server-Sent Events (SSE) Listener
function initSSE() {
  const statusEl = document.getElementById('live-status-text');

  if (!window.EventSource) {
    if (statusEl) statusEl.textContent = 'محدث دوري (2s)';
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
        const idx = cachedReports.findIndex(r => r.device_id === item.device_id);
        if (idx !== -1) {
          cachedReports[idx] = item;
        } else {
          cachedReports.unshift(item);
        }
        renderReportsTable(cachedReports);
        fetchStats();
      } catch (err) {
        console.warn('SSE parse warning:', err);
      }
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
