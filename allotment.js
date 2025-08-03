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
const tableContainer = document.getElementById('tableContainer');

let currentHotel = '';
let currentMonth = 'January';
let hotelData = [];

// In new persistence model each hotel stores an array of booking objects in a single
// row of table `allotment_indo`. Keep the array in memory for quick updates.
let hotelBookings = []; // [{room_id, month_name, day_number, user_code}]

// total allotment units for selected hotel
let currentTotalUnit = 1;

// Will hold release days value for currently selected hotel (set by selector script)
let currentReleaseDays = 0;
let currentSingleUnit = false; // Track if current hotel is single unit
let currentCloseSellData = true; // Track if current hotel should show closed days

// Fetch (or initialise) bookings JSON for the current hotel
async function loadHotelBookings() {
    if (!currentHotel) return;
    const { data, error } = await supabase
        .from('allotment_indo')
        .select('bookings')
        .eq('hotel_name', currentHotel)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Failed to load bookings', error);
        hotelBookings = [];
        return;
    }

    if (data && Array.isArray(data.bookings)) {
        hotelBookings = data.bookings;
    } else {
        hotelBookings = [];
    }
}

// --- Load hotel data and render table (replaces hotelSelector change event) ---
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

    // Load bookings for this hotel
    await loadHotelBookings();

    // Update the hotel name title
    const hotelNameTitleElement = document.getElementById('currentHotelNameTitle');
    if (hotelNameTitleElement) {
        hotelNameTitleElement.textContent = hotelName;
    }

    renderTabs();
    renderMonthTable(currentMonth);
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
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
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

    // Set initial month title
    const monthTitleElement = document.getElementById('currentMonthTitle');
    if (monthTitleElement) {
        monthTitleElement.textContent = currentMonth;
    }
}

function renderMonthTable(month) {
    // Update the month title
    const monthTitleElement = document.getElementById('currentMonthTitle');
    if (monthTitleElement) {
        monthTitleElement.textContent = month;
    }

    const days = Array.from({ length: daysInMonth[month] }, (_, i) => i + 1);

    let html = `<table><thead><tr><th>Room Type</th>`;
    days.forEach(day => html += `<th>${day}</th>`);
    html += `</tr></thead><tbody>`;

    // --- NEW LOGIC: Render single Total Unit row at top if totalUnit:1 and no custom units ---
    const isSingleUnit = currentTotalUnit === 1 && (!currentRoomUnits || Object.keys(currentRoomUnits).length === 0);
    if (isSingleUnit) {
        html += `<tr class="unit-row"><td class="sticky-col">Total Unit</td>`;
        days.forEach(() => html += `<th>1</th>`);
        html += `</tr>`;
    }

    hotelData.forEach(row => {
        const roomType = row["Room Type"];
        const roomUnits = currentRoomUnits[roomType] || currentTotalUnit;

        // Only render per-room Total Unit row if not single-unit mode
        if (!isSingleUnit) {
            html += `<tr class="unit-row" data-room-type-unit="${roomType}"><td class="sticky-col">Total Unit</td>`;
            days.forEach(() => html += `<th>${roomUnits}</th>`);
            html += `</tr>`;
        }

        // generate one availability row per unit
        for (let u = 1; u <= roomUnits; u++) {
            const syntheticId = `${row.id}-${u}`;
            html += `<tr data-id="${syntheticId}" data-room-type="${roomType}" data-unit-index="${u}" data-room-id="${row.id}">`;
            if (u === 1) {
                html += `<td rowspan="${roomUnits}" class="sticky-col">${roomType}</td>`;
            }

            // Parse current month string like "7-8, 11-12, 30"
            const closedDays = currentCloseSellData ? parseCloseDays(row[month]) : [];

            days.forEach(day => {
                const isClosed = closedDays.includes(day);

                // Determine if this cell falls inside the "released" window
                let isReleased = false;
                if (!isClosed && (currentReleaseDays || 0) > 0) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Reset time to start of day

                    // Build a Date object that represents this table cell
                    const monthIndex = months.indexOf(month);
                    let cellDate = new Date(today.getFullYear(), monthIndex, day);

                    // Handle year transition - if we're in December and looking at January, it's next year
                    if (today.getMonth() === 11 && monthIndex === 0) {
                        cellDate.setFullYear(today.getFullYear() + 1);
                    }
                    // If the cell month is ahead of the current month, it's the same year (not previous year)
                    else if (monthIndex > today.getMonth()) {
                        // Keep the same year for future months in the same year
                        cellDate.setFullYear(today.getFullYear());
                    }

                    // Calculate boundary dates
                    const twoMonthsAgo = new Date(today);
                    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

                    const releaseBoundary = new Date(today);
                    releaseBoundary.setDate(releaseBoundary.getDate() + (currentReleaseDays - 1));

                    // Cell is released if it's within the release window (2 months ago to today + releaseDays)
                    isReleased = cellDate >= twoMonthsAgo && cellDate <= releaseBoundary;

                    // Debug logging for August days 1-10
                    if (month === 'August' && day >= 1 && day <= 10) {
                        console.log(`August ${day}:`, {
                            today: today.toDateString(),
                            cellDate: cellDate.toDateString(),
                            releaseBoundary: releaseBoundary.toDateString(),
                            isReleased,
                            currentReleaseDays
                        });
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

    // Persist full array
    await supabase
        .from('allotment_indo')
        .upsert({ hotel_name: currentHotel, bookings: hotelBookings }, { onConflict: ['hotel_name'] });
}