// frontend/js/dashboard-view.js

document.addEventListener("DOMContentLoaded", () => {
    // 0။ Dropdown (ဆန်မျိုးအစားနှင့် ဒေသ) များအတွက် ဒေတာဖြည့်ပေးမည်
    loadDropdownOptions();

    // ၁။ စာမျက်နှာ စတက်လာသည်နှင့် KPI Cards များအတွက် ဒေတာလှမ်းတောင်းမည်
    loadDashboardData();

    // ၂။ လအလိုက် ဝယ်လိုအားနှင့် ရောင်းလိုအား Bar Chart အတွက်ပါ ဒေတာလှမ်းတောင်းမည်
    loadChartData();
});

/**
 * 0. Dropdown Option များကို Backend API မှ လှမ်းယူပြီး dynamic ဖြည့်ပေးမည့် Function
 */
function loadDropdownOptions() {
    const varietySelect = document.getElementById("varietySelect") || document.querySelectorAll("select")[0];
    const regionSelect = document.getElementById("regionSelect") || document.querySelectorAll("select")[1];

    fetch("http://127.0.0.1:5000/api/options")
        .then((res) => res.json())
        .then((data) => {
            if (varietySelect && data.varieties) {
                varietySelect.innerHTML = '<option value="">ဆန်မျိုးအစား (အားလုံး)</option>';
                data.varieties.forEach((item) => {
                    const opt = document.createElement("option");
                    opt.value = item.id || item.variety_id;
                    // name, variety_name ကြိုက်တာပါလာပါစေ undefined မဖြစ်အောင် Fallback စစ်ပေးထားခြင်း
                    opt.textContent = item.variety_name || item.name || item.title || `မျိုးအစား #${item.id}`;
                    varietySelect.appendChild(opt);
                });
            }

            if (regionSelect && data.regions) {
                regionSelect.innerHTML = '<option value="">ဒေသ (အားလုံး)</option>';
                data.regions.forEach((item) => {
                    const opt = document.createElement("option");
                    opt.value = item.id || item.region_id;
                    opt.textContent = item.region_name || item.name || item.title || `ဒေသ #${item.id}`;
                    regionSelect.appendChild(opt);
                });
            }
        })
        .catch((err) => {
            console.log("ℹ️ [Options] Backend API မရှိသေးပါက Default Option များ ဖြည့်ပေးထားပါသည် ငြိမ်း။");
            // API ချိတ်မရသေးပါက fallback static options များ ထည့်ပေးခြင်း
            populateDefaultDropdowns(varietySelect, regionSelect);
        });
}

/**
 * API မရှိသေးချိန် သို့မဟုတ် ချိတ်ဆက်မှုမရချိန်တွင် ပြသပေးမည့် Default Dropdown များ
 */
function populateDefaultDropdowns(varietySelect, regionSelect) {
    if (varietySelect) {
        varietySelect.innerHTML = `
            <option value="all">ဆန်မျိုးအစား (အားလုံး)</option>
            <option value="1">ပေါ်ဆန်းမွှေး</option>
            <option value="2">ဧည့်မထ</option>
            <option value="3">ရက်၉၀</option>
            <option value="4">ဆင်းသုခ</option>
        `;
    }
    if (regionSelect) {
        regionSelect.innerHTML = `
            <option value="all">တိုင်း/ပြည်နယ် (အားလုံး)</option>
            <option value="1">ရန်ကုန်</option>
            <option value="2">မန္တလေး</option>
            <option value="3">ဧရာဝတီ</option>
            <option value="4">ပဲခူး</option>
        `;
    }
}

/**
 * Backend API မှ KPI Summary ဒေတာများကို ဆွဲယူသည့် Function
 */
function loadDashboardData() {
    fetch("http://127.0.0.1:5000/api/kpi-summary")
        .then((res) => {
            if (!res.ok) throw new Error("Dashboard API ချိတ်ဆက်မှု ပျက်ကွက်ပါသည်");
            return res.json();
        })
        .then((data) => {
            if (!data.ok) {
                console.error("Dashboard Data Error:", data.reason);
                return;
            }

            const k = data.summary;

            // ကတ် (၁) - လက်ရှိ ဆန်စျေး
            createKpiCard("currentPriceCard", {
                label: "လက်ရှိ ဆန်စျေး",
                value: `${Number(k.currentPrice).toLocaleString("en-US")} ကျပ်`,
                changePct: k.priceChangePct,
                icon: "🪙"
            });
            
            // ကတ် (၂) - AI ခန့်မှန်းစျေး
            createKpiCard("predictedPriceCard", {
                label: "ခန့်မှန်းစျေး (လာမည့်လ)",
                value: `${Number(k.predictedPrice).toLocaleString("en-US")} ကျပ်`,
                changePct: k.predictedChangePct,
                icon: "📊"
            });
            
            // ကတ် (၃) - လစဉ် အမြတ်
            createKpiCard("monthlyProfitCard", {
                label: "လစဉ် အမြတ်",
                value: `${Number(k.monthlyProfit).toLocaleString("en-US")} ကျပ်`,
                changePct: k.monthlyProfitChangePct,
                icon: "💼"
            });
            
            // ကတ် (၄) - ဝယ်လိုအား (Demand)
            createKpiCard("demandTrendCard", {
                label: "ဝယ်လိုအား အလားအလာ",
                value: `${Number(k.demandTrendPct).toLocaleString()}% တိုး`,
                changePct: k.demandTrendPct,
                icon: "📈",
                hint: "မြင့်တက်"
            });
            
            // ကတ် (၅) - ရောင်းလိုအား (Supply)
            createKpiCard("supplyTrendCard", {
                label: "ရောင်းလိုအား အလားအလာ",
                value: `${Number(Math.abs(k.supplyTrendPct)).toLocaleString()}% လျော့`,
                changePct: k.supplyTrendPct,
                icon: "📉",
                invertColor: true,
                hint: "ကျဆင်း"
            });
        })
        .catch((err) => {
            console.error("Error loading dashboard data:", err);
        });
}

/**
 * 📊 ဝယ်လိုအားနှင့် ရောင်းလိုအား Bar Chart ကို သေချာပေါက် ပုံဖော်ပေးမည့် Function
 */
function loadChartData() {
    const ctx = document.getElementById('demandSupplyChart') || document.getElementById('barChart');
    if (!ctx) {
        console.error("❌ HTML ထဲတွင် canvas ရှာမတွေ့ပါ ငြိမ်း။");
        return;
    }

    const defaultMonths = ['ဇန်', 'ဖေ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်', 'ဇူ'];
    const defaultDemands = [410, 430, 450, 490, 505, 525, 550]; 
    const defaultSupplies = [470, 450, 435, 415, 395, 380, 365]; 

    let myChart = renderLiveChart(ctx, defaultMonths, defaultDemands, defaultSupplies);

    fetch("http://127.0.0.1:5000/api/demand-supply")
        .then(res => {
            if (!res.ok) throw new Error("Backend API သို့ ချိတ်ဆက်၍မရပါ");
            return res.json();
        })
        .then(realData => {
            const months = realData.map(item => item.month_name || item.month);
            const demands = realData.map(item => item.demand);
            const supplies = realData.map(item => item.supply);
            
            myChart.data.labels = months;
            myChart.data.datasets[0].data = demands;
            myChart.data.datasets[1].data = supplies;
            myChart.update(); 
            console.log("✅ Flask Database ထဲမှ Live Real Data များကို ဂရပ်ဖ်ထဲ ထည့်သွင်းပြီးပါပြီ ငြိမ်း။");
        })
        .catch(err => {
            console.log("ℹ️ [Local Mode] အသင့်ပါရှိသော ဒေတာဖြင့် ဂရပ်ဖ်ကို ပုံဖော်ထားပါသည် ငြိမ်း။");
        });
}

/**
 * Chart.js ဖြင့် ဂရပ်ဖ်အလှဆွဲပေးသော သီးသန့် Function
 */
function renderLiveChart(ctx, labels, demandData, supplyData) {
    if (window.myDemandSupplyChart) {
        window.myDemandSupplyChart.destroy();
    }

    window.myDemandSupplyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'ဝယ်လိုအား',
                    data: demandData,
                    backgroundColor: '#1b5e20',
                    borderRadius: 4
                },
                {
                    label: 'ရောင်းလိုအား',
                    data: supplyData,
                    backgroundColor: '#dda15e',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { family: 'Noto Sans Myanmar', size: 12 } }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 600,
                    ticks: { stepSize: 150, font: { family: 'Noto Sans Myanmar', size: 12 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'Noto Sans Myanmar', size: 12 } }
                }
            }
        }
    });
    return window.myDemandSupplyChart;
}

/**
 * HTML KPI Card ပုံစံကို Dynamic ဆွဲပေးမည့် Function
 */
function createKpiCard(containerId, props) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { label, value, changePct, icon, invertColor = false, hint = "" } = props;

    const isUp = (changePct ?? 0) >= 0;
    const isPositive = invertColor ? !isUp : isUp;
    
    const badgeClass = isPositive ? "bg-success text-white" : "bg-danger text-white";
    const arrowIcon = isUp ? "📈" : "📉";

    let badgeHtml = "";
    if (changePct !== undefined) {
        badgeHtml = `
            <span class="badge ${badgeClass} d-inline-flex align-items-center gap-1" style="font-size: 11px; padding: 4px 8px; border-radius: 20px;">
                ${arrowIcon} ${Math.abs(changePct)}%
            </span>
        `;
    }

    container.innerHTML = `
        <div class="card p-3 shadow-sm h-100" style="border-radius: 12px; border: 1px solid #eaeaea;">
            <div class="d-flex justify-content-between align-items-center">
                <span class="text-muted font-weight-medium" style="font-size: 12px;">${label}</span>
                <span class="p-2 rounded bg-light text-primary d-flex align-items-center" style="width: 32px; height: 32px; justify-content: center; font-size: 16px;">
                    ${icon}
                </span>
            </div>
            <h3 class="mt-3 font-weight-bold text-dark mb-1" style="font-size: 20px;">${value}</h3>
            <div class="d-flex align-items-center gap-2 mt-1">
                ${badgeHtml}
                ${hint ? `<small class="text-muted" style="font-size: 11px;">${hint}</small>` : ""}
            </div>
        </div>
    `;
}