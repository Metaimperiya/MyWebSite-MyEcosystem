// ================================================================
// АВТОРИЗАЦИЯ — ТОЛЬКО REDIRECT (БЕЗ ПОПАПОВ)
// ================================================================

function initGoogleButton() {
    var btn = document.getElementById('googleBtn');
    if (btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🔵 Google-вход нажат');
            
            // 👇 ПРОСТО ПЕРЕКИДЫВАЕТ НА GOOGLE, БЕЗ ВСПЛЫВАЮЩИХ ОКОН
            auth.signInWithRedirect(provider);
        });
        console.log('✅ Google-кнопка подключена (Redirect)');
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

// ===== ОБРАБОТКА ВОЗВРАТА ПОСЛЕ REDIRECT =====
auth.getRedirectResult().then(function(result) {
    if (result.user) {
        console.log('✅ Google-вход успешен:', result.user.displayName);
        if (typeof updateUI === 'function') updateUI();
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadProfile === 'function') loadProfile();
    }
}).catch(function(error) {
    console.error('❌ Ошибка входа:', error);
    if (error.code === 'auth/unauthorized-domain') {
        alert('⚠️ Добавьте этот домен в Firebase Console → Authentication → Sign-in methods → Authorized domains');
    }
});

// ===== АНОНИМНЫЙ ВХОД ПО ИМЕНИ (ЕСЛИ НУЖЕН) =====
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
        } else {
            slug = USER.toLowerCase().replace(/[^a-z0-9]/g, '-');
            if (slug.length > 30) slug = slug.slice(0, 30);
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
        if (feed) feed.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Войдите через Google</div>';
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
    
    // ПРОСТО ОТКРЫВАЕМ МОДАЛКУ С GOOGLE-ВХОДОМ
    alert('👆 Нажмите "Войти через Google"');
    document.getElementById('loginModal').classList.add('open');
}

// ===== AUTH STATE =====
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
        } else {
            slug = USER.toLowerCase().replace(/[^a-z0-9]/g, '-');
            if (slug.length > 30) slug = slug.slice(0, 30);
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

// ===== ОТКРЫВАЕМ МОДАЛКУ, ЕСЛИ НЕТ ПОЛЬЗОВАТЕЛЯ =====
(function() {
    if (!USER_UID) {
        setTimeout(function() {
            var loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.add('open');
        }, 500);
    }
})();

console.log('✅ Google Auth настроен (только Redirect, без попапов)');
