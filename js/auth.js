auth.onAuthStateChanged(user => {
    if (user) {
        USER_UID = user.uid;
        USER = user.displayName || user.email || 'User';
        localStorage.setItem('dc_u_' + SITE, USER);
        
        // === СОХРАНЯЕМ АВАТАРКУ ИЗ GOOGLE ===
        const avatarUrl = user.photoURL || null;
        avatarCache = avatarUrl;
        
        db.ref('sites/' + SITE + '/users/' + USER_UID).update({
            name: USER,
            email: user.email || 'anon',
            uid: USER_UID,
            lastLogin: Date.now(),
            avatarUrl: avatarUrl
        });
        db.ref('sites/' + SITE + '/all_users/' + USER_UID).set({
            name: USER,
            email: user.email || 'anon',
            uid: USER_UID,
            avatarUrl: avatarUrl
        });
        
        document.getElementById('loginModal').classList.remove('open');
        updateUI();
        loadFeed();
        loadGroups();
        loadPeople();
        loadProfile();
        loadNotifications();
    } else {
        USER = null;
        USER_UID = null;
        avatarCache = null;
        document.getElementById('loginModal').classList.add('open');
        updateUI();
        loadSavedProfiles();
    }
});

document.getElementById('googleBtn').addEventListener('click', function() {
    auth.signInWithPopup(provider).catch(err => {
        if (err.code === 'auth/popup-blocked') auth.signInWithRedirect(provider);
        else alert('Ошибка входа: ' + err.message);
    });
});

window.closeLogin = function() {
    document.getElementById('loginModal').classList.remove('open');
};

window.loginName = function() {
    const n = document.getElementById('nameInput').value.trim();
    if (!n) { alert('Введите имя'); return; }
    auth.signInAnonymously().then(() => {
        USER = n.slice(0, 24);
        USER_UID = 'anon_' + Date.now();
        localStorage.setItem('dc_u_' + SITE, USER);
        const data = { name: USER, email: 'anon_' + Date.now() + '@anon.com', uid: USER_UID, lastLogin: Date.now() };
        db.ref('sites/' + SITE + '/users/' + USER_UID).update(data);
        db.ref('sites/' + SITE + '/all_users/' + USER_UID).set(data);
        saveProfileToList(USER_UID, USER, data.email);
        document.getElementById('loginModal').classList.remove('open');
        updateUI();
        loadFeed();
        loadGroups();
        loadPeople();
        loadProfile();
        loadNotifications();
    }).catch(e => alert('Ошибка: ' + e.message));
};

window.logout = function() {
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
    }).catch(e => alert('Ошибка: ' + e.message));
};

function loginWithSavedProfile(uid) {
    const profile = SAVED_PROFILES.find(p => p.uid === uid);
    if (!profile) return;
    auth.signInAnonymously().then(() => {
        USER = profile.name;
        USER_UID = uid;
        localStorage.setItem('dc_u_' + SITE, USER);
        const data = { name: profile.name, email: profile.email || 'anon', uid: uid, lastLogin: Date.now(), avatarUrl: profile.avatarUrl || null };
        db.ref('sites/' + SITE + '/users/' + uid).update(data);
        db.ref('sites/' + SITE + '/all_users/' + uid).set(data);
        profile.lastUsed = Date.now();
        localStorage.setItem('dc_profiles_' + SITE, JSON.stringify(SAVED_PROFILES));
        document.getElementById('loginModal').classList.remove('open');
        updateUI();
        loadFeed();
        loadGroups();
        loadPeople();
        loadProfile();
        loadNotifications();
    }).catch(e => alert('Ошибка: ' + e.message));
}

function loadSavedProfiles() {
    try { SAVED_PROFILES = JSON.parse(localStorage.getItem('dc_profiles_' + SITE) || '[]'); }
    catch(e) { SAVED_PROFILES = []; }
}

function saveProfileToList(uid, name, email, avatarUrl) {
    const existing = SAVED_PROFILES.find(p => p.uid === uid);
    if (!existing) {
        SAVED_PROFILES.push({ uid, name, email: email || 'anon', avatarUrl: avatarUrl || null, lastUsed: Date.now() });
    } else {
        existing.name = name;
        existing.email = email || 'anon';
        existing.avatarUrl = avatarUrl || null;
        existing.lastUsed = Date.now();
    }
    localStorage.setItem('dc_profiles_' + SITE, JSON.stringify(SAVED_PROFILES));
}

function removeSavedProfile(uid) {
    if (!confirm('Удалить сохраненный профиль?')) return;
    SAVED_PROFILES = SAVED_PROFILES.filter(p => p.uid !== uid);
    localStorage.setItem('dc_profiles_' + SITE, JSON.stringify(SAVED_PROFILES));
}
