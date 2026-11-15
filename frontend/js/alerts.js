// ဆာဗာကလာသမျှ ဒေတာအားလုံးကို သိမ်းထားမည့် Variable
let allAlerts = []; 

document.addEventListener("DOMContentLoaded", () => {
    const alertsContainer = document.getElementById("alertList");
    if (!alertsContainer) return;

    // 💡 ရှိသမျှ အမျိုးအစား နှင့် ဒေသ Dropdown ID အားလုံးကို ဆွဲဖမ်းခြင်း
    const varietySelects = document.querySelectorAll("#varietySelect, #alertVarietySelect");
    const regionSelects = document.querySelectorAll("#regionSelect, #alertRegionSelect");

    // 1. Backend API ထံမှ Alerts ဒေတာများကို လှမ်းယူခြင်း
    fetch("http://127.0.0.1:5000/api/alerts")
        .then((res) => {
            if (!res.ok) throw new Error("Alerts ဒေတာ ဆွဲယူ၍မရပါ");
            return res.json();
        })
        .then((alerts) => {
            allAlerts = alerts; 
            renderAlertsList(allAlerts, alertsContainer);
        })
        .catch((err) => {
            console.error("Error loading alerts:", err);
            alertsContainer.innerHTML = `<p class="text-danger text-sm text-center p-4">... ချို့ယွင်းချက်ရှိနေပါသည် ...</p>`;
        });

    // 2. အမျိုးအစား Dropdown ပြောင်းလဲမှုများကို စောင့်ကြည့်ခြင်း
    varietySelects.forEach(select => {
        select.addEventListener("change", (e) => {
            syncDropdowns("variety", e.target.value); 
            filterAlerts(); // Option ချိန်းတိုင်း ချက်ချင်း Filter လုပ်မည်
        });
    });

    // ဒေသ Dropdown ပြောင်းလဲမှုများကို စောင့်ကြည့်ခြင်း
    regionSelects.forEach(select => {
        select.addEventListener("change", (e) => {
            syncDropdowns("region", e.target.value); 
            filterAlerts(); // Option ချိန်းတိုင်း ချက်ချင်း Filter လုပ်မည်
        });
    });

    // 💡 ID ကွဲနေတဲ့ Dropdown တွေအကုန်လုံး Value ချင်း တူသွားအောင် လုပ်ပေးတဲ့ ဖန်ရှင်
    function syncDropdowns(type, value) {
        const selector = type === "variety" ? "#varietySelect, #alertVarietySelect" : "#regionSelect, #alertRegionSelect";
        document.querySelectorAll(selector).forEach(sel => {
            sel.value = value;
        });
    }

    // Filter လုပ်ပေးမည့် အဓိက ဖန်ရှင်
    function filterAlerts() {
        // လက်ရှိ သုံးနေတဲ့ Dropdown ထဲက ရွေးထားတဲ့ value တန်ဖိုးကို တိုက်ရိုက်ယူပါတယ်
        const firstVarietySelect = document.querySelector("#alertVarietySelect") || document.querySelector("#varietySelect");
        const firstRegionSelect = document.querySelector("#alertRegionSelect") || document.querySelector("#regionSelect");

        if (!firstVarietySelect || !firstRegionSelect) return;

        let selectedVarietyText = firstVarietySelect.value.trim();
        let selectedRegionText = firstRegionSelect.value.trim();

        // မြန်မာစာလုံး စစ်ထုတ်ရလွယ်အောင် "တိုင်းဒေသကြီး/ပြည်နယ်" စာသားများ သန့်စင်ခြင်း
        selectedRegionText = selectedRegionText.replace("တိုင်းဒေသကြီး", "").replace("တိုင်း", "").replace("ပြည်နယ်", "").trim();

        // ဇယားထဲက ဒေတာမူရင်းကို မပျက်စီးစေရန် Copy ကူး၍ Filter ပတ်ခြင်း
        let filtered = allAlerts;

        // ၁။ ဆန်အမျိုးအစား Filter ဖြတ်ခြင်း
        if (selectedVarietyText !== "" && selectedVarietyText !== "အားလုံး") {
            filtered = filtered.filter(a => {
                const message = a.message_mm || "";
                const title = a.title_mm || "";
                return message.includes(selectedVarietyText) || title.includes(selectedVarietyText);
            });
        }

        // ၂။ ဒေသ Filter ဖြတ်ခြင်း
        if (selectedRegionText !== "" && selectedRegionText !== "အားလုံး") {
            filtered = filtered.filter(a => {
                const message = a.message_mm || "";
                const title = a.title_mm || "";
                const dbRegion = (a.region || "").replace("တိုင်းဒေသကြီး", "").replace("တိုင်း", "").replace("ပြည်နယ်", "").trim();
                
                return dbRegion.includes(selectedRegionText) || 
                       selectedRegionText.includes(dbRegion) ||
                       message.includes(selectedRegionText) || 
                       title.includes(selectedRegionText);
            });
        }

        // စစ်ထုတ်ပြီးသား ဒေတာများကို မျက်နှာပြင်ပေါ်တွင် ပြန်ပြပေးခြင်း
        renderAlertsList(filtered, alertsContainer);
    }
}); 

// ဒေတာများကို HTML ကတ်ပြားလေးများအဖြစ် ပြောင်းလဲပေးသည့် သီးသန့်ဖန်ရှင်
function renderAlertsList(alertsData, container) {
    if (!container) return;
    container.innerHTML = ""; 

    if (alertsData.length === 0) {
        container.innerHTML = `<p class="text-sm text-center text-muted p-4">ရွေးချယ်ထားသော သတ်မှတ်ချက်အတွက် သတိပေးချက်အသစ် မရှိသေးပါရှင်</p>`;
        return;
    }

    let htmlContent = "";
    alertsData.forEach((a) => {
        let icon = "🔔";
        let badgeClass = "bg-primary-subtle text-primary";
        
        const type = (a.type || "").toLowerCase();
        const message = (a.message_mm || "");

        if (type === "price" || message.includes("ခန့်မှန်းချက်") || message.includes("မြင့်တက်")) {
            icon = "📈";
            badgeClass = "bg-success-subtle text-success";
        } else if (type === "shortage" || message.includes("သတိပေးချက်") || message.includes("ပြတ်လပ်မှု")) {
            icon = "⚠️";
            badgeClass = "bg-warning-subtle text-warning";
        } else if (type === "overstock" || message.includes("ပိုလျှံမှု")) {
            icon = "📦";
            badgeClass = "bg-danger-subtle text-danger";
        } else if (type === "forecast" || type === "info") {
            icon = "🤖";
            badgeClass = "bg-info-subtle text-info";
        }

        const unreadClass = a.is_read ? "" : "border-start border-4 border-primary";

        htmlContent += `
            <div class="card mb-3 p-3 ${unreadClass}">
                <div class="d-flex align-items-start gap-3">
                    <span class="rounded-circle p-2 ${badgeClass}" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                        ${icon}
                    </span>
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center gap-2">
                            <h6 class="mb-0 font-weight-bold">${a.title_mm || 'သတိပေးချက်'}</h6>
                            ${!a.is_read ? '<span class="badge bg-primary rounded-pill" style="width: 8px; height: 8px; padding: 0;"> </span>' : ''}
                        </div>
                        <p class="text-muted text-sm mb-1 mt-1">${a.message_mm || ''}</p>
                        <small class="text-muted" style="font-size: 11px;">${new Date(a.created_at).toLocaleDateString()}</small>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = htmlContent;
}