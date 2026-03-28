document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const imapInput = document.getElementById('imap');
    const loginError = document.getElementById('login-error');
    const loginBtn = document.getElementById('login-btn');
    const loaderIcon = loginBtn.querySelector('.loader');
    const btnText = loginBtn.querySelector('span:first-child');
    const arrowIcon = loginBtn.querySelector('.ph-arrow-right');
    
    const userEmailDisplay = document.getElementById('user-email-display');
    const logoutBtn = document.getElementById('logout-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const selectAllCheckbox = document.getElementById('select-all');
    const deleteBtn = document.getElementById('delete-btn');
    
    // Dashboard States
    const emailListContainer = document.getElementById('email-list');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    
    // Modal Elements
    const manualModal = document.getElementById('manual-modal');
    const openManualBtn = document.getElementById('open-manual-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const checkTextBtn = document.getElementById('check-text-btn');
    const manualText = document.getElementById('manual-text');
    const manualResult = document.getElementById('manual-result');
    const manualBadge = document.getElementById('manual-badge');

    // State
    let currentCredentials = null;

    // --- Switch Views ---
    function switchView(viewId) {
        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active');
            setTimeout(() => { if (!v.classList.contains('active')) v.style.display = 'none'; }, 400);
        });
        
        const targetView = document.getElementById(viewId);
        targetView.style.display = 'flex';
        // tiny delay to allow display:flex to apply before adding opacity
        setTimeout(() => targetView.classList.add('active'), 50);
    }

    // --- Login Handling ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const imap_server = imapInput.value.trim() || 'imap.gmail.com';
        
        // UI Loading state
        loginBtn.disabled = true;
        btnText.textContent = 'Connecting...';
        arrowIcon.classList.add('hidden');
        loaderIcon.classList.remove('hidden');
        
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, imap_server })
            });
            
            const data = await res.json();
            
            if (res.ok && data.success) {
                // Login Success
                currentCredentials = { email, password, imap_server };
                userEmailDisplay.textContent = email;
                switchView('dashboard-view');
                fetchEmails();
            } else {
                // Login Failed
                loginError.textContent = data.message || 'Failed to connect. Please check credentials.';
            }
        } catch (err) {
            loginError.textContent = 'Network error. Make sure the server is running.';
            console.error(err);
        } finally {
            // Revert UI Loading state
            loginBtn.disabled = false;
            btnText.textContent = 'Secure Connect';
            arrowIcon.classList.remove('hidden');
            loaderIcon.classList.add('hidden');
        }
    });

    // --- Logout Handling ---
    logoutBtn.addEventListener('click', () => {
        currentCredentials = null;
        emailInput.value = '';
        passwordInput.value = '';
        loginError.textContent = '';
        switchView('login-view');
    });

    // --- Dashboard Fetching ---
    refreshBtn.addEventListener('click', () => fetchEmails());

    async function fetchEmails() {
        if (!currentCredentials) return;
        
        // Show loading state
        emailListContainer.innerHTML = '';
        loadingState.classList.remove('hidden');
        emptyState.classList.add('hidden');
        
        refreshBtn.disabled = true;
        refreshBtn.querySelector('i').style.animation = 'spin 1s linear infinite';

        try {
            const res = await fetch('/api/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...currentCredentials, limit: 50 })
            });
            
            const data = await res.json();
            
            loadingState.classList.add('hidden');
            
            if (res.ok && data.success) {
                if (data.emails && data.emails.length > 0) {
                    renderEmails(data.emails);
                } else {
                    emptyState.classList.remove('hidden');
                }
            } else {
                // Show error state inside dashboard
                emptyState.querySelector('i').className = 'ph ph-warning-circle text-danger';
                emptyState.querySelector('p').textContent = `Error: ${data.error || 'Failed to fetch'}`;
                emptyState.classList.remove('hidden');
            }
        } catch (err) {
            console.error(err);
            loadingState.classList.add('hidden');
            emptyState.querySelector('i').className = 'ph ph-wifi-x';
            emptyState.querySelector('p').textContent = 'Network error. Could not fetch emails.';
            emptyState.classList.remove('hidden');
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.querySelector('i').style.animation = 'none';
        }
    }

    function renderEmails(emails) {
        emails.forEach((email, index) => {
            const isSpam = email.prediction.toLowerCase() === 'spam';
            const li = document.createElement('li');
            li.className = `email-item ${isSpam ? 'is-spam' : ''}`;
            
            // Stagger animation
            li.style.animation = `slideUp 0.4s ease forwards ${index * 0.05}s`;
            li.style.opacity = '0';
            li.style.transform = 'translateY(10px)';
            
            // Generate a random color for avatar
            const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
            const avatarColor = colors[email.sender.length % colors.length];
            const initial = email.sender.charAt(0).toUpperCase().replace(/[^A-Z]/, '?') || '?';
            
            const badgeClass = isSpam ? 'spam' : 'ham';
            const badgeIcon = isSpam ? 'ph-warning' : 'ph-check-circle';
            const badgeText = isSpam ? 'Spam Detected' : 'Safe';

            li.innerHTML = `
                <div class="checkbox-wrapper" style="margin-top: 5px;">
                    <input type="checkbox" class="email-checkbox" data-id="${email.id}">
                </div>
                <div class="email-avatar" style="background: rgba(255,255,255,0.1); color: ${avatarColor}">
                    ${initial}
                </div>
                <div class="email-content">
                    <div class="email-header">
                        <span class="email-sender">${escapeHTML(email.sender)}</span>
                        <div class="badge ${badgeClass}">
                            <i class="ph ${badgeIcon}"></i> ${badgeText}
                        </div>
                    </div>
                    <div class="email-subject">${escapeHTML(email.subject)}</div>
                    <div class="email-snippet">${escapeHTML(email.snippet)}</div>
                </div>
            `;
            
            emailListContainer.appendChild(li);
        });

        // Re-attach event listeners for checkboxes
        attachCheckboxListeners();
        updateDeleteBtnVisibility();
        selectAllCheckbox.checked = false;
    }

    function attachCheckboxListeners() {
        const checkboxes = document.querySelectorAll('.email-checkbox');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', updateDeleteBtnVisibility);
        });
    }

    function updateDeleteBtnVisibility() {
        const checkboxes = document.querySelectorAll('.email-checkbox');
        const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
        const allChecked = Array.from(checkboxes).every(cb => cb.checked) && checkboxes.length > 0;
        
        selectAllCheckbox.checked = allChecked;

        if (anyChecked) {
            deleteBtn.disabled = false;
        } else {
            deleteBtn.disabled = true;
        }
    }

    selectAllCheckbox.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.email-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = e.target.checked;
        });
        updateDeleteBtnVisibility();
    });

    deleteBtn.addEventListener('click', async () => {
        const checkboxes = document.querySelectorAll('.email-checkbox:checked');
        const emailIds = Array.from(checkboxes).map(cb => cb.dataset.id);
        
        if (emailIds.length === 0) return;

        if (!confirm(`Are you sure you want to permanently delete ${emailIds.length} email(s) from your server?`)) {
            return;
        }

        deleteBtn.disabled = true;
        const icon = deleteBtn.querySelector('.ph-trash');
        const loader = deleteBtn.querySelector('.loader');
        
        icon.classList.add('hidden');
        loader.classList.remove('hidden');

        try {
            const res = await fetch('/api/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...currentCredentials, email_ids: emailIds })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                // Refresh list automatically
                fetchEmails();
            } else {
                alert(`Error deleting emails: ${data.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            alert('A network error occurred while deleting emails.');
        } finally {
            deleteBtn.disabled = false;
            icon.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    });

    // --- Manual Check Modal ---
    openManualBtn.addEventListener('click', () => {
        manualModal.classList.remove('hidden');
        manualText.value = '';
        manualResult.classList.add('hidden');
    });

    closeModalBtn.addEventListener('click', () => {
        manualModal.classList.add('hidden');
    });

    // Close on background click
    manualModal.addEventListener('click', (e) => {
        if (e.target === manualModal) manualModal.classList.add('hidden');
    });

    checkTextBtn.addEventListener('click', async () => {
        const text = manualText.value.trim();
        if (!text) return;

        checkTextBtn.disabled = true;
        checkTextBtn.textContent = 'Analyzing...';
        manualResult.classList.add('hidden');

        try {
            const res = await fetch('/api/check_text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                const isSpam = data.prediction.toLowerCase() === 'spam';
                manualResult.classList.remove('hidden');
                manualBadge.className = `badge-large ${isSpam ? 'spam' : 'ham'}`;
                manualBadge.textContent = isSpam ? '⚠️ High Risk: Spam' : '✅ Safe: Not Spam';
            }
        } catch (err) {
            console.error(err);
        } finally {
            checkTextBtn.disabled = false;
            checkTextBtn.textContent = 'Analyze Text';
        }
    });

    // --- Help Modal ---
    const helpModal = document.getElementById('help-modal');
    const helpLink = document.getElementById('help-link');
    const closeHelpBtn = document.getElementById('close-help-btn');

    if (helpLink) {
        helpLink.addEventListener('click', (e) => {
            e.preventDefault();
            helpModal.classList.remove('hidden');
        });
    }

    if (closeHelpBtn) {
        closeHelpBtn.addEventListener('click', () => {
            helpModal.classList.add('hidden');
        });
    }

    if (helpModal) {
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) helpModal.classList.add('hidden');
        });
    }

    // Utility
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Add keyframe animation for list items dynamically
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
});
