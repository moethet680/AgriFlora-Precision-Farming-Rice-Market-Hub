// frontend/js/forecast-view.js

document.addEventListener("DOMContentLoaded", () => {
    const forecastContainer = document.getElementById("forecastContainer");
    if (!forecastContainer) return;

    // ၁။ Backend API မှတစ်ဆင့် AI ခန့်မှန်းချက် (Forecasts) အချက်အလက်များ ဆွဲယူခြင်း
    // (အကယ်၍ ဖွင့်ထားတဲ့ Page အရ variety_id တွေ လိုအပ်ရင် အနောက်က Query ပါတာ သုံးနိုင်ပါတယ်)
    fetch("http://127.0.0.1:5000/api/all-forecasts")
        .then(res => {
            if (!res.ok) throw new Error("AI ခန့်မှန်းချက်ဒေတာများကို ဆွဲယူ၍မရပါ");
            return res.json();
        })
        .then(data => {
            if (!data.ok) {
                forecastContainer.innerHTML = `<p class="text-danger">Error: ${data.reason}</p>`;
                return;
            }

            if (data.forecasts.length === 0) {
                forecastContainer.innerHTML = `<p class="text-muted text-center">ခန့်မှန်းချက်မှတ်တမ်းများ မရှိသေးပါ</p>`;
                return;
            }

            // ၂။ ရလာတဲ့ ဒေတာတစ်ခုချင်းစီကို HTML Card များအဖြစ် ပြောင်းလဲခြင်း
            let htmlContent = "";

            data.forecasts.forEach(f => {
                // အတက်အကျ ရာခိုင်နှုန်းနှင့် အခြေအနေ တွက်ချက်ခြင်း
                const diff = f.predicted_price - f.current_price;
                const isUp = diff >= 0;
                const pct = ((Math.abs(diff) / f.current_price) * 100).toFixed(1);

                // Badge အတွက် Bootstrap Class နှင့် မြှားသင်္ကေတ သတ်မှတ်ခြင်း
                const badgeClass = isUp ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger";
                const arrowIcon = isUp ? "📈" : "📉";
                const priceClass = isUp ? "text-success" : "text-danger";

                htmlContent += `
                    <div class="card mb-4 shadow-sm">
                        <div class="card-header d-flex justify-content-between align-items-center bg-transparent">
                            <h5 class="card-title mb-0 font-weight-bold" style="font-size: 16px;">${f.variety_name}</h5>
                            <span class="badge ${badgeClass} p-2 d-flex align-items-center gap-1">
                                ${arrowIcon} ${Number(pct).toLocaleString()} %
                            </span>
                        </div>
                        <div class="card-body d-flex flex-col gap-3">
                            <div class="d-flex justify-content-between align-items-end mb-3">
                                <div>
                                    <small class="text-muted" style="font-size: 11px;">လက်ရှိစျေး</small>
                                    <p class="mb-0 font-weight-semibold text-dark">${Number(f.current_price).toLocaleString()} ကျပ်</p>
                                </div>
                                <div class="text-muted font-weight-bold">→</div>
                                <div class="text-right">
                                    <small class="text-muted" style="font-size: 11px;">ခန့်မှန်းစျေး</small>
                                    <p class="mb-0 font-weight-bold ${priceClass}" style="font-size: 18px;">${Number(f.predicted_price).toLocaleString()} ကျပ်</p>
                                </div>
                            </div>

                            <div class="mb-3">
                                <div class="d-flex justify-content-between text-muted" style="font-size: 11px;">
                                    <span>AI ယုံကြည်စိတ်ချမှု</span>
                                    <span class="font-weight-bold text-dark">${Number(f.confidence).toLocaleString()}%</span>
                                </div>
                                <div class="progress mt-1" style="height: 6px; border-radius: 10px;">
                                    <div class="progress-bar bg-success" role="progressbar" 
                                         style="width: ${f.confidence}%; border-radius: 10px;" 
                                         aria-valuenow="${f.confidence}" aria-valuemin="0" aria-valuemax="100">
                                    </div>
                                </div>
                            </div>

                            <div class="p-2 rounded bg-light" style="font-size: 13px; line-height: 1.5; color: #333;">
                                💡 <strong>AI အကြံပြုချက်:</strong> ${f.recommendation || 'စျေးကွက်စောင့်ကြည့်ရန်'}
                            </div>
                        </div>
                    </div>
                `;
            });

            forecastContainer.innerHTML = htmlContent;
        })
        .catch(err => {
            console.error("Error loading forecasts:", err);
            forecastContainer.innerHTML = `<p class="text-danger text-center">ဆာဗာချိတ်ဆက်မှု ချို့ယွင်းနေပါသည်</p>`;
        });
});