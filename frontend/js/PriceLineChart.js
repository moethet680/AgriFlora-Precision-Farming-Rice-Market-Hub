// frontend/js/PriceLineChart.js
let priceLineChartInstance = null;

function initPriceLineChart(varietyId = 1, regionId = 1) {
    const ctx = document.getElementById('lineChart');
    if (!ctx) return;

    // String အလွတ် သို့မဟုတ် မမှန်ကန်သော တန်ဖိုးများကို Default (1) သို့ ပြောင်းလဲခြင်း
    if (!varietyId || String(varietyId).trim() === "" || varietyId === "undefined" || varietyId === "null") {
        varietyId = 1;
    }
    if (!regionId || String(regionId).trim() === "" || regionId === "undefined" || regionId === "null") {
        regionId = 1;
    }

    // ပုံသေပေါ်နေမယ့် လအမည် ၁၀ လ (Backend မလာသေးပါက ပြသရန်)
    const fixedLabels = ["ဇန်", "ဖေ", "မတ်", "ဧပြီ", "မေ", "ဇွန်", "ဇူ", "သြ", "စက်", "အောက်"];
    
    // API URL ဆောက်လုပ်ခြင်း
    const apiUrl = `${API_BASE}/trends?variety_id=${varietyId}&region_id=${regionId}&months=3`;

    fetch(apiUrl)
        .then(res => {
            if (!res.ok) throw new Error("ဒေတာဆွဲယူရယူခြင်း မအောင်မြင်ပါ");
            return res.json();
        })
        .then(data => {
            if (data && data.ok) {
                const mergedMap = {};

                data.history.forEach((h) => {
                    mergedMap[h.date] = { month: formatDateLabel(h.date), actual: h.price, predicted: null };
                });
                data.forecast.forEach((f) => {
                    if (mergedMap[f.date]) {
                        mergedMap[f.date].predicted = f.price; 
                    } else {
                        mergedMap[f.date] = { month: formatDateLabel(f.date), actual: null, predicted: f.price };
                    }
                });

                const finalChartData = Object.values(mergedMap);
                const labels = finalChartData.map(d => d.month);
                const currentPrices = finalChartData.map(d => d.actual);
                const predictedPrices = finalChartData.map(d => d.predicted);

                renderChart(ctx, labels, currentPrices, predictedPrices);
            } else {
                renderChart(ctx, fixedLabels, [], []); 
            }
        })
        .catch(err => {
            console.log("Backend ဒေတာ မရောက်သေးပါ။ ပုံသေ Template အတိုင်း ပြသထားပါသည် ငြိမ်း။");
            renderChart(ctx, fixedLabels, [], []); 
        });
}

// Date Format ကို မြန်မာလအမည် အတိုပြောင်းပေးသည့် Utility
function formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const monthNames = ["ဇန်", "ဖေ", "မတ်", "ဧပြီ", "မေ", "ဇွန်", "ဇူ", "သြ", "စက်", "အောက်", "နို", "ဒီ"];
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // Format မမှန်ပါက မူရင်းအတိုင်းပြ
    return monthNames[d.getMonth()];
}

function renderChart(ctx, labels, currentPrices, predictedPrices) {
    if (priceLineChartInstance) {
        priceLineChartInstance.destroy();
    }

    priceLineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'လက်ရှိစျေး',
                    data: currentPrices.length ? currentPrices : [],
                    borderColor: '#3a7d44',
                    backgroundColor: '#3a7d44',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#3a7d44',
                    pointBorderWidth: 2,
                    pointRadius: currentPrices.length ? 4 : 0,
                    tension: 0.3,
                    spanGaps: true
                },
                {
                    label: 'ခန့်မှန်းစျေး',
                    data: predictedPrices.length ? predictedPrices : [],
                    borderColor: '#d97706',
                    backgroundColor: 'transparent',
                    borderWidth: 2.5,
                    borderDash: [5, 5],
                    pointRadius: predictedPrices.length ? 3 : 0,
                    tension: 0.3,
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { 
                        boxWidth: 12, 
                        usePointStyle: true, 
                        pointStyle: 'circle', 
                        font: { family: 'Padauk, sans-serif', size: 12 } 
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toLocaleString() + ' ကျပ်';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: { 
                    grid: { display: false }, 
                    ticks: { font: { family: 'Padauk, sans-serif', size: 11 }, color: '#666' } 
                },
                y: {
                    beginAtZero: false, // ပုံသေမဟုတ်ဘဲ စျေးနှုန်းအလိုက် Auto Dynamic Scale
                    ticks: {
                        font: { family: 'Padauk, sans-serif', size: 11 }, 
                        color: '#666',
                        callback: function(value) { 
                            return value >= 1000 ? (value / 1000) + 'ထ' : value; 
                        }
                    }
                }
            }
        }
    });
}