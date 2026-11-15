// frontend/js/kpi-card.js

/**
 * KPI Card များကို Dynamic ဆွဲပေးမည့် Utility Function
 * @param {string} containerId - ကတ်ပြားသွားထည့်မည့် HTML Div ရဲ့ ID
 * @param {object} props - ကတ်ပြားတွင်ပြသမည့် အချက်အလက်များ
 */
function createKpiCard(containerId, props) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { label, value, changePct, icon, invertColor = false, hint = "" } = props;

    // ၁။ အပေါင်း/အနုတ် နှင့် invertColor ပေါ်မူတည်၍ အစိမ်း/အနီ အရောင်သတ်မှတ်ခြင်း
    const isUp = (changePct ?? 0) >= 0;
    const isPositive = invertColor ? !isUp : isUp;
    
    // Bootstrap Class သတ်မှတ်ခြင်း (စိမ်း/နီ)
    const badgeClass = isPositive ? "bg-success text-white" : "bg-danger text-white";
    const arrowIcon = isUp ? "📈" : "📉";

    // ၂။ တန်ဖိုးရှိ/မရှိပေါ်မူတည်၍ ရာခိုင်နှုန်း Badge HTML တည်ဆောက်ခြင်း
    let badgeHtml = "";
    if (changePct !== undefined) {
        badgeHtml = `
            <span class="badge ${badgeClass} d-inline-flex align-items-center gap-1" style="font-size: 11px; padding: 4px 8px; border-radius: 20px;">
                ${arrowIcon} ${Math.abs(changePct)}%
            </span>
        `;
    }

    // ၃။ ကတ်ပြားတစ်ခုလုံး၏ HTML ပုံစံတည်ဆောက်ခြင်း (Bootstrap စတိုင်)
    container.innerHTML = `
        <div class="card p-3 shadow-sm h-100">
            <div class="d-flex justify-content-between align-items-center">
                <span class="text-muted font-weight-medium" style="font-size: 12px;">${label}</span>
                <span class="p-2 rounded bg-light text-primary d-flex align-items-center" style="width: 32px; height: 32px; justify-content: center;">
                    ${icon}
                </span>
            </div>
            <h3 class="mt-3 font-weight-bold text-dark mb-1" style="font-size: 22px;">${value}</h3>
            <div class="d-flex align-items-center gap-2 mt-1">
                ${badgeHtml}
                ${hint ? `<small class="text-muted" style="font-size: 11px;">${hint}</small>` : ""}
            </div>
        </div>
    `;
}