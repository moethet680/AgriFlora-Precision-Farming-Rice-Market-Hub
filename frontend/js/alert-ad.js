// =================================================
// 0. Flask Backend API URL (Port 5000 သို့ ညွှန်းပေးထားပါသည်)
// =================================================
const API_BASE_URL = 'http://127.0.0.1:5000';

// =================================================
// ၁။ Admin Table ထဲသို့ Weekly Price Data များကို ဆွဲထုတ်ပြခြင်း (Image ဖြုတ်ထားပါသည်)
// =================================================
async function loadPriceTable() {
    const tbody = document.getElementById('priceTableBody');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/price-history`);
        const result = await response.json();

        // Array အဖြစ် တိုက်ရိုက်လာခဲ့ရင်ရော၊ status: 'success' နဲ့ လာခဲ့ရင်ရော စစ်ဆေးပေးထားပါသည်
        const dataList = Array.isArray(result) ? result : (result.data || []);

        if (dataList.length > 0) {
            tbody.innerHTML = dataList.map((item, index) => {
                const id = item.price_id || item.id;
                const riceName = item.rice_name || '-';
                const weekNo = item.week_no || '';
                const price = item.price || '';
                const recordDate = item.record_date || '';

                return `
                    <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100">
                        <td class="py-4 px-4 font-bold text-slate-700">${index + 1}</td>
                        <td class="py-4 px-4 font-bold text-gray-800 text-base">
                            ${riceName}
                        </td>
                        <td class="py-4 px-4 text-slate-600">Week ${weekNo}</td>
                        <td class="py-4 px-4 font-bold text-slate-800">${Number(price).toLocaleString()}</td>
                        <td class="py-4 px-4 text-slate-500">${recordDate ? new Date(recordDate).toLocaleDateString() : ''}</td>
                        <td class="py-4 px-4">
                            <div class="flex items-center justify-center gap-2">
                                <button onclick="openEditModal('${id}', '${riceName}', '${weekNo}', '${price}', '${recordDate}')" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">✏️</button>
                                <button onclick="deletePrice('${id}')" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-400">ဈေးနှုန်း မှတ်တမ်းများ မရှိသေးပါ။</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading price table:', error);
    }
}

// =================================================
// ၂။ Admin ဘက်မှ ဈေးနှုန်းထည့်သွင်းခြင်း (Price Entry)
// =================================================
const priceForm = document.getElementById('priceEntryForm');

if (priceForm) {
    priceForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const payload = {
            rice_name: document.getElementById('riceNameInput') ? document.getElementById('riceNameInput').value.trim() : '',
            week_no: document.getElementById('weekNoInput') ? document.getElementById('weekNoInput').value : '',
            price: document.getElementById('priceInput') ? document.getElementById('priceInput').value : '',
            record_date: document.getElementById('dateInput') ? document.getElementById('dateInput').value : ''
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/add-price`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok || result.status === 'success') {
                alert(`✅ ${result.message || 'ဈေးနှုန်း စာရင်းသွင်းပြီးပါပြီ'}`);
                priceForm.reset();

                loadPriceTable();
                loadNotifications();
            } else {
                alert(`❌ Error: ${result.message || 'အတည်ပြု၍ မရပါ'}`);
            }
        } catch (error) {
            console.error('API Error:', error);
            alert('❌ Server သို့ ချိတ်ဆက်၍ မရပါ။ Flask App Run ထားလား စစ်ဆေးပါ။');
        }
    });
} else {
    console.warn("သတိပေးချက်: 'priceEntryForm' ID ရှိသော <form> Tag ကို ရှာမတွေ့ပါ။");
}


// =================================================
// ၃။ Edit Modal & Update Functionality
// =================================================

// (က) ✏️ ခဲတံနှိပ်လိုက်ရင် Modal Box ပွင့်လာပြီး Data များ ဖြည့်ပေးခြင်း
function openEditModal(id, riceName, weekNo, price, recordDate) {
    const editModal = document.getElementById('editModal');
    if (!editModal) {
        console.error("Modal element '#editModal' မတွေ့ပါ။");
        return;
    }

    document.getElementById('editPriceId').value = id;
    document.getElementById('editRiceName').value = riceName;
    document.getElementById('editWeekNo').value = weekNo;
    document.getElementById('editPrice').value = price;

    // ISO Date String ဖြစ်နေပါက YYYY-MM-DD format သို့ ပြောင်းလဲပေးခြင်း
    if (recordDate) {
        const formattedDate = recordDate.includes('T') ? recordDate.split('T')[0] : recordDate;
        document.getElementById('editRecordDate').value = formattedDate;
    }

    editModal.classList.remove('hidden');
}

// (ခ) Modal Box ပြန်ပိတ်ခြင်း
function closeEditModal() {
    const editModal = document.getElementById('editModal');
    if (editModal) {
        editModal.classList.add('hidden');
    }
}

// (ဂ) Modal ထဲမှ ပြင်ဆင်ထားသည်များကို Backend (Flask) သို့ Update ပို့ခြင်း
async function submitEdit(event) {
    event.preventDefault();

    const priceId = document.getElementById('editPriceId').value;
    const payload = {
        price_id: priceId,
        rice_name: document.getElementById('editRiceName').value.trim(),
        week_no: document.getElementById('editWeekNo').value,
        price: document.getElementById('editPrice').value,
        record_date: document.getElementById('editRecordDate').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/update-price`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok || result.status === 'success') {
            alert('✅ ဈေးနှုန်း ပြင်ဆင်ပြီးပါပြီ');
            closeEditModal();
            loadPriceTable();
            loadNotifications();
        } else {
            alert(`❌ Error: ${result.message || 'ပြင်ဆင်မှု မအောင်မြင်ပါ'}`);
        }
    } catch (error) {
        console.error('Update Error:', error);
        alert('❌ Server သို့ ချိတ်ဆက်၍ မရပါ။');
    }
}


// =================================================
// ၄။ Delete Function
// =================================================
async function deletePrice(id) {
    if (!confirm('ဒီဈေးနှုန်းမှတ်တမ်းကို ဖျက်မှာ သေချာပါသလား?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/delete-price/${id}`, { method: 'DELETE' });
        const result = await response.json();

        if (response.ok || result.status === 'success') {
            alert('✅ ဖျက်ပြီးပါပြီ');
            loadPriceTable();
            loadNotifications();
        } else {
            alert(`❌ Error: ${result.message || 'ဖျက်၍ မရပါ'}`);
        }
    } catch (error) {
        console.error('Delete Error:', error);
        alert('❌ Server သို့ ချိတ်ဆက်၍ မရပါ။');
    }
}


// =================================================
// ၅။ User ဘက်တွင် Trend အလိုက် Notification Alerts ပြသခြင်း
// =================================================
async function loadNotifications() {
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/notifications`);
        const result = await response.json();

        const dataList = Array.isArray(result) ? result : (result.data || []);

        if (dataList.length > 0) {
            container.innerHTML = dataList.map(item => {
                let iconBg = 'bg-blue-100 text-blue-600';
                let icon = '➔';

                if (item.trend === 'UP') {
                    iconBg = 'bg-emerald-100 text-emerald-600';
                    icon = '↑';
                } else if (item.trend === 'DOWN') {
                    iconBg = 'bg-rose-100 text-rose-600';
                    icon = '↓';
                } else if (item.trend === 'SAME' || item.trend === 'UNCHANGED' || item.trend === 'STABLE') {
                    iconBg = 'bg-blue-100 text-blue-600';
                    icon = '➔';
                }

                return `
                    <div class="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 flex items-start justify-between gap-3 transition-colors mb-2">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full ${iconBg} flex items-center justify-center text-sm font-bold flex-shrink-0">
                                ${icon}
                            </div>
                            <div>
                                <h4 class="font-bold text-slate-800 text-sm">${item.rice_name || item.title}</h4>
                                <p class="text-xs text-slate-600 mt-0.5">${item.message}</p>
                            </div>
                        </div>
                        <span class="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">
                            ${item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                        </span>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = `<p class="text-xs text-center text-slate-400 py-6">အသိပေးချက်များ မရှိသေးပါ။</p>`;
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}


// =================================================
// ၆။ DOMContentLoaded (Auto Run)
// =================================================
document.addEventListener('DOMContentLoaded', () => {
    loadPriceTable();
    loadNotifications();
});