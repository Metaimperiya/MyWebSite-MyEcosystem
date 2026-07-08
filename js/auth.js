// ================================================================
// АВТОРИЗАЦИЯ — ИСПРАВЛЕННАЯ ВЕРСИЯ
// ================================================================

// Состояние пользователя
let currentUser = null;
let currentUserUid = null;
let authInitialized = false;
let authInitPromise = null;

// ===== ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЯ ИЗ FIREBASE =====
function getUserFromFirebase(user) {
    if (!user) return null;
    
    return new Promise((resolve) => {
        const uid = user.uid;
        const displayName = user.displayName || 'User';
        
        db.ref('sites/' + SITE + '/users/' + uid + '/name').once('value', function(snap) {
            const firestoreName = snap.val();
            const name = firestoreName || displayName;
            const email = user.email || 'anon';
            const avatarUrl = user.photoURL || null;
            
            if (!avatarCache) avatarCache = {};
            avatarCache[uid] = avatarUrl;
            
            resolve({
                uid: uid,
                name: name,
                email: email,
                avatarUrl: avatarUrl,
                isAnonymous: user.isAnonymous || false
            });
        });
    });
}

// ===== ИНИЦИАЛИЗАЦИЯ АУТЕНТИФИКАЦИИ =====
function initAuth() {
    if (authInitPromise) return authInitPromise;
    
    authInitPromise = new Promise((resolve) => {
        auth.onAuthStateChanged(async function(user) {
            if (user) {
                try {
                    const userData = await getUserFromFirebase(user);
                    
                    currentUser = userData.name;
                    currentUserUid = userData.uid;
                    USER = currentUser;
                    USER_UID = currentUserUid;
                    
                    localStorage.setItem('dc_u_' + SITE, currentUser);
                    if (userData.avatarUrl) {
                        localStorage.setItem('dc_avatar_' + SITE, userData.avatarUrl);
                    }
                    
                    await db.ref('sites/' + SITE + '/users/' + userData.uid).update({
                        name: userData.name,
                        email: userData.email,
                        uid: userData.uid,
                        lastLogin: Date.now(),
                        avatarUrl: userData.avatarUrl
                    });
                    
                    await db.ref('sites/' + SITE + '/all_users/' + userData.uid).set({
                        name: userData.name,
                        email: userData.email,
                        uid: userData.uid,
                        lastLogin: Date.now(),
                        avatarUrl: userData.avatarUrl
                    });
                    
                    authInitialized = true;
                    
                    const loginModal = document.getElementById('loginModal');
                    if (loginModal) loginModal.classList.remove('open');
                    
                    if (typeof updateUI === 'function') updateUI();
                    if (typeof loadFeed === 'function') loadFeed();
                    if (typeof loadGroups === 'function') loadGroups();
                    if (typeof loadPeople === 'function') loadPeople();
                    if (typeof loadProfile === 'function') loadProfile();
                    if (typeof loadNotifications === 'function') loadNotifications();
                    if (typeof loadFriendRequests === 'function') loadFriendRequests();
                    
                    resolve(userData);
                } catch (error) {
                    console.error('Ошибка загрузки пользователя:', error);
                    resolve(null);
                }
            } else {
                currentUser = null;
                currentUserUid = null;
                USER = null;
                USER_UID = null;
                authInitialized = true;
                
                const loginModal = document.getElementById('loginModal');
                if (loginModal) loginModal.classList.add('open');
                
                if (typeof updateUI === 'function') updateUI();
                if (typeof loadSavedProfiles === 'function') loadSavedProfiles();
                
                resolve(null);
            }
        });
    });
    
    return authInitPromise;
}

// ===== ЗАГРУЗКА СОХРАНЕННЫХ ПРОФИЛЕЙ =====
function loadSavedProfiles() {
    try {
        SAVED_PROFILES = JSON.parse(localStorage.getItem('dc_profiles_' + SITE) || '[]');
    } catch(e) {
        SAVED_PROFILES = [];
    }
}

// ===== СОХРАНЕНИЕ ПРОФИЛЯ =====
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

// ===== УДАЛЕНИЕ СОХРАНЕННОГО ПРОФИЛЯ =====
function removeSavedProfile(uid) {
    if (!confirm('Удалить сохраненный профиль?')) return;
    SAVED_PROFILES = SAVED_PROFILES.filter(function(p) { return p.uid !== uid; });
    localStorage.setItem('dc_profiles_' + SITE, JSON.stringify(SAVED_PROFILES));
}

// ===== ВХОД ПО СОХРАНЕННОМУ ПРОФИЛЮ =====
function loginWithSavedProfile(uid) {
    const profile = SAVED_PROFILES.find(function(p) { return p.uid === uid; });
    if (!profile) return;
    
    auth.signInAnonymously().then(async function() {
        currentUser = profile.name;
        currentUserUid = uid;
        USER = profile.name;
        USER_UID = uid;
        authInitialized = true;
        
        localStorage.setItem('dc_u_' + SITE, profile.name);
        
        await db.ref('sites/' + SITE + '/users/' + uid).update({
            name: profile.name,
            email: profile.email || 'anon',
            uid: uid,
            lastLogin: Date.now()
        });
        
        await db.ref('sites/' + SITE + '/all_users/' + uid).set({
            name: profile.name,
            email: profile.email || 'anon',
            uid: uid,
            lastLogin: Date.now()
        });
        
        profile.lastUsed = Date.now();
        localStorage.setItem('dc_profiles_' + SITE, JSON.stringify(SAVED_PROFILES));
        
        const loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.remove('open');
        
        if (typeof updateUI === 'function') updateUI();
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadGroups === 'function') loadGroups();
        if (typeof loadPeople === 'function') loadPeople();
        if (typeof loadProfile === 'function') loadProfile();
        if (typeof loadNotifications === 'function') loadNotifications();
        if (typeof loadFriendRequests === 'function') loadFriendRequests();
        
    }).catch(function(e) {
        alert('Ошибка: ' + e.message);
    });
}

// ===== ВХОД ПО ИМЕНИ (ГОСТЕВОЙ) =====
window.loginWithName = async function() {
    const input = document.getElementById('nameInput');
    if (!input) { alert('Ошибка'); return; }
    const n = input.value.trim();
    if (!n) { alert('Введите имя'); return; }
    
    try {
        const result = await auth.signInAnonymously();
        const user = result.user;
        const userName = n.slice(0, 24);
        const uid = user.uid;
        
        await db.ref('sites/' + SITE + '/users/' + uid).update({
            name: userName,
            email: 'anon@anon.com',
            uid: uid,
            lastLogin: Date.now()
        });
        
        await db.ref('sites/' + SITE + '/all_users/' + uid).set({
            name: userName,
            email: 'anon@anon.com',
            uid: uid,
            lastLogin: Date.now()
        });
        
        currentUser = userName;
        currentUserUid = uid;
        USER = userName;
        USER_UID = uid;
        authInitialized = true;
        
        localStorage.setItem('dc_u_' + SITE, userName);
        
        const loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.remove('open');
        
        if (typeof updateUI === 'function') updateUI();
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadGroups === 'function') loadGroups();
        if (typeof loadPeople === 'function') loadPeople();
        if (typeof loadProfile === 'function') loadProfile();
        if (typeof loadNotifications === 'function') loadNotifications();
        if (typeof loadFriendRequests === 'function') loadFriendRequests();
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        alert('Ошибка: ' + error.message);
    }
};

// ===== ЗАКРЫТЬ ВХОД =====
window.closeLogin = function() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.remove('open');
};

// ===== ВЫХОД =====
window.logout = function() {
    if (!confirm('Выйти из профиля?')) return;
    
    if (notifUnsub) {
        try { notifUnsub(); } catch(e) {}
        notifUnsub = null;
    }
    
    auth.signOut().then(function() {
        localStorage.removeItem('dc_u_' + SITE);
        localStorage.removeItem('dc_admin_' + SITE);
        localStorage.removeItem('dc_avatar_' + SITE);
        
        currentUser = null;
        currentUserUid = null;
        USER = null;
        USER_UID = null;
        isAdmin = false;
        authInitialized = false;
        
        const feed = document.getElementById('feed');
        if (feed) feed.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Войдите</div>';
        
        const dot = document.getElementById('adminDot');
        if (dot) dot.classList.remove('active');
        
        if (typeof closeSidebar === 'function') closeSidebar();
        
        const loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.add('open');
        
        if (typeof updateUI === 'function') updateUI();
        if (typeof loadSavedProfiles === 'function') loadSavedProfiles();
        
    }).catch(function(e) {
        alert('Ошибка: ' + e.message);
    });
};

// ===== GOOGLE-КНОПКА =====
function initGoogleButton() {
    const btn = document.getElementById('googleBtn');
    if (btn) {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🔵 Google-вход нажат');
            auth.signInWithPopup(provider)
                .then(async function(result) {
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

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
    
    if (!initGoogleButton()) {
        setTimeout(initGoogleButton, 1500);
        setTimeout(initGoogleButton, 3000);
    }
});
