// frontend/js/charts.js

// Line Chart instance ကို သိမ်းဆည်းရန် Variable
let lineChartInstance = null;
let barChartInstance = null;

/**
 * 1. ဈေးနှုန်းလမ်းကြောင်း Line Chart ဆွဲပေးမည့် Function
 */
function renderLineChart(canvasId, history = [], forecast = [], currentChartInstance = null) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    // လက်ရှိ ရှိနေတဲ့ Chart ဟောင်းကို အရင်ဖျောက်ဖျက်ပစ်ပါတယ်
    if (currentChartInstance) {
        currentChartInstance.destroy();
    } else if (lineChartInstance) {
        lineChartInstance.destroy();
    }

    // History နှင့် Forecast မှ Labels နှင့် Data များကို သီးခြားခွဲထုတ်ခြင်း
    const labels = [];
    const actualData = [];
    const forecastData = [];

    // History ဒေတာများ ထည့်သွင်းခြင်း
    history.forEach(item => {
        labels.push(item.date || item.month);
        actualData.push(item.price);
        forecastData.push(null); // Actual ရှိချိန် Forecast ကို null ထားမည်
    });

    // Forecast ဒေတာများ ထည့်သွင်းခြင်း
    forecast.forEach(item => {
        labels.push(item.date || item.month);
        actualData.push(null); // Forecast ရှိချိန် Actual ကို null ထားမည်
        forecastData.push(item.price);
    });

    // Chart အသစ်ဖန်တီးခြင်း
    lineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length ? labels : ["ဇန်", "ဖေ", "မတ်", "ဧပြီ", "မေ", "ဇွန်"],
            datasets: [
                {
                    label: 'လက်ရှိစျေးနှုန်း',
                    data: actualData,
                    borderColor: '#3a7d44',
                    backgroundColor: '#3a7d44',
                    borderWidth: 2.5,
                    pointRadius: 4,
                    tension: 0.3,
                    spanGaps: true
                },
                {
                    label: 'AI ခန့်မှန်းစျေး',
                    data: forecastData,
                    borderColor: '#d97706',
                    backgroundColor: 'transparent',
                    borderWidth: 2.5,
                    borderDash: [5, 5],
                    pointRadius: 4,
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
                    labels: { font: { family: 'Padauk, sans-serif', size: 12 } }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return value >= 1000 ? (value / 1000) + 'ထ' : value;
                        }
                    }
                }
            }
        }
    });

    return lineChartInstance;
}

/**
 * 2. ဝယ်လိုအားနှင့် ရောင်းလိုအား Bar Chart ဆွဲပေးမည့် Function
 */
function renderBarChart(canvasId, labels = [], demandData = [], supplyData = []) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    if (barChartInstance) {
        barChartInstance.destroy();
    }

    const defaultLabels = ["ဇန်", "ဖေ", "မတ်", "ဧပြီ", "မေ", "ဇွန်"];
    const defaultDemand = [120, 150, 180, 140, 200, 210];
    const defaultSupply = [100, 130, 160, 170, 190, 180];

    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length ? labels : defaultLabels,
            datasets: [
                {
                    label: 'ဝယ်လိုအား (Demand)',
                    data: demandData.length ? demandData : defaultDemand,
                    backgroundColor: '#16a34a'
                },
                {
                    label: 'ရောင်းလိုအား (Supply)',
                    data: supplyData.length ? supplyData : defaultSupply,
                    backgroundColor: '#ca8a04'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { family: 'Padauk, sans-serif', size: 12 } }
                }
            }
        }
    });

    return barChartInstance;
}

/**
 * 3. Dashboard Chart များ အားလုံးကို Initialize လုပ်ပေးသည့် Function
 */
function initDashboardCharts(varietyId = 1, regionId = 1) {
    // PriceLineChart.js ထဲက function ရှိပါက ၎င်းကို ဦးစားပေး ခေါ်ယူမည်
    if (typeof initPriceLineChart === 'function') {
        initPriceLineChart(varietyId, regionId);
    } else {
        renderLineChart('lineChart');
    }

    // Bar Chart ကို ဆွဲပေးခြင်း
    renderBarChart('barChart');
}