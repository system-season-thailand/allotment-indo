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

// --- Load hotel structure data and render table (replaces hotelSelector change event) ---
async function loadHotelData(hotelName) {
    if (!hotelName) return;
    const { data, error } = await supabase.from(hotelName).select('*').order('id');
    if (error) {
        showNotification('Failed to load hotel data', 'error');
        return;
    }
    hotelData = data;

    // Determine total units and per-room units mapping
    let hotelObj = null;
    if (window.allotmentHotels) {
        hotelObj = window.allotmentHotels.find(h => h.name === hotelName);
    }

    currentTotalUnit = hotelObj && hotelObj.totalUnit ? hotelObj.totalUnit : 1;
    currentRoomUnits = hotelObj && hotelObj.units ? hotelObj.units : {};
    currentSingleUnit = hotelObj && hotelObj.singleUnit ? true : false;
    currentCloseSellData = hotelObj && hotelObj.closeSellData !== undefined ? hotelObj.closeSellData : true;
    currentHotelObj = hotelObj || null;

    // Load bookings for this hotel for selectedYear
    await loadHotelBookings();

    // Update the hotel name title with release days
    const hotelNameTitleElement = document.getElementById('currentHotelNameTitle');
    if (hotelNameTitleElement) {
        let releaseDaysText = '';
        if (hotelObj && hotelObj.seasonal) {
            releaseDaysText = ` <span class="release-days">(Seasonal)</span>`;
        } else {
            const releaseDays = hotelObj && hotelObj.releaseDays ? hotelObj.releaseDays : 0;
            releaseDaysText = releaseDays > 0 ? ` <span class="release-days">(${releaseDays.toString().padStart(2, '0')} Days Release)</span>` : '';
        }
        hotelNameTitleElement.innerHTML = hotelName + releaseDaysText;
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

    // --- NEW LOGIC: Render single Total Unit row at top if totalUnit:1 and no custom units ---
    const isSingleUnit = !isSeasonalHotel && currentTotalUnit === 1 && (!currentRoomUnits || Object.keys(currentRoomUnits).length === 0);
    if (isSingleUnit) {
        html += `<tr class="unit-row"><td class="sticky-col">Total Unit</td>`;
        days.forEach(() => html += `<th>1</th>`);
        html += `</tr>`;
    }

    hotelData.forEach(row => {
        const roomType = row["Room Type"];

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
                if (isSeasonalHotel) {
                    const monthNum = months.indexOf(month) + 1;
                    const season = getSeasonConfigForDay(currentHotelObj, monthNum, day);
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
                const isClosed = closedDays.includes(day);

                // For seasonal hotels, check if this unit is active today and pick releaseDays
                let effectiveReleaseDays = currentReleaseDays;
                let isOutOfSeason = false;

                if (isSeasonalHotel) {
                    const monthNum = months.indexOf(month) + 1;
                    const season = getSeasonConfigForDay(currentHotelObj, monthNum, day);
                    if (season) {
                        const seasonTotalUnit = season.totalUnit !== undefined
                            ? season.totalUnit
                            : (currentRoomUnits[roomType] || 1);
                        if (u > seasonTotalUnit) {
                            isOutOfSeason = true;
                        } else {
                            effectiveReleaseDays = season.unitReleaseDays
                                ? (season.unitReleaseDays[u - 1] || 0)
                                : 0;
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
                    const origClass = cell.classList.contains('closed') ? 'closed' : (cell.classList.contains('released') ? 'released' : 'available');
                    cell.dataset.originalClass = origClass;
                    cell.dataset.originalContent = cell.innerHTML;
                }

                cell.classList.remove('available', 'released', 'closed');
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
            if (cell.classList.contains('out-of-season')) return;
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

    if (dragMode === 'book' && !cell.classList.contains('booked')) {
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


// Builds the season detail HTML for a given month and returns it as a string.
// Used both to populate the modal and to decide whether to show the button.
function buildSeasonInfoHTML(month) {
    if (!currentHotelObj) return '';

    // ── Non-seasonal hotel ──────────────────────────────────────────────────
    if (!currentHotelObj.seasonal) {
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
        return rows.join('');
    }

    // ── Seasonal hotel: find contiguous season ranges in this month ─────────
    const daysCount = daysInMonth[month];
    const monthNum  = months.indexOf(month) + 1;
    const monthAbbr = month.slice(0, 3);

    const ranges = [];
    let curSeason  = null;
    let rangeStart = 1;
    for (let d = 1; d <= daysCount; d++) {
        const s = getSeasonConfigForDay(currentHotelObj, monthNum, d);
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
        const seasonTag = `<span class="smd-season-name ${season.isDefault ? 'low' : 'high'}">${season.name}</span>`;

        let unitRows = '';

        if (season.totalUnit !== undefined) {
            // Explicit unit count (Keramas-style) — group consecutive units by releaseDays
            const total = season.totalUnit;
            const rdArr = season.unitReleaseDays || [];
            const groups = [];
            let gi = 0;
            while (gi < total) {
                const rd = rdArr[gi] || 0;
                let gj = gi + 1;
                while (gj < total && (rdArr[gj] || 0) === rd) gj++;
                const unitLabel = (gj - gi === 1) ? `Unit ${gi + 1}` : `Unit ${gi + 1}–${gj}`;
                groups.push(`
                    <div class="smd-unit-line">
                        <span class="smd-unit-label">${unitLabel}</span>
                        <span class="smd-release">${String(rd).padStart(2, '0')} Days Release</span>
                    </div>`);
                gi = gj;
            }
            unitRows = `
                <div class="smd-unit-summary">${total} Unit${total !== 1 ? 's' : ''}</div>
                ${groups.join('')}`;
        } else {
            // Room-type style (Tanggayuda) — releaseDays per unit from seasonConfig
            const rd = season.unitReleaseDays ? (season.unitReleaseDays[0] || 0) : 0;
            if (hotelData && hotelData.length > 0) {
                unitRows = hotelData.map(row => {
                    const rt = row['Room Type'];
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
    }).filter(Boolean).join('');
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

// Returns true if (monthNum, day) falls within the given season period (handles year-wrap)
function isDateInSeasonPeriod(monthNum, day, period) {
    const { startMonth, startDay, endMonth, endDay } = period;
    if (startMonth > endMonth) {
        // Wraps around year end (e.g. Dec 24 – Jan 6)
        return (monthNum > startMonth || (monthNum === startMonth && day >= startDay)) ||
               (monthNum < endMonth || (monthNum === endMonth && day <= endDay));
    }
    return (monthNum > startMonth || (monthNum === startMonth && day >= startDay)) &&
           (monthNum < endMonth || (monthNum === endMonth && day <= endDay));
}

// Returns the matching seasonConfig entry for a given (monthNum, day), or the default entry
function getSeasonConfigForDay(hotelObj, monthNum, day) {
    if (!hotelObj || !hotelObj.seasonal || !hotelObj.seasonConfig) return null;
    for (const season of hotelObj.seasonConfig) {
        if (season.isDefault) continue;
        if (season.periods && season.periods.some(p => isDateInSeasonPeriod(monthNum, day, p))) {
            return season;
        }
    }
    return hotelObj.seasonConfig.find(s => s.isDefault) || null;
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
        const season = getSeasonConfigForDay(hotelObj, monthNum, d);
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