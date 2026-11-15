document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://127.0.0.1:5000/api/rice-varieties';

    // State Management
    let currentItems = [];
    let filteredItems = [];
    let currentPage = 1;
    const itemsPerPage = 7;
    let deleteTargetId = null;

    // DOM Elements
    const tableBody = document.getElementById('riceTableBody');
    const searchInput = document.getElementById('searchInput');
    const btnSearch = document.getElementById('btnSearch');
    const entriesInfo = document.getElementById('entriesInfo');
    const pageNumbers = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    // Modals
    const riceModal = document.getElementById('riceModal');
    const deleteModal = document.getElementById('deleteModal');
    const btnAddNew = document.getElementById('btnAddNew');
    const closeModal = document.getElementById('closeModal');
    const cancelModal = document.getElementById('cancelModal');
    const riceForm = document.getElementById('riceForm');
    const modalTitle = document.getElementById('modalTitle');
    const cancelDelete = document.getElementById('cancelDelete');
    const confirmDelete = document.getElementById('confirmDelete');

    // ၁။ Fetch Data from Flask Backend API (Database မှ Data များ ခေါ်ယူခြင်း)
    async function fetchRiceData() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();

            if (Array.isArray(data)) {
                currentItems = data;
            } else if (typeof data === 'object' && data !== null) {
                currentItems = Object.entries(data).map(([id, item]) => ({ id, ...item }));
            } else {
                currentItems = [];
            }

            filteredItems = [...currentItems];
            renderTable();
        } catch (error) {
            console.error('API Fetch Error:', error);
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px; color: #ef4444;">Backend API နှင့် ချိတ်ဆက်၍ မရပါ သို့မဟုတ် Data မရှိပါ။</td></tr>`;
            updatePaginationInfo(0, 0, 0);
        }
    }

    // Render Table Function
    function renderTable() {
        tableBody.innerHTML = '';

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = filteredItems.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px; color: #94a3b8;">မလိုချင်သော ဒေတာမရှိပါ/ရှာမတွေ့ပါ။</td></tr>`;
            updatePaginationInfo(0, 0, 0);
            return;
        }

        pageData.forEach((item, index) => {
            const rowNumber = startIndex + index + 1;
            const row = document.createElement('tr');

            let badgeStyleClass = 'type-default';
            if (item.badge && item.badge.includes('Premium')) badgeStyleClass = 'type-premium';
            else if (item.badge && item.badge.includes('Standard')) badgeStyleClass = 'type-regular';
            else if (item.badge && item.badge.includes('Short')) badgeStyleClass = 'type-short';
            else if (item.badge && item.badge.includes('Glutinous')) badgeStyleClass = 'type-glutinous';
            else if (item.badge && item.badge.includes('Healthy')) badgeStyleClass = 'type-healthy';
            else if (item.badge && item.badge.includes('Special')) badgeStyleClass = 'type-special';

            const imgSrc = item.image || '../images/Pawsan.jpg';

            row.innerHTML = `
                <td><strong>${rowNumber}</strong></td>
                <td><img src="${imgSrc}" alt="${item.name || ''}" class="rice-img" onerror="this.src='https://via.placeholder.com/60x48?text=Rice';"></td>
                <td><strong>${item.name || '-'}</strong></td>
                <td><span class="badge-type ${badgeStyleClass}">${item.type || 'ဆန်'}</span></td>
                <td>${item.origin || item.main_region || '-'}</td>
                <td>${item.price ? String(item.price).replace(' MMK', '').replace(' / အိတ်', '') : '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="openEditModal('${item.id}')">
                            <i class="fa-regular fa-pen-to-square"></i> Edit
                        </button>
                        <button class="btn-delete" onclick="openDeleteModal('${item.id}')">
                            <i class="fa-regular fa-trash-can"></i> Delete
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        updatePaginationInfo(startIndex + 1, Math.min(endIndex, filteredItems.length), filteredItems.length);
        renderPaginationControls();
    }

    // Pagination Display Update
    function updatePaginationInfo(start, end, total) {
        entriesInfo.textContent = `Showing ${total === 0 ? 0 : start} to ${end} of ${total} entries`;
    }

    function renderPaginationControls() {
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
        pageNumbers.innerHTML = '';

        for (let i = 1; i <= totalPages; i++) {
            const numBtn = document.createElement('button');
            numBtn.className = `page-num ${i === currentPage ? 'active' : ''}`;
            numBtn.textContent = i;
            numBtn.addEventListener('click', () => {
                currentPage = i;
                renderTable();
            });
            pageNumbers.appendChild(numBtn);
        }

        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    // Search Logic
    function handleSearch() {
        const query = searchInput.value.trim().toLowerCase();
        filteredItems = currentItems.filter(item =>
            (item.name && item.name.toLowerCase().includes(query)) ||
            (item.type && item.type.toLowerCase().includes(query)) ||
            (item.origin && item.origin.toLowerCase().includes(query))
        );
        currentPage = 1;
        renderTable();
    }

    searchInput.addEventListener('input', handleSearch);
    btnSearch.addEventListener('click', handleSearch);

    // Pagination Events
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });

    // Modals Open & Close Logic
    btnAddNew.addEventListener('click', () => {
        modalTitle.textContent = 'Add New Rice';
        riceForm.reset();
        document.getElementById('riceId').value = '';
        riceModal.classList.add('active');
    });

    closeModal.addEventListener('click', () => riceModal.classList.remove('active'));
    cancelModal.addEventListener('click', () => riceModal.classList.remove('active'));

    window.openEditModal = function (id) {
        const item = currentItems.find(r => String(r.id) === String(id));
        if (!item) return;

        modalTitle.textContent = 'Edit Rice Info';
        document.getElementById('riceId').value = item.id;
        document.getElementById('inputName').value = item.name || '';
        document.getElementById('inputBadge').value = item.badge || '';
        document.getElementById('inputType').value = item.type || '';
        document.getElementById('inputPrice').value = item.price || '';
        document.getElementById('inputOrigin').value = item.origin || '';
        document.getElementById('inputMainRegion').value = item.main_region || item.mainRegion || '';
        document.getElementById('inputImage').value = item.image || '';
        document.getElementById('inputDescription').value = item.description || '';

        // HTML Form ထဲတွင် ရှိခဲ့ပါက သတ်မှတ်ပေးရန်
        if (document.getElementById('inputSoil')) document.getElementById('inputSoil').value = item.soil || '';
        if (document.getElementById('inputHarvest')) document.getElementById('inputHarvest').value = item.harvest || '';
        if (document.getElementById('inputRecommendation')) document.getElementById('inputRecommendation').value = item.recommendation || '';

        riceModal.classList.add('active');
    };

    // ၂။ Add (POST) နှင့် Update (PUT) ကို Backend API သို့ ပို့၍ Database ထဲ သိမ်းဆည်းခြင်း
    riceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('riceId').value;

        // Backend app.py ရဲ့ Key အမည်များနှင့် ကိုက်ညီအောင် ပြင်ဆင်ထားသော Payload
        const payload = {
            id: id,
            name: document.getElementById('inputName').value,
            badge: document.getElementById('inputBadge').value,
            type: document.getElementById('inputType').value,
            price: document.getElementById('inputPrice').value,
            origin: document.getElementById('inputOrigin').value,
            main_region: document.getElementById('inputMainRegion').value, // Backend 'main_region' နှင့် တူအောင် ပြင်ထားပါသည်
            image: document.getElementById('inputImage').value,
            description: document.getElementById('inputDescription').value,
            soil: document.getElementById('inputSoil') ? document.getElementById('inputSoil').value : '',
            harvest: document.getElementById('inputHarvest') ? document.getElementById('inputHarvest').value : '',
            recommendation: document.getElementById('inputRecommendation') ? document.getElementById('inputRecommendation').value : ''
        };

        try {
            let response;
            if (id) {
                // Update လုပ်ခြင်း (PUT)
                response = await fetch(`${API_URL}/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                // အသစ်ထည့်ခြင်း (POST)
                response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (response.ok) {
                riceModal.classList.remove('active');
                await fetchRiceData(); // Database မှ Data အသစ်ကို ပြန်ဆွဲထုတ်ပြခြင်း
            } else {
                alert('Database ထဲသို့ အချက်အလက် သိမ်းဆည်းရာတွင် အမှားအယွင်းရှိနေပါသည်။');
            }
        } catch (error) {
            console.error('Error saving data:', error);
            alert('Backend API သို့ ချိတ်ဆက်၍ မရပါ။');
        }
    });

    // ၃။ Delete Modal နှင့် API (DELETE) မှတစ်ဆင့် Database ထဲမှ ဖျက်ခြင်း
    window.openDeleteModal = function (id) {
        deleteTargetId = id;
        deleteModal.classList.add('active');
    };

    cancelDelete.addEventListener('click', () => {
        deleteTargetId = null;
        deleteModal.classList.remove('active');
    });

    confirmDelete.addEventListener('click', async () => {
        if (deleteTargetId) {
            try {
                const response = await fetch(`${API_URL}/${deleteTargetId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    deleteModal.classList.remove('active');
                    deleteTargetId = null;
                    await fetchRiceData(); // Database ထဲမှ ဖျက်ပြီးနောက် Data အသစ် ပြန်ယူခြင်း
                } else {
                    alert('Data ဖျက်ရာတွင် အမှားအယွင်းရှိနေပါသည်။');
                }
            } catch (error) {
                console.error('Error deleting data:', error);
                alert('Backend API သို့ ချိတ်ဆက်၍ မရပါ။');
            }
        }
    });

    // Initial Fetch
    fetchRiceData();
});