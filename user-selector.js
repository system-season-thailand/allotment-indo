// User selector logic – shared across pages. Expects `allotmentUsers` array defined globally.
document.addEventListener('DOMContentLoaded', () => {
    const userSelect = document.getElementById('userSelector');
    if (!userSelect) return;

    // Populate options
    if (userSelect.options.length === 0) {
        (window.allotmentUsers || []).forEach(u => {
            const option = document.createElement('option');
            option.value = u.code; // store code as value
            option.textContent = u.name; // show full name
            userSelect.appendChild(option);
        });
    }

    // Load saved code
    const savedCode = localStorage.getItem('SelectedUser');
    if (savedCode && (window.allotmentUsers || []).some(u => u.code === savedCode)) {
        userSelect.value = savedCode;
    }

    userSelect.addEventListener('change', () => {
        localStorage.setItem('SelectedUser', userSelect.value);
    });
});

// Provide helper to get current user code globally
function getCurrentUserCode() {
    const sel = document.getElementById('userSelector');
    return sel ? sel.value : '';
}
window.getCurrentUserCode = getCurrentUserCode; 