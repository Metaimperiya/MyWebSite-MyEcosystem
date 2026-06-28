// ===== АВТОРИЗАЦИЯ =====

// Вход через Google
document.getElementById('googleBtn').addEventListener('click', () => {
    auth.signInWithPopup(provider).catch(e => {
        if (e.code === 'auth/popup-blocked') {
            auth.signInWithRedirect(provider);
        } else {
            alert('Ошибка: ' + e.message);
        }
    });
});

// Анонимный вход по имени
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

// Выход
function logout() {
    if (!confirm('Выйти из профиля?')) return;
    
    closeContextMenu();
    closeProfileDropdown();
    cancelAllRequests();
    
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
    }).catch(e => alert('Ошибка выхода: ' + e.message));
}

// Вход по сохраненному профилю
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
