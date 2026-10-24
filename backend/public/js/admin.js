// Ktaab Admin Dashboard Script - Flexible Real-time SSE & Polling Sync

let cachedReports = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchStats();
  fetchReports();
  initSSE();
  setupEventListeners();

  // Polling fallback every 2.5 seconds ensuring 100% data sync across networks/mobile proxies
  setInterval(fetchReports, 2500);
  setInterval(fetchStats, 5000);
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
  } catch (err) {
    // Silent fail for polling
  }
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

// Fetch Reports List
async function fetchReports() {
  try {
    const res = await fetch('/api/reports', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      // Check if data actually changed before re-rendering to prevent UI jitter
      const isDifferent = JSON.stringify(json.data) !== JSON.stringify(cachedReports);
      if (isDifferent) {
        cachedReports = json.data;
        renderReportsTable(cachedReports);
      }
    }
  } catch (err) {
    console.warn('Fetch reports notice:', err.message);
  }
}

// Render Table using Secure DOM Methods (No innerHTML)
function renderReportsTable(reports) {
  const tbody = document.getElementById('reports-table-body');
  if (!tbody) return;

  tbody.replaceChildren();

  if (!reports || reports.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.setAttribute('colspan', '10');
    td.className = 'empty-state';

    const iconDiv = document.createElement('div');
    iconDiv.className = 'empty-state-icon';
    iconDiv.textContent = '📱';

    const p = document.createElement('p');
    p.textContent = 'لا توجد تقارير فحص مسجلة حتى الآن. افتح الرابط في هاتفك لبدء الفحص الفوري.';

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

  // ID
  const tdId = document.createElement('td');
  tdId.textContent = `#${item.id || '--'}`;
  tr.appendChild(tdId);

  // Device & Model & Stage Badge
  const tdDevice = document.createElement('td');
  const brandTitle = document.createElement('div');
  brandTitle.style.fontWeight = '700';
  brandTitle.textContent = `${item.brand || 'هاتف'} ${item.model || ''}`;

  const deviceSub = document.createElement('div');
  deviceSub.style.fontSize = '12px';
  deviceSub.style.color = 'var(--text-secondary)';
  deviceSub.textContent = `IP: ${item.ip_address || '127.0.0.1'}`;

  tdDevice.appendChild(brandTitle);
  tdDevice.appendChild(deviceSub);

  if (item.stage) {
    const stageBadge = document.createElement('span');
    const isStage1 = String(item.stage).includes('المرحلة 1');
    stageBadge.className = isStage1 ? 'badge badge-warning' : 'badge badge-success';
    stageBadge.style.fontSize = '10px';
    stageBadge.style.marginTop = '4px';
    stageBadge.textContent = isStage1 ? '⚡ مرحلة 1: بيانات فورية' : '✅ مرحلة 2: فحص شامل';
    tdDevice.appendChild(stageBadge);
  }

  tr.appendChild(tdDevice);

  // Battery Level with Flexible Display
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
  } else {
    const pendingSpan = document.createElement('span');
    pendingSpan.className = 'badge badge-neutral';
    pendingSpan.textContent = item.battery_status || 'قيد الفحص...';
    tdBattery.appendChild(pendingSpan);
  }
  tr.appendChild(tdBattery);

  // Battery Health & Status
  const tdHealth = document.createElement('td');
  const badgeHealth = document.createElement('span');
  const health = item.battery_health || 'Good';
  badgeHealth.className = `badge ${health === 'Good' ? 'badge-success' : 'badge-danger'}`;
  badgeHealth.textContent = health === 'Good' ? 'سليمة (Good)' : health;

  const statusSub = document.createElement('div');
  statusSub.style.fontSize = '11px';
  statusSub.style.color = 'var(--text-secondary)';
  statusSub.style.marginTop = '4px';
  statusSub.textContent = item.charging_type || item.battery_status || 'تفريغ';

  tdHealth.appendChild(badgeHealth);
  tdHealth.appendChild(statusSub);
  tr.appendChild(tdHealth);

  // Temperature
  const tdTemp = document.createElement('td');
  const temp = Number(item.battery_temperature) || 30.0;
  tdTemp.textContent = `${temp.toFixed(1)} °C`;
  if (temp > 42) {
    tdTemp.style.color = 'var(--danger)';
    tdTemp.style.fontWeight = '700';
  } else if (temp > 37) {
    tdTemp.style.color = 'var(--warning)';
  }
  tr.appendChild(tdTemp);

  // Voltage
  const tdVoltage = document.createElement('td');
  const voltage = item.battery_voltage ? `${item.battery_voltage} mV` : '--';
  tdVoltage.textContent = voltage;
  tr.appendChild(tdVoltage);

  // OS & Hardware
  const tdOs = document.createElement('td');
  tdOs.textContent = `${item.os_version || 'Android / iOS'} (${item.cpu_cores || 4} أنوية)`;
  tr.appendChild(tdOs);

  // Root / Platform Status
  const tdRoot = document.createElement('td');
  const badgeRoot = document.createElement('span');
  if (item.is_rooted === 1) {
    badgeRoot.className = 'badge badge-danger';
    badgeRoot.textContent = 'مروّت (Rooted)';
  } else {
    badgeRoot.className = 'badge badge-success';
    badgeRoot.textContent = 'نظام آمن';
  }
  tdRoot.appendChild(badgeRoot);
  tr.appendChild(tdRoot);

  // Date
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

  // Actions
  const tdActions = document.createElement('td');
  const btnGroup = document.createElement('div');
  btnGroup.style.display = 'flex';
  btnGroup.style.gap = '8px';

  const viewBtn = document.createElement('button');
  viewBtn.className = 'btn btn-outline';
  viewBtn.style.padding = '6px 12px';
  viewBtn.style.fontSize = '12px';
  viewBtn.textContent = '👁️ فحص';
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
  const disp = details.display || {};

  if (modalTitle) modalTitle.textContent = `${report.brand || 'هاتف'} ${report.model || ''}`;
  if (modalId) modalId.textContent = `معرف الجهاز: ${report.device_id || '--'} | رقم التقرير: #${report.id || '--'}`;

  // Section 1: Battery Diagnostics
  const secBattery = createModalSection('🔋 فحص البطارية (Battery Diagnostics)');
  const gridBattery = document.createElement('div');
  gridBattery.className = 'spec-list';

  addSpecItem(gridBattery, 'نسبة الشحن', report.battery_level ? `${report.battery_level}%` : 'جاري الفحص');
  addSpecItem(gridBattery, 'صحة البطارية', report.battery_health || 'Good');
  addSpecItem(gridBattery, 'درجة الحرارة', `${report.battery_temperature || 30} °C`);
  addSpecItem(gridBattery, 'الجهد الكهربائي (Voltage)', `${report.battery_voltage || 3850} mV`);
  addSpecItem(gridBattery, 'مصدر وحالة الشحن', report.charging_type || report.battery_status || '--');
  addSpecItem(gridBattery, 'تقنية البطارية', report.battery_tech || 'Li-ion');
  addSpecItem(gridBattery, 'مرحلة الفحص', report.stage || 'مكتمل');

  secBattery.appendChild(gridBattery);
  modalBody.appendChild(secBattery);

  // Section 2: Hardware & OS
  const secHw = createModalSection('⚙️ مواصفات الهاتف والعتاد والمعالج');
  const gridHw = document.createElement('div');
  gridHw.className = 'spec-list';

  addSpecItem(gridHw, 'الشركة / العلامة التجارية', report.brand);
  addSpecItem(gridHw, 'اسم الموديل', report.model);
  addSpecItem(gridHw, 'نظام التشغيل', report.os_version);
  addSpecItem(gridHw, 'عدد الأنوية (CPU Cores)', `${report.cpu_cores || 4} أنوية متزامنة`);
  addSpecItem(gridHw, 'الذاكرة العشوائية (RAM)', `${report.total_ram_mb || 4096} MB`);
  addSpecItem(gridHw, 'مساحة التخزين', `${report.total_storage_gb || 64} GB`);
  addSpecItem(gridHw, 'حالة الروت', report.is_rooted ? '⚠️ تم اكتشاف روت' : '✅ نظام رسمي آمن');

  secHw.appendChild(gridHw);
  modalBody.appendChild(secHw);

  // Section 3: Screen & Network
  const secSensors = createModalSection('📱 الشاشة والشبكة');
  const gridSensors = document.createElement('div');
  gridSensors.className = 'spec-list';

  addSpecItem(gridSensors, 'أبعاد الشاشة', report.screen_res);
  addSpecItem(gridSensors, 'معدل التحديث', `${report.refresh_rate || 60} Hz`);
  addSpecItem(gridSensors, 'نوع الاتصال', report.network_type);
  addSpecItem(gridSensors, 'عنوان IP', report.ip_address);

  secSensors.appendChild(gridSensors);
  modalBody.appendChild(secSensors);
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
    const searchString = `${r.brand} ${r.model} ${r.ip_address} ${r.os_version} ${r.device_id} ${r.stage}`.toLowerCase();
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
    if (statusEl) statusEl.textContent = 'محدث دوري (2.5s)';
    return;
  }

  try {
    const eventSource = new EventSource('/api/events');

    eventSource.addEventListener('connected', () => {
      if (statusEl) statusEl.textContent = 'متصل بالسيرفر (تحديث لحظي)';
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
      if (statusEl) statusEl.textContent = 'متصل (تحديث دوري 2.5s)';
    };
  } catch (_) {}
}
