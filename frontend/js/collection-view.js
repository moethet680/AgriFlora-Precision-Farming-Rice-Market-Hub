// frontend/js/collection-view.js

document.addEventListener("DOMContentLoaded", () => {
    const priceForm = document.getElementById("priceForm");
    const recordsTableBody = document.getElementById("recordsTableBody");

    // ၁။ စာမျက်နှာစတက်လာတာနဲ့ လက်ရှိ Database ထဲက ဈေးနှုန်းမှတ်တမ်းများကို ဆွဲထုတ်ပြသခြင်း
    loadPriceRecords();

    // ၂။ Form တင်တဲ့အချိန် (မှတ်တမ်းတင်မည် ခလုတ်နှိပ်ချိန်) အလုပ်လုပ်မည့်အပိုင်း
    if (priceForm) {
        priceForm.addEventListener("submit", (e) => {
            e.preventDefault(); // Page မပြောင်းသွားအောင် တားဆီးခြင်း

            // Form ထဲက ရွေးချယ်/ရိုက်ထည့်ထားတဲ့ Data များကို ယူခြင်း
            const regionId = document.getElementById("regionSelect").value;
            const varietyId = document.getElementById("varietySelect").value;
            const price = document.getElementById("priceInput").value;

            if (!regionId || !varietyId || !price) {
                alert("ကျေးဇူးပြု၍ အချက်အလက်အားလုံးကို ပြည့်စုံစွာ ဖြည့်စွက်ပါ ငြိမ်း။");
                return;
            }

            // Backend API ဆီသို့ ပေးပို့မည့် Object Data
            const formData = {
                region_id: parseInt(regionId),
                variety_id: parseInt(varietyId),
                price: parseFloat(price)
            };

            // Backend POST API သို့ လှမ်းပို့ခြင်း
            fetch("http://127.0.0.1:5000/api/prices", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            })
            .then(res => {
                if (!res.ok) throw new Error("ဒေတာအသစ်သိမ်းဆည်းရန် ပျက်ကွက်ပါသည်");
                return res.json();
            })
            .then(data => {
                if (data.ok) {
                    alert("ဈေးနှုန်းမှတ်တမ်းကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။");
                    priceForm.reset(); // Input ကွက်များကို ဗလာပြန်လုပ်ခြင်း
                    loadPriceRecords(); // ဇယားထဲမှာ ချက်ချင်းဒေတာအသစ်ပေါ်လာအောင် စာရင်းပြန်ခေါ်ခြင်း
                } else {
                    alert("Error: " + data.reason);
                }
            })
            .catch(err => {
                console.error("Error saving price:", err);
                alert("Backend ဆာဗာနှင့် ချိတ်ဆက်၍ မရပါ ငြိမ်း။");
            });
        });
    }

    // ၃။ Database ထဲက ဈေးနှုန်းမှတ်တမ်းများကို ဆွဲယူပြီး Table ထဲ ထည့်ပေးသည့် Function
    function loadPriceRecords() {
        if (!recordsTableBody) return;

        fetch("http://127.0.0.1:5000/api/prices")
            .then(res => res.json())
            .then(data => {
                if (!data.ok) {
                    recordsTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">ဒေတာဆွဲယူမှု မအောင်မြင်ပါ</td></tr>`;
                    return;
                }

                if (data.records.length === 0) {
                    recordsTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">မှတ်တမ်းများ မရှိသေးပါ</td></tr>`;
                    return;
                }

                // ရလာတဲ့ Real Data များကို HTML <tr> တန်းများအဖြစ် ပြောင်းလဲခြင်း
                let tableHtml = "";
                data.records.forEach(r => {
                    tableHtml += `
                        <tr>
                            <td><strong>${r.region_name}</strong></td>
                            <td class="text-muted">${r.variety_name}</td>
                            <td class="text-right font-weight-bold">${Number(r.price).toLocaleString()} ကျပ်</td>
                            <td class="text-right">
                                <span class="badge bg-success text-white">
                                    ✓ Synced
                                </span>
                            </td>
                        </tr>
                    `;
                });
                recordsTableBody.innerHTML = tableHtml;
            })
            .catch(err => {
                console.error("Error loading prices:", err);
                recordsTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">ဆာဗာချိတ်ဆက်မှု ချို့ယွင်းနေပါသည်</td></tr>`;
            });
    }
});