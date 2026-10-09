
// --- Hotel data (name + release days) ---
// releaseDays represents how many days before arrival the allotment is released
// unitReleaseDays (optional, instead of releaseDays) gives each unit its own release days, e.g. [7, 7, 14]
// validUntil (optional, "YYYY-MM-DD") is the last day the allotment can be used; later dates are locked

// AYANA contract periods, the same for all three AYANA hotels. Dates in neither
// list (e.g. 29 Dec 2026 – 2 Jan 2027) have no allotment and are locked.
const ayanaRegularSeasonPeriods = [
    { from: "2026-09-28", to: "2026-09-30" },
    { from: "2026-10-08", to: "2026-12-23" },
    { from: "2027-01-06", to: "2027-02-04" },
    { from: "2027-02-12", to: "2027-03-07" },
    { from: "2027-03-15", to: "2027-04-28" },
    { from: "2027-05-06", to: "2027-06-14" },
    { from: "2027-09-01", to: "2027-09-13" }
];
const ayanaHighSeasonPeriods = [
    { from: "2026-09-24", to: "2026-09-27" },
    { from: "2026-10-01", to: "2026-10-07" },
    { from: "2026-12-24", to: "2026-12-28" },
    { from: "2027-01-03", to: "2027-01-05" },
    { from: "2027-02-05", to: "2027-02-11" },
    { from: "2027-03-08", to: "2027-03-14" },
    { from: "2027-04-29", to: "2027-05-05" },
    { from: "2027-06-15", to: "2027-08-31" },
    { from: "2027-09-14", to: "2027-09-19" }
];

const allotmentHotels = [
    {
        name: "Komaneka Keramas", closeSellData: false, totalUnit: 3,
        // Units 1–2 release 21 days before arrival, unit 3 releases 14 days before
        unitReleaseDays: [21, 21, 14],
        // Individual dates with no allotment, keyed "YYYY-MM" -> [day, ...]
        blockedDates: {
            "2026-10": [21, 22, 23],
            "2026-11": [25]
        }
    },


    {
        name: "Komaneka Tanggayuda",
        closeSellData: false,
        seasonal: true,
        seasonConfig: [
            {
                name: "High Season",
                periods: [
                    { startMonth: 7, startDay: 1, endMonth: 8, endDay: 31 },
                    { startMonth: 12, startDay: 24, endMonth: 1, endDay: 6 }
                ],
                unitReleaseDays: [21]
            },
            {
                name: "Low Season",
                isDefault: true,
                unitReleaseDays: [14]
            }
        ]
    },


    {
        name: "Tejaprana Resort & Spa", closeSellData: true, releaseDays: 7, units: {
            "Terrace Villa": 3,
            "Valley Villa": 2
        }
    },


    { name: "The Trans Bali", closeSellData: true, releaseDays: 7, totalUnit: 3 },


    { name: "Double Six Luxury", closeSellData: true, releaseDays: 21, totalUnit: 1 },


    { name: "Tribe Kuta", closeSellData: true, releaseDays: 14, totalUnit: 1 },


    {
        name: "Ulu Segara", closeSellData: false, releaseDays: 7, validUntil: "2027-03-31",
        // Individual dates with no allotment, keyed "YYYY-MM" -> [day, ...]
        blockedDates: {
            "2026-10": [1, 2, 3, 4, 5, 6, 7, 13, 28, 29],
            "2026-11": [27],
            "2026-12": [27, 28, 29, 30, 31],
            "2027-01": [2, 7, 8, 9]
        },
        // Room types shown for this hotel. The key is the "Room Type" value in
        // this hotel's Supabase table; add a label only to show a different name.
        // Rows in the table that aren't listed here are not displayed.
        roomTypes: {
            "One BR Villa": { units: 2 }
        }
    },


    {
        name: "Indigo Bali Seminyak", closeSellData: false, releaseDays: 10, validUntil: "2026-12-31",
        roomTypes: {
            "Standard Room": { units: 2 }
        }
    },


    {
        name: "Ayana Resort Bali", closeSellData: true, seasonal: true, validUntil: "2027-09-19",
        roomTypes: {
            "Ocean View Room": { units: 2 }
        },
        seasonConfig: [
            { name: "Regular Season", isLowSeason: true, periods: ayanaRegularSeasonPeriods, releaseDays: 14 },
            { name: "High Season", periods: ayanaHighSeasonPeriods, releaseDays: 21 }
        ]
    },


    {
        name: "Ayana Segara Bali", closeSellData: true, seasonal: true, validUntil: "2027-09-19",
        roomTypes: {
            "Ocean View Room": { units: 2 }
        },
        seasonConfig: [
            { name: "Regular Season", isLowSeason: true, periods: ayanaRegularSeasonPeriods, releaseDays: 14 },
            { name: "High Season", periods: ayanaHighSeasonPeriods, releaseDays: 21 }
        ]
    },


    {
        name: "Ayana Villas Bali", closeSellData: true, seasonal: true, validUntil: "2027-09-19",
        roomTypes: {
            "One BR Ocean View Villa": { units: 1 }
        },
        seasonConfig: [
            { name: "Regular Season", isLowSeason: true, periods: ayanaRegularSeasonPeriods, releaseDays: 21 },
            { name: "High Season", periods: ayanaHighSeasonPeriods, releaseDays: 30 }
        ]
    },

];

// --- Website Users with Codes ---
window.allotmentUsers = [
    { name: "Andita", code: "Dit" },
    { name: "Rika", code: "Rik" },
    { name: "Zahra", code: "Zhr" },
    { name: "Caca", code: "Cc" },
    { name: "Sofia", code: "Sof" },
    { name: "Salma", code: "Slm" },
    { name: "Rifa", code: "Rfa" },
    { name: "Farah", code: "Frh" },
    { name: "Alsifa", code: "Sfa" },
    { name: "Aulia", code: "Aul" },
    { name: "Ramli", code: "Rml" },
    { name: "Bandar", code: "Bnd" },
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
        currentReleaseDays = hotel.seasonal ? 0 : (hotel.releaseDays || 0);
        loadHotelData(hotel.name);

        // Update the hotel name title with release days and validity
        const hotelNameTitleElement = document.getElementById('currentHotelNameTitle');
        if (hotelNameTitleElement) {
            hotelNameTitleElement.innerHTML = buildHotelTitleHTML(hotel, hotel.name);
        }

        // Reset scroll position to start from day 1
        const tableContainer = document.getElementById('tableContainer');
        if (tableContainer) {
            tableContainer.scrollLeft = 0;
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
