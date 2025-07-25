
// --- Hotel data (name + release days) ---
// releaseDays represents how many days before arrival the allotment is released
const allotmentHotels = [
    { name: "Komaneka Keramas", releaseDays: 14, totalUnit: 1 },


    {
        name: "Komaneka Tanggayuda", releaseDays: 14, units: {
            "Valley Villa": 1,
            "Premier Valley Villa": 1
        }
    },


    {
        name: "Tejaprana Resort & Spa", releaseDays: 7, units: {
            "Terrace Villa": 3,
            "Valley Villa": 2
        }
    },


    { name: "The Trans Bali", releaseDays: 30, totalUnit: 3 },


    { name: "Double Six Luxury", releaseDays: 21, totalUnit: 1 },


    { name: "Tribe Kuta", releaseDays: 14, totalUnit: 1 },

];

// --- Website Users with Codes ---
window.allotmentUsers = [
    { name: "Andita", code: "an" },
    { name: "Zahra", code: "zh" },
    { name: "Caca", code: "cc" },
    { name: "Sofia", code: "sf" },
    { name: "Salma", code: "sm" },
    { name: "Sarah", code: "sr" },
    { name: "Aulia", code: "al" },
    { name: "Ramli", code: "rm" },
    { name: "Bandar", code: "bn" },
];






























// --- Custom Searchable Hotel Selector ---
function renderHotelSelector() {
    const container = document.getElementById('hotelSelectorContainer');
    container.innerHTML = `
        <input type="text" class="hotel-search-input" placeholder="Search hotel..." autocomplete="off" />
        <div class="hotel-dropdown-list" style="display:none;"></div>
    `;
    const input = container.querySelector('.hotel-search-input');
    const dropdown = container.querySelector('.hotel-dropdown-list');
    let filtered = allotmentHotels.slice();
    let dropdownOpen = false;
    let activeIndex = -1;

    function showDropdown() {
        dropdown.style.display = 'block';
        dropdownOpen = true;
    }
    function hideDropdown() {
        dropdown.style.display = 'none';
        dropdownOpen = false;
        activeIndex = -1;
    }
    function renderList() {
        if (!filtered.length) {
            dropdown.innerHTML = `<div class="hotel-dropdown-empty">No hotels found</div>`;
            return;
        }
        dropdown.innerHTML = filtered.map((hotel, i) =>
            `<div class="hotel-dropdown-item${i === activeIndex ? ' active' : ''}" data-index="${i}">${hotel.name}</div>`
        ).join('');
    }
    function selectHotel(hotel) {
        input.value = hotel.name;
        hideDropdown();
        // Set global states and trigger data load
        currentHotel = hotel.name;
        currentReleaseDays = hotel.releaseDays || 0;
        loadHotelData(hotel.name);

        // Update the hotel name title
        const hotelNameTitleElement = document.getElementById('currentHotelNameTitle');
        if (hotelNameTitleElement) {
            hotelNameTitleElement.textContent = hotel.name;
        }
    }
    input.addEventListener('input', () => {
        const val = input.value.trim().toLowerCase();
        filtered = allotmentHotels.filter(h => h.name.toLowerCase().includes(val));
        renderList();
        showDropdown();
    });
    input.addEventListener('focus', () => {
        filtered = allotmentHotels.filter(h => h.name.toLowerCase().includes(input.value.trim().toLowerCase()));
        renderList();
        showDropdown();
    });

    // Clear input and show full list on click for quick switching
    input.addEventListener('click', () => {
        input.value = '';
        filtered = allotmentHotels.slice();
        renderList();
        showDropdown();
    });
    input.addEventListener('keydown', e => {
        if (!dropdownOpen) return;
        if (e.key === 'ArrowDown') {
            activeIndex = (activeIndex + 1) % filtered.length;
            renderList();
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            activeIndex = (activeIndex - 1 + filtered.length) % filtered.length;
            renderList();
            e.preventDefault();
        } else if (e.key === 'Enter') {
            if (activeIndex >= 0 && filtered[activeIndex]) {
                selectHotel(filtered[activeIndex]);
            }
        } else if (e.key === 'Escape') {
            hideDropdown();
        }
    });
    dropdown.addEventListener('mousedown', e => {
        if (e.target.classList.contains('hotel-dropdown-item')) {
            const idx = +e.target.dataset.index;
            selectHotel(filtered[idx]);
        }
    });
    document.addEventListener('mousedown', e => {
        if (!container.contains(e.target)) hideDropdown();
    });
}

// Expose to global for other scripts (e.g., allotment.js)
window.allotmentHotels = allotmentHotels;