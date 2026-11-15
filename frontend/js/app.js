/* =====================================================================
   app.js — Main application logic (Fixed 7 Regions & 7 Rice Varieties)
   ===================================================================== */

// ၁။ ဆန်/စပါး ၇ မျိုး ပုံသေ သတ်မှတ်ချက်
const DEFAULT_VARIETIES = [
  { id: "Paw San Hmwe", name: "ပေါ်ဆန်းမွှေး" },
  { id: "Ayeyarmin", name: "ဧရာမင်း" },
  { id: "Manaw Thukha", name: "မနောသုခ" },
  { id: "Sin Thu Kha", name: "ဆင်းသုခ" },
  { id: "Shwe Bo Paw San", name: "ရွှေဘိုပေါ်ဆန်း" },
  { id: "Pyapon Paw San", name: "ဖျာပုံပေါ်ဆန်း" },
  { id: "Emata", name: "ဧမထ" }
];

// ၂။ တိုင်းဒေသကြီး ၇ ခု ပုံသေ သတ်မှတ်ချက်
const DEFAULT_REGIONS = [
  { id: "Ayeyarwady", name: "ဧရာဝတီတိုင်းဒေသကြီး" },
  { id: "Bago", name: "ပဲခူးတိုင်းဒေသကြီး" },
  { id: "Sagaing", name: "စစ်ကိုင်းတိုင်းဒေသကြီး" },
  { id: "Mandalay", name: "မန္တလေးတိုင်းဒေသကြီး" },
  { id: "Yangon", name: "ရန်ကုန်တိုင်းဒေသကြီး" },
  { id: "Magway", name: "မကွေးတိုင်းဒေသကြီး" },
  { id: "Tanintharyi", name: "တနင်္သာရီတိုင်းဒေသကြီး" }
];

// Map ဖြတ်ရန်
const MYANMAR_NAMES = {
  "Paw San Hmwe": "ပေါ်ဆန်းမွှေး",
  "Ayeyarmin": "ဧရာမင်း",
  "Manaw Thukha": "မနောသုခ",
  "Sin Thu Kha": "ဆင်းသုခ",
  "Shwe Bo Paw San": "ရွှေဘိုပေါ်ဆန်း",
  "Pyapon Paw San": "ဖျာပုံပေါ်ဆန်း",
  "Emata": "ဧမထ",
  "Ayeyarwady": "ဧရာဝတီတိုင်းဒေသကြီး",
  "Bago": "ပဲခူးတိုင်းဒေသကြီး",
  "Sagaing": "စစ်ကိုင်းတိုင်းဒေသကြီး",
  "Mandalay": "မန္တလေးတိုင်းဒေသကြီး",
  "Yangon": "ရန်ကုန်တိုင်းဒေသကြီး",
  "Magway": "မကွေးတိုင်းဒေသကြီး",
  "Tanintharyi": "တနင်္သာရီတိုင်းဒေသကြီး"
};

const VIEW_TITLES = {
  dashboard: "ဒက်ရှ်ဘုတ်",
  collect: "ဈေးနှုန်း မှတ်တမ်းတင်ခြင်း",
  forecast: "AI ခန့်မှန်းချက်",
  alerts: "သတိပေးချက်များ",
};

let charts = { line: null, bar: null, forecast: null };
let refData = { regions: [], varieties: [] };
let allAlertsRaw = []; 

const $ = (id) => document.getElementById(id);
const fmt = (n) => (n && !isNaN(n) ? Number(n).toLocaleString("en-US") : "0");

/* ============================ HELPER CHART RENDERERS ============================ */

function renderBarChart(canvasId, trendsData, existingChartInstance) {
  const canvas = $(canvasId);
  if (!canvas) return null;

  if (existingChartInstance && typeof existingChartInstance.destroy === 'function') {
    existingChartInstance.destroy();
  }

  if (!trendsData || !Array.isArray(trendsData) || trendsData.length === 0) {
    return null;
  }

  const labels = trendsData.map(item => item.month || item.date || item.variety || item.label || "Unknown");
  const demandData = trendsData.map(item => item.demand || item.demand_qty || 0);
  const supplyData = trendsData.map(item => item.supply || item.supply_qty || 0);

  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'ဝယ်လိုအား (Demand)',
          data: demandData,
          backgroundColor: 'rgba(46, 125, 50, 0.85)',
          borderColor: '#2e7d32',
          borderWidth: 1
        },
        {
          label: 'ရောင်းလိုအား (Supply)',
          data: supplyData,
          backgroundColor: 'rgba(255, 193, 7, 0.85)',
          borderColor: '#ffc107',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderLineChart(canvasId, historyData, forecastData, existingChartInstance) {
  const canvas = $(canvasId);
  if (!canvas) return null;

  if (existingChartInstance && typeof existingChartInstance.destroy === 'function') {
    existingChartInstance.destroy();
  }

  historyData = Array.isArray(historyData) ? historyData : [];
  forecastData = Array.isArray(forecastData) ? forecastData : [];

  const labels = [
    ...historyData.map(h => h.date || h.month || "အတိတ်"),
    ...forecastData.map(f => f.date || f.month || "ခန့်မှန်း")
  ];

  const historyPrices = [...historyData.map(h => h.price), ...forecastData.map(() => null)];
  const forecastPrices = [...historyData.map(() => null), ...forecastData.map(f => f.price || f.predicted_price)];

  if (historyData.length > 0 && forecastData.length > 0) {
    forecastPrices[historyData.length - 1] = historyData[historyData.length - 1].price;
  }

  const allPrices = [
    ...historyData.map(h => h.price), 
    ...forecastData.map(f => f.price || f.predicted_price)
  ].filter(p => p !== null && !isNaN(p));

  let minPrice = allPrices.length ? Math.min(...allPrices) : 0;
  let maxPrice = allPrices.length ? Math.max(...allPrices) : 100000;
  
  const padding = (maxPrice - minPrice) * 0.1 || 1000;
  minPrice = Math.max(0, minPrice - padding);
  maxPrice = maxPrice + padding;

  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'လက်ရှိ/အတိတ် ဈေးနှုန်း',
          data: historyPrices,
          borderColor: '#2e7d32',
          backgroundColor: 'rgba(46, 125, 50, 0.08)',
          borderWidth: 2,
          pointRadius: 4,
          fill: true,
          tension: 0.2
        },
        {
          label: 'AI ခန့်မှန်း ဈေးနှုန်း',
          data: forecastPrices,
          borderColor: '#ed6c02',
          borderDash: [5, 5],
          backgroundColor: 'rgba(237, 108, 2, 0.08)',
          borderWidth: 2,
          pointRadius: 4,
          fill: true,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      scales: {
        x: { grid: { display: false } },
        y: {
          min: Math.floor(minPrice),
          max: Math.ceil(maxPrice),
          ticks: {
            callback: function(value) {
              return value.toLocaleString() + ' ကျပ်';
            }
          }
        }
      },
      plugins: {
        legend: { display: true, position: 'top' }
      }
    }
  });
}

/* ============================ HEATMAP RENDERER (MRF DYNAMIC + EXACT COLOR DESIGN) ============================ */
function renderHeatmap(containerId, heatData) {
  const container = typeof containerId === 'string' ? $(containerId.replace('#', '')) : containerId;
  if (!container) return;

  const fallbackWeeks = ["ပတ်-၁", "ပတ်-၂", "ပတ်-၃", "ပတ်-၄", "ပတ်-၅", "ပတ်-၆"];
  
  // MRF Backend ဒေတာ မရောက်လာသေးပါက ပြသပေးမည့် Default Data
  const defaultHeatmap = [
    { region: "ဧရာဝတီ", values: [93, 87, 84, 85, 87, 84] },
    { region: "ပဲခူး", values: [95, 90, 90, 90, 90, 90] },
    { region: "ရန်ကုန်", values: [101, 100, 100, 100, 100, 100] },
    { region: "မန္တလေး", values: [92, 87, 87, 84, 84, 87] },
    { region: "စစ်ကိုင်း", values: [86, 83, 83, 83, 83, 83] },
    { region: "မကွေး", values: [91, 84, 87, 84, 87, 87] }
  ];

  // MRF မှ heatData ရရင် အစစ်သုံးမည်၊ မရသေးရင် defaultHeatmap သုံးမည်
  const displayData = (heatData && Array.isArray(heatData) && heatData.length > 0) ? heatData : defaultHeatmap;

  // ၁။ MRF ဈေးနှုန်း ဒေတာများထဲမှ အနိမ့်ဆုံး (Min) နှင့် အမြင့်ဆုံး (Max) ကို Dynamic ရှာဖွေခြင်း
  let allVals = [];
  displayData.forEach(d => {
    if (Array.isArray(d.values)) {
      d.values.forEach(v => {
        const num = Number(v);
        if (!isNaN(num) && num > 0) allVals.push(num);
      });
    } else if (d.price) {
      const num = Number(d.price);
      if (!isNaN(num) && num > 0) allVals.push(num);
    }
  });

  const minP = allVals.length > 0 ? Math.min(...allVals) : 80;
  const maxP = allVals.length > 0 ? Math.max(...allVals) : 105;

  // ၂။ MRF မှ ဈေးနှုန်း ပြောင်းလဲမှုအလိုက် Slate Blue Intensity အရောင်များ လိုက်ပြောင်းပေးသည့် Function
  const getColorStyle = (val) => {
    if (val === undefined || val === null || isNaN(val)) {
      return 'background-color: #d1dbe4; color: #0f172a;';
    }
    
    const numericVal = Number(val);
    const range = maxP - minP;
    const ratio = (range === 0) ? 0.5 : (numericVal - minP) / range;
    
    // MRF ဈေးနှုန်း ရာခိုင်နှုန်းအလိုက် အရောင် ခွဲခြားခြင်း
    if (ratio >= 0.8) {
      return 'background-color: #1a7a7a; color: #ffffff;'; // ဈေးအမြင့်ဆုံး
    } else if (ratio >= 0.5) {
      return 'background-color: #6d9cb0; color: #ffffff;'; // ဈေးမြင့်
    } else if (ratio >= 0.25) {
      return 'background-color: #a4c2d1; color: #0f172a;'; // ဈေးအလတ်
    } else {
      return 'background-color: #d1dbe4; color: #0f172a;'; // ဈေးအနိမ့်ဆုံး
    }
  };

  // ၃။ HTML Grid Structure ဆွဲခြင်း
  let html = `
    <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 15px; overflow-x: auto; padding-bottom: 10px;">
      
      <!-- Header Row (Weeks) -->
      <div style="display: grid; grid-template-columns: 90px repeat(6, 1fr); gap: 12px; min-width: 550px; text-align: center; font-weight: 600; color: #4b5563; font-size: 0.9em;">
        <div></div>
        ${fallbackWeeks.map(w => `<div>${w}</div>`).join('')}
      </div>

      <!-- Data Rows (Regions) -->
  `;

  displayData.forEach(row => {
    const rawRegion = row.region || row.name || row.state || 'တိုင်းဒေသကြီး';
    const rName = (typeof MYANMAR_NAMES !== 'undefined' && MYANMAR_NAMES[rawRegion]) ? MYANMAR_NAMES[rawRegion] : rawRegion;
    let vals = Array.isArray(row.values) ? row.values : [row.price || 85];

    html += `
      <div style="display: grid; grid-template-columns: 90px repeat(6, 1fr); gap: 12px; min-width: 550px; align-items: center;">
        <div style="font-weight: 700; font-size: 0.9em; color: #1f2937; white-space: nowrap;">${rName}</div>
    `;

    for (let i = 0; i < 6; i++) {
      const v = vals[i] !== undefined ? vals[i] : vals[0];
      const cardStyle = getColorStyle(v);

      html += `
        <div style="${cardStyle} border-radius: 12px; padding: 22px 4px; text-align: center; font-weight: 700; font-size: 0.95em; cursor: pointer; transition: background-color 0.3s ease;"
             title="${rName} · ${fallbackWeeks[i]}: ${v ? v + ',၀၀၀ ကျပ်' : 'ဒေတာမရှိပါ'}">
          ${v}
        </div>
      `;
    }

    html += `</div>`;
  });

  html += `</div>`;

  container.innerHTML = html;
}

/* ============================ LOGIN & REGISTER ============================ */
$("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("authAlert");
  if (err) {
    err.textContent = "";
    err.style.display = "none";
  }
  try {
    const res = await apiPost("/login", {
      phone: $("phone").value.trim(),
      password: $("password").value,
    });
    Store.setUser(res.user);
    startApp();
  } catch (ex) {
    if (err) {
      err.textContent =
        (ex.data && ex.data.error) ||
        "ဆာဗာနှင့် ချိတ်ဆက်၍မရပါ — Flask server (port 5000) ကို စစ်ဆေးပါ";
      err.style.display = "block";
    }
  }
});

$("registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("authAlert");
  if (err) {
    err.textContent = "";
    err.style.display = "none";
  }

  const name = $("reg_name").value.trim();
  const phone = $("reg_phone").value.trim();
  const password = $("reg_password").value;

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (password.length < 6 || !hasLetter || !hasNumber) {
    if (err) {
      err.textContent = "⚠️ စကားဝှက်သည် အနည်းဆုံး ၆ လုံးရှိရမည်ဖြစ်ပြီး အင်္ဂလိပ်စာသားနှင့် ဂဏန်းတွဲပါရပါမည်။";
      err.style.display = "block";
    }
    return;
  }

  try {
    await apiPost("/register", { name, phone, password });
    alert("အကောင့်ဖွင့်ခြင်း အောင်မြင်ပါသည်! အကောင့်ပြန်ဝင်ပေးပါရှင်။");
    $("registerForm").style.display = "none";
    $("loginForm").style.display = "block";
    $("phone").value = phone;
  } catch (ex) {
    console.error("Register Error Details:", ex);
    if (err) {
      err.textContent = (ex.data && ex.data.error) || ex.message || "အကောင့်ဖွင့်ခြင်း မအောင်မြင်ပါ — Backend Route (/register) ကို စစ်ဆေးပါ";
      err.style.display = "block";
    }
  }
});

$("goToRegister")?.addEventListener("click", (e) => {
  e.preventDefault();
  $("loginForm").style.display = "none";
  $("registerForm").style.display = "block";
  if ($("authAlert")) $("authAlert").style.display = "none";
});

$("goToLogin")?.addEventListener("click", (e) => {
  e.preventDefault();
  $("registerForm").style.display = "none";
  $("loginForm").style.display = "block";
  if ($("authAlert")) $("authAlert").style.display = "none";
});

$("logoutBtn")?.addEventListener("click", () => {
  Store.clearUser();
  location.reload();
});

/* ===================== OFFLINE TOGGLE ===================== */
function refreshOfflineUI() {
  const off = Store.isOffline();
  if ($("offlineLabel")) $("offlineLabel").textContent = off ? "Offline" : "Online";
  if ($("offlineToggle")) {
    const dot = $("offlineToggle").querySelector(".dot");
    if (dot) dot.className = "dot " + (off ? "dot--offline" : "dot--online");
  }
  const q = Store.getQueue();
  if ($("syncBanner")) {
    if (q.length) {
      $("syncBanner").hidden = false;
      $("syncText").textContent = `Sync မလုပ်ရသေးသော မှတ်တမ်း ${q.length} ခု ရှိသည်`;
    } else {
      $("syncBanner").hidden = true;
    }
  }
}

$("offlineToggle")?.addEventListener("click", () => {
  Store.setOffline(!Store.isOffline());
  refreshOfflineUI();
});

$("syncBtn")?.addEventListener("click", async () => {
  try {
    const r = await syncQueue();
    alert(`မှတ်တမ်း ${r.inserted || 0} ခု sync ပြီးပါပြီ`);
    refreshOfflineUI();
    loadDashboard();
    loadPriceTable();
  } catch {
    alert("Sync မအောင်မြင်ပါ — Online ဖြစ်နေကြောင်း သေချာပါစေ");
  }
});

/* ===================== NAVIGATION ===================== */
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

function switchView(view) {
  document.querySelectorAll(".tab").forEach((t) =>
    t.classList.toggle("is-active", t.dataset.view === view)
  );
  document.querySelectorAll(".view").forEach((v) => (v.hidden = true));
  if ($("view-" + view)) $("view-" + view).hidden = false;
  if ($("viewTitle")) $("viewTitle").textContent = VIEW_TITLES[view];
  if (view === "forecast") loadForecast();
  if (view === "alerts") displayFilteredAlerts();
  if (view === "dashboard") loadDashboard();
}

/* ===================== FILTERS ===================== */
function selectedVariety() { return $("varietySelect") ? $("varietySelect").value.trim() : "အားလုံး"; }
function selectedRegion() { return $("regionSelect") ? $("regionSelect").value.trim() : "အားလုံး"; }

if ($("varietySelect") && $("regionSelect")) {
  [$("varietySelect"), $("regionSelect")].forEach((sel) =>
    sel.addEventListener("change", () => {
      loadDashboard();
      if ($("view-forecast") && !$("view-forecast").hidden) loadForecast();
      displayFilteredAlerts();
    })
  );
}

/* ===================== DATA LOADERS ===================== */
async function loadRefData() {
  try {
    const rData = await apiGet("/regions").catch(() => []);
    const vData = await apiGet("/varieties").catch(() => []);
    
    refData.regions = (Array.isArray(rData) && rData.length >= 7) ? rData : DEFAULT_REGIONS;
    refData.varieties = (Array.isArray(vData) && vData.length >= 7) ? vData : DEFAULT_VARIETIES;
  } catch (e) {
    console.log("Ref data error, using fallback defaults:", e);
    refData.regions = DEFAULT_REGIONS;
    refData.varieties = DEFAULT_VARIETIES;
  } finally {
    populateSelects();
  }
}

function populateSelects() {
  const vSelect = $("varietySelect");
  const rSelect = $("regionSelect");
  const cVariety = $("c_variety");
  const cRegion = $("c_region");

  const getName = (item) => {
    let rawName = "အမည်မရှိ";
    if (typeof item === 'string') {
      rawName = item;
    } else if (item) {
      rawName = item.name || item.variety_name || item.variety || item.rice_type || item.region_name || item.region || item.state || item.title || Object.values(item)[1] || Object.values(item)[0] || "အမည်မရှိ";
    }
    return MYANMAR_NAMES[rawName] || rawName;
  };

  const activeVarieties = refData.varieties.length ? refData.varieties : DEFAULT_VARIETIES;
  const activeRegions = refData.regions.length ? refData.regions : DEFAULT_REGIONS;

  if (vSelect) {
    const optionsHTML = `<option value="အားလုံး">ဆန်အမျိုးအစား (အားလုံး)</option>` +
      activeVarieties.map(v => {
        const name = getName(v);
        const val = typeof v === 'object' && v.id ? v.id : name;
        return `<option value="${val}" data-name="${name}">${name}</option>`;
      }).join('');
    
    vSelect.innerHTML = optionsHTML;
    vSelect.value = "အားလုံး";
  }

  if (rSelect) {
    const optionsHTML = `<option value="အားလုံး">တိုင်းဒေသကြီး (အားလုံး)</option>` +
      activeRegions.map(r => {
        const name = getName(r);
        const val = typeof r === 'object' && r.id ? r.id : name;
        return `<option value="${val}" data-name="${name}">${name}</option>`;
      }).join('');

    rSelect.innerHTML = optionsHTML;
    rSelect.value = "အားလုံး";
  }

  if (cVariety) {
    cVariety.innerHTML = activeVarieties.map(v => {
      const name = getName(v);
      const val = typeof v === 'object' && v.id ? v.id : name;
      return `<option value="${val}">${name}</option>`;
    }).join('');
  }

  if (cRegion) {
    cRegion.innerHTML = activeRegions.map(r => {
      const name = getName(r);
      const val = typeof r === 'object' && r.id ? r.id : name;
      return `<option value="${val}">${name}</option>`;
    }).join('');
  }
}

async function loadDashboard() {
  const vName = selectedVariety();
  const rName = selectedRegion();
  
  const vId = (vName === "အားလုံး" || vName === "") ? "" : vName;
  const rId = (rName === "အားလုံး" || rName === "") ? "" : rName;

  try {
    const kpi = await apiGet(`/dashboard?variety_id=${vId}&region_id=${rId}`).catch(() => null);
    if (kpi) renderKpis(kpi);

    const fc = await apiGet(`/forecast?variety_id=${vId}&region_id=${rId}&months=3`).catch(() => null);
    if (fc && fc.ok) {
      charts.line = renderLineChart("lineChart", fc.history, fc.forecast, charts.line);
    }

    const trends = await apiGet(`/trends?region_id=${rId}`).catch(() => []);
    charts.bar = renderBarChart("barChart", trends, charts.bar);

    // Heatmap ဒေတာ လှမ်းယူသည့် Function အား ခေါ်ယူခြင်း
    loadHeatmapData();

  } catch (ex) {
    console.log("[v0] dashboard load error:", ex.message);
  }
}

function renderKpis(k) {
  if (!k || !$("kpiGrid")) return;
  const arrow = (t) => (t === "up" ? "▲" : t === "down" ? "▼" : "■");
  const cls = (t) => (t === "up" ? "up" : t === "down" ? "down" : "");
  const cards = [
    { label: "လက်ရှိ ဈေး (ကျပ်/အိတ်)", value: fmt(k.current_price), accent: false,
      delta: `${arrow(k.price_change_pct >= 0 ? "up" : "down")} ${Math.abs(k.price_change_pct || 0)}%`,
      dcls: k.price_change_pct >= 0 ? "up" : "down" },
    { label: "ခန့်မှန်း ဈေး (၃ လ)", value: fmt(k.predicted_price), accent: true,
      delta: `ယုံကြည်မှု ${k.confidence || 0}%`, dcls: "" },
    { label: "ဝယ်လိုအား", value: fmt(k.demand), accent: false,
      delta: `${arrow(k.demand_trend)} Trend`, dcls: cls(k.demand_trend) },
    { label: "ရောင်းလိုအား", value: fmt(k.supply), accent: false,
      delta: `${arrow(k.supply_trend)} Trend`, dcls: cls(k.supply_trend) },
    { label: "ခန့်မှန်း လစဉ်အမြတ် (ကျပ်)", value: fmt(k.monthly_profit), accent: true,
      delta: k.monthly_profit >= 0 ? "▲ အမြတ်" : "▼ အရှုံး",
      dcls: k.monthly_profit >= 0 ? "up" : "down" },
  ];

  $("kpiGrid").innerHTML = cards
    .map(
      (c) => `
    <div class="card kpi ${c.accent ? "kpi--accent" : ""}">
      <div class="kpi__label">${c.label}</div>
      <div class="kpi__value">${c.value}</div>
      <div class="kpi__delta ${c.dcls}">${c.delta}</div>
    </div>`
    )
    .join("");
}

async function loadForecast() {
  const vName = selectedVariety();
  const rName = selectedRegion();
  const vId = (vName === "အားလုံး" || vName === "") ? "" : vName;
  const rId = (rName === "အားလုံး" || rName === "") ? "" : rName;

  try {
    const fc = await apiGet(`/forecast?variety_id=${vId}&region_id=${rId}&months=3`);
    if (!fc || !fc.ok) {
      if ($("forecastSummary")) {
        $("forecastSummary").innerHTML = `<p class="muted">${(fc && fc.reason) || "data မလုံလောက်ပါ"}</p>`;
      }
      return;
    }
    const trendText = fc.trend === "up" ? "တက်" : fc.trend === "down" ? "ကျ" : "တည်ငြိမ်";
    if ($("forecastSummary")) {
      $("forecastSummary").innerHTML = `
        <div class="kpi__label">၃ လအတွင်း ခန့်မှန်း ဈေး</div>
        <div class="big">${fmt(fc.predicted_price)} <small style="font-size:.6em;color:var(--muted)">ကျပ်/အိတ်</small></div>
        <div class="kpi__delta ${fc.change_pct >= 0 ? "up" : "down"}">
          ${fc.change_pct >= 0 ? "▲" : "▼"} ${Math.abs(fc.change_pct)}% (${trendText})
        </div>
        <div style="margin-top:6px">
          <div class="kpi__label">Model ယုံကြည်စိတ်ချရမှု — ${fc.confidence}%</div>
          <div class="confidence-bar"><span style="width:${fc.confidence}%"></span></div>
        </div>
        <div class="reco">💡 ${fc.recommendation}</div>`;
    }
    charts.forecast = renderLineChart("forecastChart", fc.history, fc.forecast, charts.forecast);
  } catch (err) {
    console.log("Forecast load error:", err);
  }
}

async function loadAlerts() {
  try {
    allAlertsRaw = await apiGet("/ai-notifications") || [];
  } catch (ex) {
    console.log("AI Noti load error:", ex.message);
    allAlertsRaw = [];
  }
  
  const unread = allAlertsRaw.length;
  const badge = $("alertBadge");
  if (badge) {
    badge.hidden = unread === 0;
    badge.textContent = unread;
  }

  displayFilteredAlerts();
}

function displayFilteredAlerts() {
  const alertContainer = $("alertList");
  if (!alertContainer) return;

  const vSel = $("varietySelect");
  const rSel = $("regionSelect");

  const targetVarietyVal = selectedVariety();
  const targetVarietyText = vSel && vSel.selectedIndex >= 0 ? vSel.options[vSel.selectedIndex].text : targetVarietyVal;

  const targetRegionVal = selectedRegion();
  let targetRegionText = rSel && rSel.selectedIndex >= 0 ? rSel.options[rSel.selectedIndex].text : targetRegionVal;
  targetRegionText = targetRegionText.replace("တိုင်းဒေသကြီး", "").replace("တိုင်း", "").replace("ပြည်နယ်", "").trim();

  let filtered = allAlertsRaw;

  if (targetVarietyVal !== "အားလုံး" && targetVarietyVal !== "") {
    filtered = filtered.filter(a => {
      const riceType = String(a.rice_type || a.variety || a.variety_id || "");
      const title = String(a.title || "");
      const msg = String(a.message || "");
      
      return riceType.includes(targetVarietyVal) || 
             riceType.includes(targetVarietyText) || 
             title.includes(targetVarietyText) || 
             msg.includes(targetVarietyText);
    });
  }

  if (targetRegionVal !== "အားလုံး" && targetRegionVal !== "") {
    filtered = filtered.filter(a => {
      const reg = String(a.region || a.region_id || "").replace("တိုင်းဒေသကြီး", "").replace("တိုင်း", "").replace("ပြည်နယ်", "").trim();
      const title = String(a.title || "");
      const msg = String(a.message || "");

      return reg.includes(targetRegionVal) || 
             reg.includes(targetRegionText) || 
             title.includes(targetRegionText) || 
             msg.includes(targetRegionText);
    });
  }

  if (filtered.length === 0) {
    alertContainer.innerHTML = `
      <div class="alert alert--info" style="text-align: center; padding: 20px;">
        <div class="alert__msg">ရွေးချယ်ထားသော သတ်မှတ်ချက်အတွက် သတိပေးချက်အသစ် မရှိသေးပါရှင်။</div>
      </div>`;
    return;
  }

  alertContainer.innerHTML = filtered
    .map((a) => {
      const severity = a.severity || "info";
      return `
      <div class="alert alert--${severity}" style="margin-bottom: 12px; padding: 15px; border-radius: 8px;">
        <div class="alert__title" style="font-weight: bold; font-size: 1.1em;">${a.title || 'သတိပေးချက်'}</div>
        <div class="alert__msg" style="margin-top: 4px; color: #333;">${a.message || ''}</div>
        <div class="alert__meta" style="margin-top: 6px; font-size: 0.85em; color: #666;">
          📍 ပြကွက်ဒေသ: <b>${MYANMAR_NAMES[a.region] || a.region || 'အားလုံး'}</b> · အမျိုးအစား: <b>${MYANMAR_NAMES[a.rice_type] || a.rice_type || 'အားလုံး'}</b> · (${a.date || ''})
        </div>
      </div>`;
    })
    .join("");
}

async function loadPriceTable() {
  const rows = await apiGet("/prices").catch(() => []);
  if (!rows || !Array.isArray(rows) || !$("priceTable")) return;
  
  const tbody = $("priceTable").querySelector("tbody");
  if (tbody) {
    tbody.innerHTML = rows
      .map(
        (r) => {
          const rawVar = r.variety || r.variety_name || r.rice_type || '';
          const rawReg = r.region || r.region_name || '';
          return `<tr>
            <td>${MYANMAR_NAMES[rawVar] || rawVar}</td>
            <td>${MYANMAR_NAMES[rawReg] || rawReg}</td>
            <td>${fmt(r.price)}</td>
            <td>${r.record_date || r.date || ''}</td>
          </tr>`;
        }
      )
      .join("");
  }
}

/* ===================== PRICE COLLECTION ===================== */
$("priceForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rec = {
    variety_id: $("c_variety").value,
    region_id: $("c_region").value,
    price: +$("c_price").value,
    record_date: $("c_date").value,
  };
  const msg = $("collectMsg");

  if (Store.isOffline()) {
    Store.pushQueue(rec);
    if (msg) {
      msg.textContent = "Offline — မှတ်တမ်းကို စက်ထဲတွင် သိမ်းထားပြီး နောက်မှ sync လုပ်ပါမည်";
      msg.hidden = false;
    }
    refreshOfflineUI();
    $("priceForm").reset();
    return;
  }
  try {
    await apiPost("/prices", rec);
    if (msg) {
      msg.textContent = "ဈေးနှုန်း မှတ်တမ်းတင်ပြီးပါပြီ";
      msg.hidden = false;
    }
    $("priceForm").reset();
    loadPriceTable();
    loadDashboard();
  } catch {
    if (msg) {
      msg.className = "error";
      msg.textContent = "မှတ်တမ်းတင်၍မရပါ — ဆာဗာကို စစ်ဆေးပါ";
      msg.hidden = false;
    }
  }
});

/* ===================== STARTUP ===================== */
function startApp() {
  const user = Store.getUser();
  if ($("loginScreen")) $("loginScreen").hidden = true;
  if ($("app")) $("app").hidden = false;
  
  if (user && $("userName")) {
    $("userName").textContent = user.name;
  }
  
  if ($("c_date")) $("c_date").value = new Date().toISOString().slice(0, 10);

  refreshOfflineUI();
  loadRefData()
    .then(() => {
      loadDashboard();
      loadPriceTable();
      loadAlerts();
    })
    .catch((ex) => console.log("[v0] startup error:", ex.message));
}

// Backend ထံမှ Heatmap ဒေတာ အစစ် လှမ်းတောင်းခြင်း (Fixed Python Route)
function loadHeatmapData() {
  fetch('http://127.0.0.1:5000/api/mrf-prices/heatmap')
    .then(response => {
      if (!response.ok) throw new Error("Network response error");
      return response.json();
    })
    .then(data => {
      console.log("MRF Data အစစ် ရရှိပါပြီ:", data);

      // Backend မှ Array ဒေတာ တိုက်ရိုက် သို့မဟုတ် Object အောက်မှ Array ကို ရှာယူခြင်း
      const actualData = Array.isArray(data) ? data : (data.heatmap || data.data || data.result || null);

      console.log("Render လုပ်မည့် Data အမှန်:", actualData);

      // Heatmap ဆွဲသည့် function ကို ခေါ်ယူခြင်း
      renderHeatmap('heatmap', actualData);
    })
    .catch(error => {
      console.error("Backend ဒေတာ ရယူ၍ မရပါ၊ အသင့်သုံး ဒေတာ ပြသပါမည်:", error);
      renderHeatmap('heatmap', null); 
    });
}

// Page Load သောအခါ အလိုအလျောက် ခေါ်ပေးခြင်း
document.addEventListener("DOMContentLoaded", () => {
  loadHeatmapData();
});

// Auto-login if session exists
if (typeof Store !== "undefined" && Store.getUser()) {
  startApp();
}