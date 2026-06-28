document.getElementById('googleBtn').addEventListener('click', () => {
    auth.signInWithPopup(provider).catch(e => {
        if (e.code === 'auth/popup-blocked') {
            auth.signInWithRedirect(provider);
        } else {
            alert('Ошибка: ' + e.message);
        }
    });
});

function loginName() {
    const name = document.getElementById('nameInput').value.trim();
    if (!name) { alert('Введите имя'); return; }
    auth.signInAnonymously().then(() => {
        USER = name;
        USER_UID = 'anon_' + Date.now();
        localStorage.setItem('dc_u_' + SITE, USER);
        const data = {
            name: USER,
            email: 'anon_' + Date.now() + '@anon.com',
            uid: USER_UID,
            lastLogin: Date.now()
        };
        db.ref('sites/' + SITE + '/users/' + USER_UID).update(data);
        db.ref('sites/' + SITE + '/all_users/' + USER_UID).set(data);
        saveProfileToList(USER_UID, USER, data.email);
        document.getElementById('loginModal').classList.remove('open');
        updateUI();
        loadData();
        navigateToFeed();
        loadNotifications();
    }).catch(e => alert('Ошибка: ' + e.message));
}

function logout() {
    if (!confirm('Выйти из профиля?')) return;
    closeContextMenu();
    closeProfileDropdown();
    if (notifUnsub) { notifUnsub(); notifUnsub = null; }
    if (friendListeners) {
        Object.values(friendListeners).forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') unsubscribe();
        });
        friendListeners = {};
    }
    auth.signOut().then(() => {
        localStorage.removeItem('dc_u_' + SITE);
        USER = null;
        USER_UID = null;
        avatarCache = null;
        isAdmin = false;
        document.body.classList.remove('admin-mode');
        document.getElementById('loginModal').classList.add('open');
        updateUI();
        loadSavedProfiles();
        navigateToFeed();
    }).catch(e => alert('Ошибка: ' + e.message));
}

function loginWithSavedProfile(uid) {
    const profile = SAVED_PROFILES.find(p => p.uid === uid);
    if (!profile) return;
    auth.signInAnonymously().then(() => {
        USER = profile.name;
        USER_UID = uid;
        localStorage.setItem('dc_u_' + SITE, USER);
        const data = {
            name: profile.name,
            email: profile.email || 'anon',
            uid: uid,
            lastLogin: Date.now(),
            avatarUrl: profile.avatarUrl || null
        };
        db.ref('sites/' + SITE + '/users/' + uid).update(data);
        db.ref('sites/' + SITE + '/all_users/' + uid).set(data);
        profile.lastUsed = Date.now();
        localStorage.setItem('dc_profiles_' + SITE, JSON.stringify(SAVED_PROFILES));
        document.getElementById('loginModal').classList.remove('open');
        updateUI();
        loadData();
        navigateToFeed();
        loadNotifications();
    }).catch(e => alert('Ошибка: ' + e.message));
}

function loadSavedProfiles() {
    try {
        SAVED_PROFILES = JSON.parse(localStorage.getItem('dc_profiles_' + SITE) || '[]');
    } catch(e) {
        SAVED_PROFILES = [];
    }
    renderSavedProfiles();
}

function saveProfileToList(uid, name, email, avatarUrl) {
    const existing = SAVED_PROFILES.find(p => p.uid === uid);
    if (!existing) {
        SAVED_PROFILES.push({
            uid: uid,
            name: name,
            email: email || 'anon',
            avatarUrl: avatarUrl || null,
            lastUsed: Date.now()
        });
    } else {
        existing.name = name;
        existing.email = email || 'anon';
        existing.avatarUrl = avatarUrl || null;
        existing.lastUsed = Date.now();
    }
    localStorage.setItem('dc_profiles_' + SITE, JSON.stringify(SAVED_PROFILES));
    renderSavedProfiles();
}

function renderSavedProfiles() {
    const container = document.getElementById('profileSelector');
    if (!container) return;
    if (!SAVED_PROFILES.length) {
        container.innerHTML = '<div style="color:#65676b;text-align:center;padding:8px;font-size:13px;">Нет сохраненных профилей</div>';
        return;
    }
    const sorted = [...SAVED_PROFILES].sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
    container.innerHTML = sorted.map(p => {
        const letter = (p.name || '?').charAt(0).toUpperCase();
        const avatarHtml = p.avatarUrl ? `<img src="${p.avatarUrl}">` : `<span>${letter}</span>`;
        return `
            <div class="profile-option" onclick="loginWithSavedProfile('${p.uid}')">
                <div class="avatar">${avatarHtml}</div>
                <div class="info">
                    <div class="name">${p.name || 'Аноним'}</div>
                    <div class="email">${p.email || ''}</div>
                </div>
                <button class="remove-btn" onclick="event.stopPropagation();removeSavedProfile('${p.uid}')">✕</button>
            </div>
        `;
    }).join('');
}

function removeSavedProfile(uid) {
    if (!confirm('Удалить сохраненный профиль?')) return;
    SAVED_PROFILES = SAVED_PROFILES.filter(p => p.uid !== uid);
    localStorage.setItem('dc_profiles_' + SITE, JSON.stringify(SAVED_PROFILES));
    renderSavedProfiles();
}
