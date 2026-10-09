/* Variable to check if the user is an editor or not */
let isEditor = false;

// (place near other global vars)
let isDragging = false;
let dragMode = ''; // 'book' or 'clear'
let dragChanged = [];

// Notification System
function showNotification(message, type = 'default', duration = 3000) {
    const container = document.getElementById('notificationContainer');
    const box = container.querySelector('.notification-box');
    const messageElement = document.getElementById('notificationMessage');

    // Set message
    messageElement.textContent = message;

    // Set type (affects styling)
    box.className = 'notification-box';
    if (type !== 'default') {
        box.classList.add(type);
    }

    // Show notification
    container.classList.add('show');

    // Auto hide after duration
    setTimeout(() => {
        hideNotification();
    }, duration);
}

function hideNotification() {
    const container = document.getElementById('notificationContainer');
    container.classList.remove('show');
}

// Close notification on click
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('notificationContainer');
    container.addEventListener('click', (e) => {
        if (e.target === container) {
            hideNotification();
        }
    });
});

// Role Modal logic
const toggleModeBtn = document.getElementById("toggleModeBtn");
const roleModal = document.getElementById("roleModal");
const viewModeBtn = document.getElementById("viewModeBtn");
const editorModeBtn = document.getElementById("editorModeBtn");
const editorPassword = document.getElementById("editorPassword");

toggleModeBtn.addEventListener("click", () => {
    roleModal.style.display = "block";
});

viewModeBtn.addEventListener("click", () => {
    isEditor = false;
    localStorage.setItem("UserMode", "view");
    document.body.classList.add("view-mode");
    roleModal.style.display = "none";
    showNotification("View mode enabled — editing is disabled.", "success");
});

editorModeBtn.addEventListener("click", () => {
    if (editorPassword.value === "bndr123") {
        isEditor = true;
        localStorage.setItem("UserMode", "editor");
        document.body.classList.remove("view-mode");
        roleModal.style.display = "none";
        showNotification("Editor mode enabled.", "success");
    } else {
        showNotification("Password is incorrect.", "error");
    }
});

// Close modal if clicking outside the content
window.addEventListener("click", e => {
    if (e.target === roleModal) {
        roleModal.style.display = "none";
    }
});

window.addEventListener('DOMContentLoaded', () => {
    const savedMode = localStorage.getItem("UserMode");

    if (savedMode === "editor") {
        isEditor = true;
        document.body.classList.remove("view-mode");
    } else {
        isEditor = false;
        document.body.classList.add("view-mode");
    }
});










// (Drag close/open functionality removed in favour of simple booking click)


const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const daysInMonth = {
    January: 31, February: 29, March: 31, April: 30, May: 31, June: 30,
    July: 31, August: 31, September: 30, October: 31, November: 30, December: 31
};

const hotelSelector = document.getElementById('hotelSelector');
const monthTabs = document.getElementById('monthTabs');
const yearTabs = document.getElementById('yearTabs');
const tableContainer = document.getElementById('tableContainer');

let currentHotel = '';
let currentMonth = 'January';
let selectedYear = new Date().getFullYear();
const supportedYears = [2025, 2026, 2027, 2028, 2029, 2030];
let userBaseYear = parseInt(localStorage.getItem('UserBaseYear') || String(selectedYear));
let hotelData = [];

// In new persistence model each hotel stores an array of booking objects per year
// in table `new_allotment_indo`, keyed by year column (e.g. 2025, 2026).
let hotelBookings = []; // [{room_id, month_name, day_number, user_code}]

// total allotment units for selected hotel
let currentTotalUnit = 1;

// Will hold release days value for currently selected hotel (set by selector script)
let currentReleaseDays = 0;
let currentSingleUnit = false; // Track if current hotel is single unit
let currentCloseSellData = true; // Track if current hotel should show closed days
let currentHotelObj = null; // Full hotel object for seasonal config access

// Helpers for year handling
function getNextYear(year) {
    return year + 1;
}

// --- Allotment validity (optional "validUntil" in the hotel list) ---
// Returns the last day the hotel's allotment can be used (local midnight), or null if it has no end date
function getHotelValidUntil(hotelObj) {
    if (!hotelObj || !hotelObj.validUntil) return null;
    const [y, m, d] = String(hotelObj.validUntil).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}

// Individual blocked dates (optional "blockedDates" on a hotel: { "YYYY-MM": [day, ...] })
// Returns the set of blocked day numbers for that year/month — empty when the hotel has none
function getBlockedDaysForMonth(hotelObj, year, monthIdx) {
    const map = hotelObj && hotelObj.blockedDates;
    if (!map) return new Set();
    const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
    return new Set(map[key] || []);
}

// --- Room types (optional "roomTypes" on a hotel) ---
// { "<Room Type as written in the hotel's table>": { label: "<name shown>", units: <n> } }
// When a hotel defines it, it decides which rows of that hotel's table are shown,
// what each is called, and how many units it has. Rows not listed are ignored.
function getRoomTypeConfig(hotelObj, roomType) {
    const map = hotelObj && hotelObj.roomTypes;
    if (!map) return null;
    if (map[roomType]) return map[roomType];
    // Also match the display label, so renaming the row in the table to match
    // the label later keeps working instead of hiding the room type.
    return Object.values(map).find(cfg => cfg && cfg.label === roomType) || null;
}

// The name to show for a table row's room type
function getRoomTypeLabel(hotelObj, roomType) {
    const cfg = getRoomTypeConfig(hotelObj, roomType);
    return (cfg && cfg.label) || roomType;
}

// Whether a row from the hotel's table should be rendered at all
function isRoomTypeVisible(hotelObj, roomType) {
    if (!hotelObj || !hotelObj.roomTypes) return true; // no list -> show every row
    return !!getRoomTypeConfig(hotelObj, roomType);
}

// Formats a date as "31 Mar 2027"
function formatShortDate(date) {
    return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
}

// Hotel title: name + release days (or Seasonal) + validity
function buildHotelTitleHTML(hotelObj, hotelName) {
    let html = hotelName || (hotelObj ? hotelObj.name : '');
    if (hotelObj && hotelObj.seasonal) {
        html += ` <span class="release-days">(Seasonal)</span>`;
    } else {
        // Per-unit release days show each distinct value, e.g. "(07 / 14 Days Release)"
        const releaseDays = (hotelObj && hotelObj.unitReleaseDays) || [hotelObj && hotelObj.releaseDays || 0];
        const distinct = [...new Set(releaseDays)].filter(rd => rd > 0).sort((a, b) => a - b);
        if (distinct.length) {
            html += ` <span class="release-days">(${distinct.map(rd => String(rd).padStart(2, '0')).join(' / ')} Days Release)</span>`;
        }
    }
    const validUntil = getHotelValidUntil(hotelObj);
    if (validUntil) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const label = today > validUntil ? 'Expired' : 'Valid until';
        html += ` <span class="valid-until">(${label} ${formatShortDate(validUntil)})</span>`;
    }
    return html;
}

// "Valid until" line for the More Details modal ('' when the hotel has no end date)
function buildValidityRowHTML() {
    const validUntil = getHotelValidUntil(currentHotelObj);
    if (!validUntil) return '';
    return `
        <div class="smd-row">
            <span class="smd-valid">Valid until ${formatShortDate(validUntil)}</span>
        </div>`;
}

// Cells that can't be booked: units outside their season, dates after the
// allotment's validUntil, or individually blocked dates
function isLockedCell(cell) {
    return cell.classList.contains('out-of-season')
        || cell.classList.contains('expired')
        || cell.classList.contains('blocked');
}

// Fetch (or initialise) bookings JSON for the current hotel for selectedYear
async function loadHotelBookings() {
    if (!currentHotel) return;
    const yearCol = String(selectedYear); // e.g. "2025"
    const { data, error } = await supabase
        .from('new_allotment_indo')
        .select(`hotel_name, "${yearCol}"`)
        .eq('hotel_name', currentHotel)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Failed to load bookings', error);
        hotelBookings = [];
        return;
    }

    if (data && Array.isArray(data[yearCol])) {
        hotelBookings = data[yearCol];
    } else {
        hotelBookings = [];
    }
}

// Supabase error codes meaning the hotel's table doesn't exist (Postgres / newer PostgREST)
const MISSING_TABLE_CODES = ['42P01', 'PGRST205'];

// Rows for a hotel that has no table in Supabase, built from the room types named
// in the hotel list (roomTypes or units). Ids follow the list order, so a table
// created later should use the same order to keep existing bookings in place.
// Returns [] when the hotel list doesn't name any room types.
function buildRowsFromHotelConfig(hotelObj) {
    const rooms = hotelObj && (hotelObj.roomTypes || hotelObj.units);
    if (!rooms) return [];
    return Object.keys(rooms).map((roomType, i) => ({ id: i + 1, "Room Type": roomType }));
}

// --- Load hotel structure data and render table (replaces hotelSelector change event) ---
async function loadHotelData(hotelName) {
    if (!hotelName) return;

    // Determine total units and per-room units mapping
    let hotelObj = null;
    if (window.allotmentHotels) {
        hotelObj = window.allotmentHotels.find(h => h.name === hotelName);
    }

    const { data, error } = await supabase.from(hotelName).select('*').order('id');
    if (error) {
        const fallbackRows = MISSING_TABLE_CODES.includes(error.code) ? buildRowsFromHotelConfig(hotelObj) : [];
        if (!fallbackRows.length) {
            showNotification('Failed to load hotel data', 'error');
            return;
        }
        console.warn(`No Supabase table for "${hotelName}" — using the room types from the hotel list.`);
        hotelData = fallbackRows;
    } else {
        hotelData = data;
    }

    currentTotalUnit = hotelObj && hotelObj.totalUnit ? hotelObj.totalUnit : 1;
    // A hotel's roomTypes list (when it has one) supplies the displayed names and
    // their unit counts; otherwise fall back to the plain units map.
    if (hotelObj && hotelObj.roomTypes) {
        currentRoomUnits = {};
        Object.entries(hotelObj.roomTypes).forEach(([tableName, cfg]) => {
            currentRoomUnits[(cfg && cfg.label) || tableName] = (cfg && cfg.units) || 1;
        });
    } else {
        currentRoomUnits = hotelObj && hotelObj.units ? hotelObj.units : {};
    }
    currentSingleUnit = hotelObj && hotelObj.singleUnit ? true : false;
    currentCloseSellData = hotelObj && hotelObj.closeSellData !== undefined ? hotelObj.closeSellData : true;
    currentHotelObj = hotelObj || null;

    // Load bookings for this hotel for selectedYear
    await loadHotelBookings();

    // Update the hotel name title with release days and validity
    const hotelNameTitleElement = document.getElementById('currentHotelNameTitle');
    if (hotelNameTitleElement) {
        hotelNameTitleElement.innerHTML = buildHotelTitleHTML(hotelObj, hotelName);
    }

    renderYearTabs();
    renderTabs();
    renderMonthTable(currentMonth);

    // Show year tabs and content area after data is loaded
    const yearTabsElement = document.getElementById('yearTabs');
    if (yearTabsElement) {
        yearTabsElement.classList.add('show');
    }

    const contentAreaElement = document.querySelector('.content-area');
    if (contentAreaElement) {
        contentAreaElement.classList.add('show');
    }
}

// --- Call renderHotelSelector on page load ---
document.addEventListener('DOMContentLoaded', () => {
    renderHotelSelector();
});


function renderTabs() {
    monthTabs.innerHTML = '';
    months.forEach(month => {
        const btn = document.createElement('button');
        btn.className = 'tab-button' + (month === currentMonth ? ' active' : '');
        btn.textContent = month;
        btn.addEventListener('click', () => {
            currentMonth = month;
            document.querySelectorAll('#monthTabs .tab-button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMonthTable(month);

            // Reset scroll position to start from day 1
            const tableContainer = document.getElementById('tableContainer');
            if (tableContainer) {
                tableContainer.scrollLeft = 0;
            }
        });
        monthTabs.appendChild(btn);
    });

    // Set initial month-year title
    updateMonthYearTitle();
}

function updateMonthYearTitle() {
    const monthYearTitleElement = document.getElementById('currentMonthYearTitle');
    if (monthYearTitleElement) {
        monthYearTitleElement.innerHTML = `<span class="month-text">${currentMonth}</span> - <span class="year-text">${selectedYear}</span>`;
    }
}

function renderYearTabs() {
    if (!yearTabs) return;
    yearTabs.innerHTML = '';

    // Initialize persistent base year if not set
    if (!localStorage.getItem('UserBaseYear')) {
        userBaseYear = selectedYear;
        localStorage.setItem('UserBaseYear', String(userBaseYear));
    }

    supportedYears.forEach(y => {
        const btn = document.createElement('button');
        btn.className = 'tab-button' + (y === selectedYear ? ' active' : '');
        btn.textContent = String(y);
        btn.addEventListener('click', async () => {
            if (selectedYear === y) return;

            // Start transition animation
            const contentArea = document.querySelector('.content-area');
            if (contentArea) {
                contentArea.classList.add('year-transitioning');
            }

            // Wait for transition to start
            await new Promise(resolve => setTimeout(resolve, 200));

            selectedYear = y;
            document.querySelectorAll('#yearTabs .tab-button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update the merged month-year title
            updateMonthYearTitle();

            // Auto-scroll to the active year button
            btn.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });

            // Reload bookings for the newly selected year and repaint
            await loadHotelBookings();
            renderMonthTable(currentMonth);

            // Complete transition animation
            if (contentArea) {
                contentArea.classList.remove('year-transitioning');
                contentArea.classList.add('year-transitioning-out');

                // Reset to normal state
                setTimeout(() => {
                    contentArea.classList.remove('year-transitioning-out');
                }, 200);
            }
        });
        yearTabs.appendChild(btn);
    });
}

function renderMonthTable(month) {
    // Update the merged month-year title and season info bar
    updateMonthYearTitle();
    updateHotelSeasonInfo(month);

    const days = Array.from({ length: daysInMonth[month] }, (_, i) => i + 1);

    let html = `<table><thead><tr><th>Room Type</th>`;
    days.forEach(day => html += `<th>${day}</th>`);
    html += `</tr></thead><tbody>`;

    const isSeasonalHotel = !!(currentHotelObj && currentHotelObj.seasonal);
    // Non-seasonal hotels may give each unit its own release days
    const unitReleaseDays = !isSeasonalHotel && currentHotelObj && currentHotelObj.unitReleaseDays;

    // Dates with no usable allotment: past the hotel's validUntil, individually blocked,
    // or (for a seasonal hotel without a default season) outside all of its seasons
    const validUntil = getHotelValidUntil(currentHotelObj);
    const monthIdx = months.indexOf(month);
    const blockedDays = getBlockedDaysForMonth(currentHotelObj, selectedYear, monthIdx);
    const isExpiredDay = day => !!validUntil && new Date(selectedYear, monthIdx, day) > validUntil;
    const isBlockedDay = day => blockedDays.has(day)
        || (isSeasonalHotel && !getSeasonConfigForDay(currentHotelObj, selectedYear, monthIdx + 1, day));
    const isLockedDay = day => isExpiredDay(day) || isBlockedDay(day);
    const expiredTitle = validUntil ? `Allotment valid until ${formatShortDate(validUntil)}` : '';
    // Past validUntil reads "valid until"; other locked dates read "not valid"
    const lockedClass = day => isExpiredDay(day) ? 'expired' : 'blocked';
    const lockedTitle = day => isExpiredDay(day) ? expiredTitle : 'Allotment not valid on this date';
    const hasLockedDays = days.some(isLockedDay);

    // --- NEW LOGIC: Render single Total Unit row at top if totalUnit:1 and no custom units ---
    const isSingleUnit = !isSeasonalHotel && currentTotalUnit === 1 && (!currentRoomUnits || Object.keys(currentRoomUnits).length === 0);
    if (isSingleUnit) {
        html += `<tr class="unit-row"><td class="sticky-col">Total Unit</td>`;
        days.forEach(day => html += isLockedDay(day) ? `<th class="expired-unit">0</th>` : `<th>1</th>`);
        html += `</tr>`;
    }

    hotelData.forEach(row => {
        // Ignore rows this hotel doesn't list in roomTypes
        if (!isRoomTypeVisible(currentHotelObj, row["Room Type"])) return;

        const roomType = getRoomTypeLabel(currentHotelObj, row["Room Type"]);

        let roomUnits;
        if (isSeasonalHotel) {
            roomUnits = getMaxUnitsForMonth(currentHotelObj, month, roomType);
        } else {
            roomUnits = currentRoomUnits[roomType] || currentTotalUnit;
        }

        // Only render per-room Total Unit row if not single-unit mode
        if (!isSingleUnit) {
            html += `<tr class="unit-row" data-room-type-unit="${roomType}"><td class="sticky-col">Total Unit</td>`;
            days.forEach(day => {
                if (isLockedDay(day)) {
                    html += `<th class="expired-unit">0</th>`;
                } else if (isSeasonalHotel) {
                    const monthNum = months.indexOf(month) + 1;
                    const season = getSeasonConfigForDay(currentHotelObj, selectedYear, monthNum, day);
                    const units = (season && season.totalUnit !== undefined)
                        ? season.totalUnit
                        : (currentRoomUnits[roomType] || currentTotalUnit || 1);
                    html += `<th>${units}</th>`;
                } else {
                    html += `<th>${roomUnits}</th>`;
                }
            });
            html += `</tr>`;
        }

        // Apply closed only for userBaseYear and its next year
        const renderYear = selectedYear;
        const shouldApplyClosed = currentCloseSellData && (renderYear === userBaseYear || renderYear === userBaseYear + 1);
        const closedDays = shouldApplyClosed ? parseCloseDays(row[month]) : [];

        // generate one availability row per unit
        for (let u = 1; u <= roomUnits; u++) {
            const syntheticId = `${row.id}-${u}`;
            html += `<tr data-id="${syntheticId}" data-room-type="${roomType}" data-unit-index="${u}" data-room-id="${row.id}">`;
            if (u === 1) {
                html += `<td rowspan="${roomUnits}" class="sticky-col">${roomType}</td>`;
            }

            days.forEach(day => {
                // No allotment on this date (past validUntil, or individually blocked)
                if (isLockedDay(day)) {
                    html += `<td class="${lockedClass(day)}" data-day="${day}" data-month="${month}" title="${lockedTitle(day)}"></td>`;
                    return;
                }

                const isClosed = closedDays.includes(day);

                // For seasonal hotels, check if this unit is active today and pick releaseDays
                let effectiveReleaseDays = unitReleaseDays ? (unitReleaseDays[u - 1] || 0) : currentReleaseDays;
                let isOutOfSeason = false;

                if (isSeasonalHotel) {
                    const monthNum = months.indexOf(month) + 1;
                    const season = getSeasonConfigForDay(currentHotelObj, selectedYear, monthNum, day);
                    if (season) {
                        const seasonTotalUnit = season.totalUnit !== undefined
                            ? season.totalUnit
                            : (currentRoomUnits[roomType] || 1);
                        if (u > seasonTotalUnit) {
                            isOutOfSeason = true;
                        } else {
                            effectiveReleaseDays = getSeasonReleaseDays(season, u);
                        }
                    }
                }

                if (isOutOfSeason) {
                    html += `<td class="out-of-season" data-day="${day}" data-month="${month}"></td>`;
                    return;
                }

                // Determine if this cell falls inside the "released" window
                let isReleased = false;
                if (!isClosed && effectiveReleaseDays > 0) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const monthIndex = months.indexOf(month);
                    let cellDate = new Date(selectedYear, monthIndex, day);

                    const twoMonthsAgo = new Date(today);
                    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

                    const releaseBoundary = new Date(today);
                    releaseBoundary.setDate(releaseBoundary.getDate() + (effectiveReleaseDays - 1));

                    const isCurrentYear = selectedYear === today.getFullYear();
                    const isNextYear = selectedYear === today.getFullYear() + 1;

                    if (isCurrentYear || isNextYear) {
                        isReleased = cellDate >= twoMonthsAgo && cellDate <= releaseBoundary;
                    }
                }

                let classes = isClosed ? 'closed' : (isReleased ? 'released' : 'available');
                const cellText = (isClosed || isReleased) ? day : '';

                html += `<td class="${classes}" data-day="${day}" data-month="${month}">${cellText}</td>`;
            });

            html += `</tr>`;
        }

    });

    html += `</tbody></table>`;
    tableContainer.innerHTML = html;

    // Show the "not valid" legend only when this month actually has locked dates
    const legendExpired = document.getElementById('legendExpired');
    if (legendExpired) legendExpired.style.display = hasLockedDays ? '' : 'none';

    // Paint bookings from hotelBookings array
    paintBookings(month);

    attachCellListeners();
}

// Apply green booked styling from hotelBookings array for given month
function paintBookings(month) {
    if (!hotelBookings.length) return;
    hotelBookings
        .filter(b => b.month_name === month)
        .forEach(({ room_id, unit_index, day_number, user_code }) => {
            const selector = `tr[data-room-id=\"${room_id}\"][data-unit-index=\"${unit_index}\"] td[data-month=\"${month}\"][data-day=\"${day_number}\"]`;
            const cell = document.querySelector(selector);
            if (cell) {
                // Store original state if not already stored
                if (!cell.dataset.originalClass) {
                    const origClass = cell.classList.contains('expired') ? 'expired'
                        : (cell.classList.contains('blocked') ? 'blocked'
                            : (cell.classList.contains('closed') ? 'closed'
                                : (cell.classList.contains('released') ? 'released' : 'available')));
                    cell.dataset.originalClass = origClass;
                    cell.dataset.originalContent = cell.innerHTML;
                }

                cell.classList.remove('available', 'released', 'closed', 'expired', 'blocked');
                cell.classList.add('booked');
                cell.innerHTML = `${day_number}<br>(${user_code})`;
            }
        });
}

function attachCellListeners() {
    const cells = document.querySelectorAll('td[data-day]');

    cells.forEach(cell => {

        cell.addEventListener('mousedown', e => {
            if (!isEditor) return;
            if (isLockedCell(cell)) return;
            e.preventDefault();

            dragChanged = [];
            isDragging = true;

            // Determine mode based on initial cell action
            if (cell.classList.contains('booked')) {
                dragMode = 'clear';
            } else {
                dragMode = 'book';
            }

            applyDragEffect(cell);
        });


        cell.addEventListener('mouseenter', () => {
            if (isEditor && isDragging) applyDragEffect(cell);
        });

        document.addEventListener('mouseup', async () => {
            if (!isDragging) return;
            isDragging = false;
            // Persist all changed cells already persisted inside applyDragEffect so nothing else
            dragChanged = [];
        });
    });
}

function applyDragEffect(cell) {
    if (dragChanged.includes(cell)) return;

    const dayText = cell.dataset.day;

    if (dragMode === 'book' && !cell.classList.contains('booked') && !isLockedCell(cell)) {
        // store original
        if (!cell.dataset.originalClass) {
            const origClass = cell.classList.contains('closed') ? 'closed' : (cell.classList.contains('released') ? 'released' : 'available');
            cell.dataset.originalClass = origClass;
            cell.dataset.originalContent = cell.innerHTML;
        }

        const code = getCurrentUserCode();
        cell.classList.remove('available', 'released', 'closed');
        cell.classList.add('booked');
        cell.innerHTML = `${dayText}<br>(${code})`;
        persistBooking(cell);
        dragChanged.push(cell);
    }

    if (dragMode === 'clear' && cell.classList.contains('booked')) {
        const originalClass = cell.dataset.originalClass || 'available';
        cell.classList.remove('booked');
        cell.classList.remove('available', 'released', 'closed');
        if (originalClass !== 'available') {
            cell.classList.add(originalClass);
        } else {
            cell.classList.add('available');
        }
        cell.innerHTML = cell.dataset.originalContent || '';
        persistBooking(cell);
        dragChanged.push(cell);
    }
}

function handleCellToggle(cell) {
    // No drag hover logic for simple booking
}

function handleDragHover(cell) {
    // No drag hover logic for simple booking
}


// One line per release-days value with how many units have it,
// e.g. "2 Units · 07 Days Release" / "1 Unit · 14 Days Release"
function buildUnitReleaseLinesHTML(total, releaseDaysPerUnit) {
    const countByReleaseDays = new Map();
    for (let i = 0; i < total; i++) {
        const rd = releaseDaysPerUnit[i] || 0;
        countByReleaseDays.set(rd, (countByReleaseDays.get(rd) || 0) + 1);
    }
    return [...countByReleaseDays].map(([rd, count]) => `
            <div class="smd-unit-line">
                <span class="smd-unit-label">${count} Unit${count !== 1 ? 's' : ''}</span>
                <span class="smd-release">${String(rd).padStart(2, '0')} Days Release</span>
            </div>`).join('');
}

// Builds the season detail HTML for a given month and returns it as a string.
// Used both to populate the modal and to decide whether to show the button.
function buildSeasonInfoHTML(month) {
    if (!currentHotelObj) return '';

    // ── Non-seasonal hotel ──────────────────────────────────────────────────
    if (!currentHotelObj.seasonal) {
        if (currentHotelObj.unitReleaseDays) {
            return buildUnitReleaseLinesHTML(currentTotalUnit, currentHotelObj.unitReleaseDays) + buildValidityRowHTML();
        }
        const rows = [];
        if (currentRoomUnits && Object.keys(currentRoomUnits).length > 0) {
            Object.entries(currentRoomUnits).forEach(([rt, u]) => {
                rows.push(`
                    <div class="smd-row">
                        <span class="smd-room">${rt}</span>
                        <span class="smd-units">${u} Unit${u !== 1 ? 's' : ''}</span>
                        ${currentReleaseDays > 0 ? `<span class="smd-release">${String(currentReleaseDays).padStart(2, '0')} Days Release</span>` : ''}
                    </div>`);
            });
        } else {
            const u = currentTotalUnit || 1;
            rows.push(`
                <div class="smd-row">
                    <span class="smd-units">${u} Unit${u !== 1 ? 's' : ''}</span>
                    ${currentReleaseDays > 0 ? `<span class="smd-release">${String(currentReleaseDays).padStart(2, '0')} Days Release</span>` : ''}
                </div>`);
        }
        return rows.join('') + buildValidityRowHTML();
    }

    // ── Seasonal hotel: find contiguous season ranges in this month ─────────
    const daysCount = daysInMonth[month];
    const monthNum  = months.indexOf(month) + 1;
    const monthAbbr = month.slice(0, 3);

    const ranges = [];
    let curSeason  = null;
    let rangeStart = 1;
    for (let d = 1; d <= daysCount; d++) {
        const s = getSeasonConfigForDay(currentHotelObj, selectedYear, monthNum, d);
        if (s !== curSeason) {
            if (curSeason !== null) ranges.push({ season: curSeason, startDay: rangeStart, endDay: d - 1 });
            curSeason  = s;
            rangeStart = d;
        }
    }
    if (curSeason !== null) ranges.push({ season: curSeason, startDay: rangeStart, endDay: daysCount });

    const isMixed = ranges.length > 1;

    return ranges.map(({ season, startDay, endDay }) => {
        if (!season) return '';

        const dateTag = isMixed
            ? `<span class="smd-date-range">${monthAbbr} ${startDay}–${endDay}</span>`
            : '';
        const seasonTag = `<span class="smd-season-name ${season.isDefault || season.isLowSeason ? 'low' : 'high'}">${season.name}</span>`;

        let unitRows = '';

        if (season.totalUnit !== undefined) {
            // Explicit unit count — group consecutive units by releaseDays
            unitRows = buildUnitReleaseLinesHTML(season.totalUnit, season.unitReleaseDays || []);
        } else {
            // Room-type style (Tanggayuda) — releaseDays per unit from seasonConfig
            const rd = getSeasonReleaseDays(season, 1);
            if (hotelData && hotelData.length > 0) {
                unitRows = hotelData.filter(row => isRoomTypeVisible(currentHotelObj, row['Room Type'])).map(row => {
                    const rt = getRoomTypeLabel(currentHotelObj, row['Room Type']);
                    const u  = currentRoomUnits[rt] || currentTotalUnit || 1;
                    return `
                        <div class="smd-unit-line">
                            <span class="smd-room">${rt}</span>
                            <span class="smd-units">${u} Unit${u !== 1 ? 's' : ''}</span>
                            ${rd > 0 ? `<span class="smd-release">${String(rd).padStart(2, '0')} Days Release</span>` : ''}
                        </div>`;
                }).join('');
            } else if (rd > 0) {
                unitRows = `<div class="smd-unit-line"><span class="smd-release">${String(rd).padStart(2, '0')} Days Release</span></div>`;
            }
        }

        return `
            <div class="smd-season-block">
                <div class="smd-season-header">${dateTag}${seasonTag}</div>
                <div class="smd-season-details">${unitRows}</div>
            </div>`;
    }).filter(Boolean).join('') + buildValidityRowHTML();
}

// Show / hide the "More Details" button and cache the content for the modal
function updateHotelSeasonInfo(month) {
    const btn = document.getElementById('seasonMoreBtn');
    if (!btn) return;

    const html = buildSeasonInfoHTML(month);
    btn._seasonHTML  = html;
    btn._seasonMonth = month;
    btn.style.display = html ? 'inline-flex' : 'none';

    // If the modal is currently open, refresh its body live
    const overlay = document.getElementById('seasonModal');
    if (overlay && overlay.classList.contains('open')) {
        document.getElementById('seasonModalBody').innerHTML        = html;
        document.getElementById('seasonModalMonthLabel').textContent = `${month} ${selectedYear}`;
    }
}

function openSeasonModal() {
    const btn     = document.getElementById('seasonMoreBtn');
    const overlay = document.getElementById('seasonModal');
    if (!overlay || !btn) return;

    document.getElementById('seasonModalHotelName').textContent  = currentHotel || '';
    document.getElementById('seasonModalMonthLabel').textContent = `${btn._seasonMonth || currentMonth} ${selectedYear}`;
    document.getElementById('seasonModalBody').innerHTML         = btn._seasonHTML || '';

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeSeasonModal() {
    const overlay = document.getElementById('seasonModal');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
}

function handleSeasonModalBackdrop(e) {
    if (e.target === document.getElementById('seasonModal')) closeSeasonModal();
}

// Returns true if the date falls within the given season period. A period is either
// a fixed date range ({ from: "YYYY-MM-DD", to: "YYYY-MM-DD" }) or a range repeated
// every year (startMonth/startDay – endMonth/endDay, may wrap the year end)
function isDateInSeasonPeriod(year, monthNum, day, period) {
    if (period.from) {
        const date = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return date >= period.from && date <= period.to;
    }
    const { startMonth, startDay, endMonth, endDay } = period;
    if (startMonth > endMonth) {
        // Wraps around year end (e.g. Dec 24 – Jan 6)
        return (monthNum > startMonth || (monthNum === startMonth && day >= startDay)) ||
               (monthNum < endMonth || (monthNum === endMonth && day <= endDay));
    }
    return (monthNum > startMonth || (monthNum === startMonth && day >= startDay)) &&
           (monthNum < endMonth || (monthNum === endMonth && day <= endDay));
}

// Returns the matching seasonConfig entry for a given date, or the default entry
// (null when no season matches and the hotel has no default season)
function getSeasonConfigForDay(hotelObj, year, monthNum, day) {
    if (!hotelObj || !hotelObj.seasonal || !hotelObj.seasonConfig) return null;
    for (const season of hotelObj.seasonConfig) {
        if (season.isDefault) continue;
        if (season.periods && season.periods.some(p => isDateInSeasonPeriod(year, monthNum, day, p))) {
            return season;
        }
    }
    return hotelObj.seasonConfig.find(s => s.isDefault) || null;
}

// Release days for unit u (1-based) in a season: its own entry in unitReleaseDays,
// or the season's releaseDays when it applies one value to every unit
function getSeasonReleaseDays(season, u) {
    if (season.unitReleaseDays) return season.unitReleaseDays[u - 1] || 0;
    return season.releaseDays || 0;
}

// Returns the maximum unit count across all seasons that appear in a given month (for row sizing)
function getMaxUnitsForMonth(hotelObj, monthName, roomType) {
    if (!hotelObj || !hotelObj.seasonal || !hotelObj.seasonConfig) {
        return currentRoomUnits[roomType] || currentTotalUnit;
    }
    const monthNum = months.indexOf(monthName) + 1;
    const daysCount = daysInMonth[monthName];
    let maxUnits = 0;
    for (let d = 1; d <= daysCount; d++) {
        const season = getSeasonConfigForDay(hotelObj, selectedYear, monthNum, d);
        const units = (season && season.totalUnit !== undefined)
            ? season.totalUnit
            : (currentRoomUnits[roomType] || currentTotalUnit || 1);
        if (units > maxUnits) maxUnits = units;
    }
    return maxUnits || 1;
}

// Parse string like "1-3, 5, 7-9" to [1,2,3,5,7,8,9]
function parseCloseDays(text) {
    if (!text || text.trim() === '') return [];
    return text.split(',').flatMap(part => {
        const range = part.trim().split('-').map(Number);
        if (range.length === 2) {
            return Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i);
        } else if (range.length === 1 && !isNaN(range[0])) {
            return [range[0]];
        }
        return [];
    });
}

// Convert [1,2,3,5,6,7,9] to "1-3, 5-7, 9"
function formatCloseDays(days) {
    if (!days.length) return '';
    days.sort((a, b) => a - b);

    const result = [];
    let start = days[0], end = start;

    for (let i = 1; i <= days.length; i++) {
        if (days[i] === end + 1) {
            end = days[i];
        } else {
            if (start === end) result.push(`${start}`);
            else result.push(`${start}-${end}`);
            start = days[i];
            end = start;
        }
    }

    return result.join(', ');
}

// Save or delete booking for a specific cell
async function persistBooking(cell) {
    const row = cell.closest('tr');
    if (!row) return;

    const bookingObj = {
        room_id: parseInt(row.dataset.roomId),
        room_type: row.dataset.roomType || '',
        unit_index: parseInt(row.dataset.unitIndex || '1'),
        month_name: cell.dataset.month,
        day_number: parseInt(cell.dataset.day),
        user_code: getCurrentUserCode()
    };

    const idx = hotelBookings.findIndex(b =>
        b.room_id === bookingObj.room_id &&
        b.month_name === bookingObj.month_name &&
        b.day_number === bookingObj.day_number &&
        b.unit_index === bookingObj.unit_index);

    if (cell.classList.contains('booked')) {
        // Add or replace
        if (idx >= 0) {
            hotelBookings[idx] = bookingObj;
        } else {
            hotelBookings.push(bookingObj);
        }
    } else {
        // Remove booking from array
        if (idx >= 0) hotelBookings.splice(idx, 1);
    }

    // Persist full array into selected year's column of new table
    const updatePayload = { hotel_name: currentHotel };
    updatePayload[String(selectedYear)] = hotelBookings;
    await supabase
        .from('new_allotment_indo')
        .upsert(updatePayload, { onConflict: ['hotel_name'] });
}