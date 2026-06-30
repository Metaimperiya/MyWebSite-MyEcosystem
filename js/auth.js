// ================================================================
// АВТОРИЗАЦИЯ
// ================================================================

auth.onAuthStateChanged(function(user) {
    if (user) {
        USER_UID = user.uid;
        USER = user.displayName || user.email || 'User';
        localStorage.setItem('dc_u_' + SITE, USER);
        
        const avatarUrl = user.photoURL || null;
        if (!avatarCache) avatarCache = {};
        avatarCache[USER_UID] = avatarUrl;
        
        // Сохраняем в базу
        const userData = {
            name: USER,
            email: user.email || 'anon',
            uid: USER_UID,
            lastLogin: Date.now(),
            avatarUrl: avatarUrl
        };
        
        db.ref('sites/' + SITE + '/users/' + USER_UID).update(userData);
        db.ref('sites/' + SITE + '/all_users/' + USER_UID).set(userData);
        
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
        document.getElementById('loginModal').classList.add('open');
        updateUI();
        loadSavedProfiles();
    }
});

// ===== ВХОД ЧЕРЕЗ GOOGLE =====

document.getElementById('googleBtn').addEventListener('click', function() {
    auth.signInWithPopup(provider).catch(function(err) {
        if (err.code === 'auth/popup-blocked') {
            auth.signInWithRedirect(provider);
        } else {
            alert('Ошибка входа: ' + err.message);
        }
    });
});

// ===== ВХОД ПО ИМЕНИ =====

window.loginWithName = function() {
    const n = document.getElementById('nameInput').value.trim();
    if (!n) {
        alert('Введите имя');
        return;
    }
    
    auth.signInAnonymously().then(function() {
        USER = n.slice(0, 24);
        USER_UID = 'anon_' + Date.now();
        localStorage.setItem('dc_u_' + SITE, USER);
        
        const userData = {
            name: USER,
            email: 'anon_' + Date.now() + '@anon.com',
            uid: USER_UID,
            lastLogin: Date.now(),
            avatarUrl: null
        };
        
        db.ref('sites/' + SITE + '/users/' + USER_UID).update(userData);
        db.ref('sites/' + SITE + '/all_users/' + USER_UID).set(userData);
        saveProfileToList(USER_UID, USER, userData.email);
        
        document.getElementById('loginModal').classList.remove('open');
        updateUI();
        loadFeed();
        loadGroups();
        loadPeople();
        loadProfile();
        loadNotifications();
    }).catch(function(e) {
        alert('Ошибка: ' + e.message);
    });
};

// ===== ЗАКРЫТЬ ВХОД =====

window.closeLogin = function() {
    document.getElementById('loginModal').classList.remove('open');
};

// ===== ВЫХОД =====

window.logout = function() {
    if (!confirm('Выйти из профиля?')) return;
    
    if (notifUnsub) {
        notifUnsub();
        notifUnsub = null;
    }
    
    auth.signOut().then(function() {
        localStorage.removeItem('dc_u_' + SITE);
        USER = null;
        USER_UID = null;
        isAdmin = false;
        document.getElementById('loginModal').classList.add('open');
        updateUI();
        loadSavedProfiles();
    }).catch(function(e) {
        alert('Ошибка: ' + e.message);
    });
};

// ===== СОХРАНЕННЫЕ ПРОФИЛИ =====

function loadSavedProfiles() {
    try {
        SAVED_PROFILES = JSON.parse(localStorage.getItem('dc_profiles_' + SITE) || '[]');
    } catch(e) {
        SAVED_PROFILES = [];
    }
}

function saveProfileToList(uid, name, email, avatarUrl) {
    const existing = SAVED_PROFILES.find(function(p) { return p.uid === uid; });
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
}

function removeSavedProfile(uid) {
    if (!confirm('Удалить сохраненный профиль?')) return;
    SAVED_PROFILES = SAVED_PROFILES.filter(function(p) { return p.uid !== uid; });
    localStorage.setItem('dc_profiles_' + SITE, JSON.stringify(SAVED_PROFILES));
}

// ===== ВХОД ПО СОХРАНЕННОМУ ПРОФИЛЮ =====

function loginWithSavedProfile(uid) {
    const profile = SAVED_PROFILES.find(function(p) { return p.uid === uid; });
    if (!profile) return;
    
    auth.signInAnonymously().then(function() {
        USER = profile.name;
        USER_UID = uid;
        localStorage.setItem('dc_u_' + SITE, USER);
        
        const userData = {
            name: profile.name,
            email: profile.email || 'anon',
            uid: uid,
            lastLogin: Date.now(),
            avatarUrl: profile.avatarUrl || null
        };
        
        db.ref('sites/' + SITE + '/users/' + uid).update(userData);
        db.ref('sites/' + SITE + '/all_users/' + uid).set(userData);
        
        profile.lastUsed = Date.now();
        localStorage.setItem('dc_profiles_' + SITE, JSON.stringify(SAVED_PROFILES));
        
        document.getElementById('loginModal').classList.remove('open');
        updateUI();
        loadFeed();
        loadGroups();
        loadPeople();
        loadProfile();
        loadNotifications();
    }).catch(function(e) {
        alert('Ошибка: ' + e.message);
    });
}
