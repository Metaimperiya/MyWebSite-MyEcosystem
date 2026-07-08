// ================================================================
// АВТОРИЗАЦИЯ — ПОЛНАЯ ВЕРСИЯ
// ================================================================

// ===== GOOGLE-КНОПКА — С ПРОВЕРКОЙ API КЛЮЧА =====
function initGoogleButton() {
    var btn = document.getElementById('googleBtn');
    if (btn) {
        var newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🔵 Google-вход нажат');
            
            // Проверяем API ключ
            if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'AIzaSyB3vzLp7Hj5KRLOU3LWdh2zPajRWsFDMfI') {
                alert('❌ Ошибка: API ключ Firebase недействителен. Проверьте firebase.js');
                console.error('❌ Невалидный API ключ!');
                return;
            }
            
            auth.signInWithPopup(provider)
                .then(function(result) {
                    console.log('✅ Google-вход успешен:', result.user.displayName);
                    var loginModal = document.getElementById('loginModal');
                    if (loginModal) loginModal.classList.remove('open');
                    setTimeout(function() {
                        if (typeof updateUI === 'function') updateUI();
                        if (typeof loadFeed === 'function') loadFeed();
                        if (typeof loadProfile === 'function') loadProfile();
                    }, 300);
                })
                .catch(function(err) {
                    console.error('❌ Ошибка Google-входа:', err);
                    if (err.code === 'auth/popup-blocked') {
                        alert('Разрешите попапы для этого сайта');
                        auth.signInWithRedirect(provider);
                    } else if (err.code === 'auth/cancelled-popup-request') {
                        console.log('Попап был закрыт, пробуем снова');
                        setTimeout(function() {
                            auth.signInWithPopup(provider).catch(function(e) {
                                console.error('Повторная ошибка:', e);
                            });
                        }, 500);
                    } else if (err.code === 'auth/api-key-not-valid') {
                        alert('❌ Ошибка: API ключ Firebase недействителен. Пожалуйста, проверьте настройки Firebase.');
                        console.error('❌ Невалидный API ключ!');
                    } else {
                        alert('Ошибка входа: ' + err.message);
                    }
                });
        });
        console.log('✅ Google-кнопка подключена');
        return true;
    }
    return false;
}

// Пробуем подключить Google-кнопку несколько раз
document.addEventListener('DOMContentLoaded', function() {
    if (!initGoogleButton()) {
        setTimeout(initGoogleButton, 1000);
        setTimeout(initGoogleButton, 2000);
        setTimeout(initGoogleButton, 3000);
    }
});

// ===== ВХОД ПО ИМЕНИ =====
window.loginWithName = function() {
    var input = document.getElementById('nameInput');
    if (!input) { alert('Ошибка'); return; }
    var n = input.value.trim();
    if (!n) { alert('Введите имя'); return; }
    
    auth.signInAnonymously().then(function() {
        var tempName = n.slice(0, 24);
        var tempUid = 'anon_' + Date.now();
        
        return db.ref('sites/' + SITE + '/users/' + tempUid).update({
            name: tempName,
            email: 'anon@anon.com',
            uid: tempUid,
            lastLogin: Date.now()
        }).then(function() {
            return db.ref('sites/' + SITE + '/all_users/' + tempUid).set({
                name: tempName,
                email: 'anon@anon.com',
                uid: tempUid,
                lastLogin: Date.now()
            });
        }).then(function() {
            USER = tempName;
            USER_UID = tempUid;
            localStorage.setItem('dc_u_' + SITE, USER);
            
            var loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.remove('open');
            
            setTimeout(function() {
                if (typeof updateUI === 'function') updateUI();
                if (typeof loadFeed === 'function') loadFeed();
                if (typeof loadGroups === 'function') loadGroups();
                if (typeof loadPeople === 'function') loadPeople();
                if (typeof loadProfile === 'function') loadProfile();
                if (typeof loadNotifications === 'function') loadNotifications();
                if (typeof loadFriendRequests === 'function') loadFriendRequests();
            }, 300);
        });
    }).catch(function(e) { 
        alert('Ошибка входа: ' + e.message); 
    });
};

// ===== ЗАКРЫТЬ ВХОД =====
window.closeLogin = function() {
    var modal = document.getElementById('loginModal');
    if (modal) modal.classList.remove('open');
};

// ===== ВЫХОД =====
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
    }).catch(function(e) { 
        alert('Ошибка выхода: ' + e.message); 
    });
};

// ===== СОХРАНЕННЫЕ ПРОФИЛИ =====
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
        
        return db.ref('sites/' + SITE + '/users/' + uid).update({
            name: profile.name,
            email: profile.email || 'anon',
            uid: uid,
            lastLogin: Date.now()
        }).then(function() {
            return db.ref('sites/' + SITE + '/all_users/' + uid).set({
                name: profile.name,
                email: profile.email || 'anon',
                uid: uid,
                lastLogin: Date.now()
            });
        }).then(function() {
            profile.lastUsed = Date.now();
            localStorage.setItem('dc_profiles_' + SITE, JSON.stringify(SAVED_PROFILES));
            var loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.remove('open');
            
            setTimeout(function() {
                if (typeof updateUI === 'function') updateUI();
                if (typeof loadFeed === 'function') loadFeed();
                if (typeof loadGroups === 'function') loadGroups();
                if (typeof loadPeople === 'function') loadPeople();
                if (typeof loadProfile === 'function') loadProfile();
                if (typeof loadNotifications === 'function') loadNotifications();
                if (typeof loadFriendRequests === 'function') loadFriendRequests();
            }, 300);
        });
    }).catch(function(e) { 
        alert('Ошибка входа: ' + e.message); 
    });
}

// ===== AUTH STATE =====
auth.onAuthStateChanged(function(user) {
    if (user) {
        USER_UID = user.uid;
        
        db.ref('sites/' + SITE + '/users/' + USER_UID + '/name').once('value', function(snap) {
            var dbName = snap.val();
            
            if (dbName) {
                USER = dbName;
                localStorage.setItem('dc_u_' + SITE, USER);
            } else {
                USER = user.displayName || user.email || 'User';
                localStorage.setItem('dc_u_' + SITE, USER);
                
                db.ref('sites/' + SITE + '/users/' + USER_UID).update({
                    name: USER,
                    email: user.email || 'anon',
                    uid: USER_UID,
                    lastLogin: Date.now()
                });
                db.ref('sites/' + SITE + '/all_users/' + USER_UID).set({
                    name: USER,
                    email: user.email || 'anon',
                    uid: USER_UID,
                    lastLogin: Date.now()
                });
            }
            
            var avatarUrl = user.photoURL || null;
            if (!avatarCache) avatarCache = {};
            avatarCache[USER_UID] = avatarUrl;
            
            if (avatarUrl) {
                db.ref('sites/' + SITE + '/users/' + USER_UID + '/avatarUrl').set(avatarUrl);
                db.ref('sites/' + SITE + '/all_users/' + USER_UID + '/avatarUrl').set(avatarUrl);
            }
            
            var loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.remove('open');
            
            if (typeof updateUI === 'function') updateUI();
            if (typeof loadFeed === 'function') loadFeed();
            if (typeof loadGroups === 'function') loadGroups();
            if (typeof loadPeople === 'function') loadPeople();
            if (typeof loadProfile === 'function') loadProfile();
            if (typeof loadNotifications === 'function') loadNotifications();
            if (typeof loadFriendRequests === 'function') loadFriendRequests();
        });
    } else {
        USER = null;
        USER_UID = null;
        var loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.add('open');
        if (typeof updateUI === 'function') updateUI();
        if (typeof loadSavedProfiles === 'function') loadSavedProfiles();
    }
});
