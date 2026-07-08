// ================================================================
// АВТОРИЗАЦИЯ
// ================================================================

function initGoogleButton() {
    var btn = document.getElementById('googleBtn');
    if (btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🔵 Google-вход нажат');
            auth.signInWithPopup(provider)
                .then(function(result) {
                    console.log('✅ Google-вход успешен:', result.user.displayName);
                })
                .catch(function(err) {
                    console.error('❌ Ошибка:', err);
                    if (err.code === 'auth/popup-blocked') {
                        alert('Разрешите попапы для этого сайта');
                        auth.signInWithRedirect(provider);
                    } else {
                        alert('Ошибка: ' + err.message);
                    }
                });
        });
        console.log('✅ Google-кнопка подключена');
        return true;
    }
    return false;
}

document.addEventListener('DOMContentLoaded', function() {
    if (!initGoogleButton()) {
        setTimeout(initGoogleButton, 1500);
        setTimeout(initGoogleButton, 3000);
    }
});

window.loginWithName = function() {
    var input = document.getElementById('nameInput');
    if (!input) { alert('Ошибка'); return; }
    var n = input.value.trim();
    if (!n) { alert('Введите имя'); return; }
    
    auth.signInAnonymously().then(function() {
        USER = n.slice(0, 24);
        USER_UID = 'anon_' + Date.now();
        localStorage.setItem('dc_u_' + SITE, USER);
        
        var slug = null;
        if (USER.toLowerCase().includes('player')) {
            slug = 'player-likee';
        }
        
        db.ref('sites/' + SITE + '/users/' + USER_UID).update({
            name: USER,
            email: 'anon@anon.com',
            uid: USER_UID,
            lastLogin: Date.now(),
            slug: slug
        });
        db.ref('sites/' + SITE + '/all_users/' + USER_UID).set({
            name: USER,
            email: 'anon@anon.com',
            uid: USER_UID,
            lastLogin: Date.now(),
            slug: slug
        });
        
        document.getElementById('loginModal').classList.remove('open');
        if (typeof updateUI === 'function') updateUI();
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadGroups === 'function') loadGroups();
        if (typeof loadPeople === 'function') loadPeople();
        if (typeof loadProfile === 'function') loadProfile();
        if (typeof loadNotifications === 'function') loadNotifications();
        if (typeof loadFriendRequests === 'function') loadFriendRequests();
    }).catch(function(e) { alert('Ошибка: ' + e.message); });
};

window.closeLogin = function() {
    var modal = document.getElementById('loginModal');
    if (modal) modal.classList.remove('open');
};

window.logout = function() {
    if (!confirm('Выйти из профиля?')) return;
    if (notifUnsub) { try { notifUnsub(); } catch(e) {} notifUnsub = null; }
    
    auth.signOut().then(function() {
        localStorage.removeItem('dc_u_' + SITE);
        localStorage.removeItem('dc_admin_' + SITE);
        USER = null;
        USER_UID = null;
        isAdmin = false;
        
        var feed = document.getElementById('feed');
        if (feed) feed.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Войдите</div>';
        var dot = document.getElementById('adminDot');
        if (dot) dot.classList.remove('active');
        if (typeof closeSidebar === 'function') closeSidebar();
        var loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.add('open');
        if (typeof updateUI === 'function') updateUI();
        if (typeof loadSavedProfiles === 'function') loadSavedProfiles();
    }).catch(function(e) { alert('Ошибка: ' + e.message); });
};

function loadSavedProfiles() {
    try { SAVED_PROFILES = JSON.parse(localStorage.getItem('dc_profiles_' + SITE) || '[]'); }
    catch(e) { SAVED_PROFILES = []; }
}

function saveProfileToList(uid, name, email, avatarUrl) {
    var existing = SAVED_PROFILES.find(function(p) { return p.uid === uid; });
    if (!existing) {
        SAVED_PROFILES.push({ uid: uid, name: name, email: email || 'anon', avatarUrl: avatarUrl || null, lastUsed: Date.now() });
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

function loginWithSavedProfile(uid) {
    var profile = SAVED_PROFILES.find(function(p) { return p.uid === uid; });
    if (!profile) return;
    auth.signInAnonymously().then(function() {
        USER = profile.name;
        USER_UID = uid;
        localStorage.setItem('dc_u_' + SITE, USER);
        
        var slug = null;
        if (USER.toLowerCase().includes('player')) {
            slug = 'player-likee';
        }
        
        db.ref('sites/' + SITE + '/users/' + uid).update({
            name: profile.name,
            email: profile.email || 'anon',
            uid: uid,
            lastLogin: Date.now(),
            slug: slug
        });
        db.ref('sites/' + SITE + '/all_users/' + uid).set({
            name: profile.name,
            email: profile.email || 'anon',
            uid: uid,
            lastLogin: Date.now(),
            slug: slug
        });
        profile.lastUsed = Date.now();
        localStorage.setItem('dc_profiles_' + SITE, JSON.stringify(SAVED_PROFILES));
        document.getElementById('loginModal').classList.remove('open');
        if (typeof updateUI === 'function') updateUI();
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadGroups === 'function') loadGroups();
        if (typeof loadPeople === 'function') loadPeople();
        if (typeof loadProfile === 'function') loadProfile();
        if (typeof loadNotifications === 'function') loadNotifications();
        if (typeof loadFriendRequests === 'function') loadFriendRequests();
    }).catch(function(e) { alert('Ошибка: ' + e.message); });
}

auth.onAuthStateChanged(function(user) {
    if (user) {
        USER_UID = user.uid;
        USER = user.displayName || user.email || 'User';
        localStorage.setItem('dc_u_' + SITE, USER);
        var avatarUrl = user.photoURL || null;
        if (!avatarCache) avatarCache = {};
        avatarCache[USER_UID] = avatarUrl;
        
        var slug = null;
        if (USER && USER.toLowerCase().includes('player')) {
            slug = 'player-likee';
        }
        
        db.ref('sites/' + SITE + '/users/' + USER_UID).update({
            name: USER,
            email: user.email || 'anon',
            uid: USER_UID,
            lastLogin: Date.now(),
            avatarUrl: avatarUrl,
            slug: slug
        });
        db.ref('sites/' + SITE + '/all_users/' + USER_UID).set({
            name: USER,
            email: user.email || 'anon',
            uid: USER_UID,
            lastLogin: Date.now(),
            avatarUrl: avatarUrl,
            slug: slug
        });
        var loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.remove('open');
        if (typeof updateUI === 'function') updateUI();
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadGroups === 'function') loadGroups();
        if (typeof loadPeople === 'function') loadPeople();
        if (typeof loadProfile === 'function') loadProfile();
        if (typeof loadNotifications === 'function') loadNotifications();
        if (typeof loadFriendRequests === 'function') loadFriendRequests();
    } else {
        USER = null;
        USER_UID = null;
        var loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.add('open');
        if (typeof updateUI === 'function') updateUI();
        if (typeof loadSavedProfiles === 'function') loadSavedProfiles();
    }
});
