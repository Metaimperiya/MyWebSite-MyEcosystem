// ================================================================
// АВТОРИЗАЦИЯ - ПОЛНОСТЬЮ ГОТОВЫЙ ФАЙЛ
// ================================================================

// ================================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ// ================================================================
// 100% РАБОЧЕЕ ОБНОВЛЕНИЕ ШАПКИ
// ================================================================

(function() {
    console.log('🔥 ЗАПУСКАЕМ 100% ОБНОВЛЕНИЕ ШАПКИ');
    
    function forceUpdateTopbar() {
        // Пытаемся получить имя отовсюду
        var name = null;
        
        // 1. Из localStorage
        try {
            name = localStorage.getItem('dc_u_default') || 
                   localStorage.getItem('dc_u_') || 
                   null;
        } catch(e) {}
        
        // 2. Из глобальной переменной
        if (!name && typeof USER !== 'undefined') {
            name = window.USER || null;
        }
        
        // 3. Из Firebase (если есть uid)
        var uid = localStorage.getItem('dc_uid_default') || 
                  localStorage.getItem('dc_uid_') || 
                  (typeof USER_UID !== 'undefined' ? window.USER_UID : null);
        
        if (!name && uid) {
            try {
                db.ref('sites/default/users/' + uid + '/name').once('value')
                    .then(function(snap) {
                        var val = snap.val();
                        if (val) {
                            localStorage.setItem('dc_u_default', val);
                            name = val;
                            window.USER = val;
                            applyUpdate(name);
                        }
                    });
            } catch(e) {}
        }
        
        function applyUpdate(username) {
            if (!username) {
                username = 'Гость';
            }
            
            console.log('👤 Устанавливаем имя:', username);
            
            // Обновляем шапку
            var topName = document.getElementById('topName');
            if (topName) {
                topName.textContent = username;
            }
            
            var topAvatarLetter = document.getElementById('topAvatarLetter');
            if (topAvatarLetter) {
                topAvatarLetter.textContent = username === 'Гость' ? '?' : username.charAt(0).toUpperCase();
            }
            
            // Обновляем сайдбар
            var sName = document.getElementById('sName');
            if (sName) {
                sName.textContent = username;
            }
            
            var sAvatar = document.getElementById('sAvatar');
            if (sAvatar) {
                var letterSpan = sAvatar.querySelector('.letter');
                if (letterSpan) {
                    letterSpan.textContent = username === 'Гость' ? '?' : username.charAt(0).toUpperCase();
                }
            }
            
            // Если есть функция updateUI - вызываем
            if (typeof updateUI === 'function') {
                try { updateUI(); } catch(e) {}
            }
            if (typeof updateUISafe === 'function') {
                try { updateUISafe(); } catch(e) {}
            }
        }
        
        // Применяем имя если есть
        if (name) {
            applyUpdate(name);
        } else {
            // Если нет имени - пробуем через 500мс
            setTimeout(function() {
                var name2 = localStorage.getItem('dc_u_default') || 
                           localStorage.getItem('dc_u_') || 
                           window.USER || 
                           null;
                if (name2) {
                    applyUpdate(name2);
                }
            }, 500);
        }
    }
    
    // Запускаем много раз
    setTimeout(forceUpdateTopbar, 100);
    setTimeout(forceUpdateTopbar, 300);
    setTimeout(forceUpdateTopbar, 500);
    setTimeout(forceUpdateTopbar, 1000);
    setTimeout(forceUpdateTopbar, 2000);
    
    // Каждые 2 секунды проверяем
    var attempts = 0;
    var interval = setInterval(function() {
        attempts++;
        var topName = document.getElementById('topName');
        var name = localStorage.getItem('dc_u_default') || 
                   localStorage.getItem('dc_u_') || 
                   window.USER || 
                   null;
        
        if (topName && name && topName.textContent === 'Гость') {
            console.log('🔄 Попытка #' + attempts + ' - меняем Гость на', name);
            forceUpdateTopbar();
        }
        
        if (topName && name && topName.textContent !== 'Гость') {
            console.log('✅ Шапка обновлена! Имя:', topName.textContent);
            // Не останавливаем, продолжаем проверять
        }
        
        if (attempts > 30) {
            console.log('⚠️ Останавливаем проверку');
            clearInterval(interval);
        }
    }, 1000);
    
    // MutationObserver
    try {
        var observer = new MutationObserver(function() {
            var topName = document.getElementById('topName');
            if (topName) {
                var name = localStorage.getItem('dc_u_default') || 
                           localStorage.getItem('dc_u_') || 
                           window.USER || 
                           null;
                if (name && topName.textContent === 'Гость') {
                    forceUpdateTopbar();
                }
            }
        });
        
        setTimeout(function() {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            console.log('✅ MutationObserver запущен');
        }, 500);
    } catch(e) {
        console.warn('MutationObserver ошибка:', e);
    }
    
    console.log('✅ 100% обновление шапки запущено!');
})();

// Добавляем глобальную функцию для ручного вызова
window.forceUpdateTopbar = function() {
    var name = localStorage.getItem('dc_u_default') || 
               localStorage.getItem('dc_u_') || 
               window.USER || 
               'Гость';
    
    var topName = document.getElementById('topName');
    if (topName) {
        topName.textContent = name;
        console.log('👤 Ручное обновление:', name);
    }
    
    var topAvatarLetter = document.getElementById('topAvatarLetter');
    if (topAvatarLetter) {
        topAvatarLetter.textContent = name === 'Гость' ? '?' : name.charAt(0).toUpperCase();
    }
};
// ================================================================
var SAVED_PROFILES = [];
var notifUnsub = null;

// ================================================================
// GOOGLE-ВХОД
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
                    updateTopbarAfterLogin(result.user.displayName, result.user.uid, false);
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

// ================================================================
// ОБНОВЛЕНИЕ ШАПКИ (ГЛАВНАЯ ФУНКЦИЯ)
// ================================================================
function updateTopbarAfterLogin(username, uid, isAdminFlag) {
    console.log('🔄 ОБНОВЛЯЕМ ШАПКУ:', username);
    
    // Обновляем глобальные переменные
    window.USER = username;
    window.USER_UID = uid;
    window.isAdmin = isAdminFlag || false;
    
    // Сохраняем в localStorage
    try {
        localStorage.setItem('dc_u_' + SITE, username);
        localStorage.setItem('dc_uid_' + SITE, uid);
        if (isAdminFlag) {
            localStorage.setItem('dc_admin_' + SITE, 'true');
        } else {
            localStorage.removeItem('dc_admin_' + SITE);
        }
    } catch(e) {}
    
    // Пытаемся обновить UI всеми способами
    setTimeout(function() {
        // Способ 1: через updateUI
        if (typeof updateUI === 'function') {
            updateUI();
        }
        
        // Способ 2: через updateUISafe
        if (typeof updateUISafe === 'function') {
            updateUISafe();
        }
        
        // Способ 3: ручное обновление
        updateTopbarManually(username, uid, isAdminFlag);
    }, 50);
    
    // Дополнительные попытки через 200мс и 500мс
    setTimeout(function() {
        updateTopbarManually(username, uid, isAdminFlag);
    }, 200);
    
    setTimeout(function() {
        updateTopbarManually(username, uid, isAdminFlag);
    }, 500);
}

// ================================================================
// РУЧНОЕ ОБНОВЛЕНИЕ ШАПКИ
// ================================================================
function updateTopbarManually(username, uid, isAdminFlag) {
    var topName = document.getElementById('topName');
    var topAvatar = document.getElementById('topAvatar');
    var sName = document.getElementById('sName');
    var sAvatar = document.getElementById('sAvatar');
    var adminDot = document.getElementById('adminDot');
    
    console.log('🔍 Ручное обновление, найдены элементы:', {
        topName: !!topName,
        topAvatar: !!topAvatar,
        sName: !!sName,
        sAvatar: !!sAvatar
    });
    
    // Обновляем имя в шапке
    if (topName) {
        topName.textContent = username || 'Гость';
        console.log('✅ Имя в шапке установлено:', topName.textContent);
    }
    
    // Обновляем имя в сайдбаре
    if (sName) {
        sName.textContent = username || 'Гость';
        console.log('✅ Имя в сайдбаре установлено:', sName.textContent);
    }
    
    // Обновляем аватар в шапке
    if (topAvatar) {
        if (typeof renderAvatar === 'function') {
            renderAvatar(uid, topAvatar, (username || '?').charAt(0).toUpperCase());
        } else {
            topAvatar.innerHTML = '<span class="letter">' + (username || '?').charAt(0).toUpperCase() + '</span>';
        }
    }
    
    // Обновляем аватар в сайдбаре
    if (sAvatar) {
        if (typeof renderAvatar === 'function') {
            renderAvatar(uid, sAvatar, (username || '?').charAt(0).toUpperCase());
        } else {
            sAvatar.innerHTML = '<span class="letter">' + (username || '?').charAt(0).toUpperCase() + '</span>';
        }
    }
    
    // Обновляем админ-точку
    if (adminDot) {
        if (isAdminFlag) {
            adminDot.classList.add('active');
            adminDot.style.display = 'inline-block';
        } else {
            adminDot.classList.remove('active');
            adminDot.style.display = 'none';
        }
    }
}

// ================================================================
// ВХОД ПО ИМЕНИ
// ================================================================
window.loginWithName = function() {
    var input = document.getElementById('nameInput');
    if (!input) { alert('Ошибка: поле ввода не найдено'); return; }
    var n = input.value.trim();
    if (!n) { alert('Введите имя'); return; }
    
    auth.signInAnonymously()
        .then(function() {
            var username = n.slice(0, 24);
            var uid = 'anon_' + Date.now();
            
            // Сохраняем данные
            window.USER = username;
            window.USER_UID = uid;
            window.isAdmin = false;
            
            // Сохраняем в Firebase
            return db.ref('sites/' + SITE + '/users/' + uid).update({
                name: username,
                email: 'anon@anon.com',
                uid: uid,
                lastLogin: Date.now()
            }).then(function() {
                return db.ref('sites/' + SITE + '/all_users/' + uid).set({
                    name: username,
                    email: 'anon@anon.com',
                    uid: uid,
                    lastLogin: Date.now()
                });
            }).then(function() {
                // Закрываем модалку
                var modal = document.getElementById('loginModal');
                if (modal) modal.classList.remove('open');
                
                // ОБНОВЛЯЕМ ШАПКУ
                updateTopbarAfterLogin(username, uid, false);
                
                // Загружаем данные
                if (typeof loadFeed === 'function') loadFeed();
                if (typeof loadGroups === 'function') loadGroups();
                if (typeof loadPeople === 'function') loadPeople();
                if (typeof loadProfile === 'function') loadProfile();
                if (typeof loadNotifications === 'function') loadNotifications();
                if (typeof loadFriendRequests === 'function') loadFriendRequests();
            });
        })
        .catch(function(e) {
            alert('Ошибка: ' + e.message);
        });
};

// ================================================================
// ЗАКРЫТЬ ВХОД
// ================================================================
window.closeLogin = function() {
    var modal = document.getElementById('loginModal');
    if (modal) modal.classList.remove('open');
};

// ================================================================
// ВЫХОД
// ================================================================
window.logout = function() {
    if (!confirm('Выйти из профиля?')) return;
    
    if (notifUnsub) {
        try { notifUnsub(); } catch(e) {}
        notifUnsub = null;
    }
    
    auth.signOut()
        .then(function() {
            // Очищаем данные
            localStorage.removeItem('dc_u_' + SITE);
            localStorage.removeItem('dc_uid_' + SITE);
            localStorage.removeItem('dc_admin_' + SITE);
            
            window.USER = null;
            window.USER_UID = null;
            window.isAdmin = false;
            
            // Обновляем UI
            var feed = document.getElementById('feed');
            if (feed) feed.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Войдите</div>';
            
            var dot = document.getElementById('adminDot');
            if (dot) dot.classList.remove('active');
            
            if (typeof closeSidebar === 'function') closeSidebar();
            
            var loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.add('open');
            
            // Обновляем шапку
            updateTopbarAfterLogin(null, null, false);
            
            if (typeof loadSavedProfiles === 'function') loadSavedProfiles();
        })
        .catch(function(e) {
            alert('Ошибка: ' + e.message);
        });
};

// ================================================================
// СОХРАНЕННЫЕ ПРОФИЛИ
// ================================================================
function loadSavedProfiles() {
    try {
        SAVED_PROFILES = JSON.parse(localStorage.getItem('dc_profiles_' + SITE) || '[]');
    } catch(e) {
        SAVED_PROFILES = [];
    }
}

function saveProfileToList(uid, name, email, avatarUrl) {
    var existing = SAVED_PROFILES.find(function(p) { return p.uid === uid; });
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

function loginWithSavedProfile(uid) {
    var profile = SAVED_PROFILES.find(function(p) { return p.uid === uid; });
    if (!profile) return;
    
    auth.signInAnonymously()
        .then(function() {
            window.USER = profile.name;
            window.USER_UID = uid;
            window.isAdmin = false;
            
            localStorage.setItem('dc_u_' + SITE, profile.name);
            localStorage.setItem('dc_uid_' + SITE, uid);
            
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
                
                var modal = document.getElementById('loginModal');
                if (modal) modal.classList.remove('open');
                
                updateTopbarAfterLogin(profile.name, uid, false);
                
                if (typeof loadFeed === 'function') loadFeed();
                if (typeof loadGroups === 'function') loadGroups();
                if (typeof loadPeople === 'function') loadPeople();
                if (typeof loadProfile === 'function') loadProfile();
                if (typeof loadNotifications === 'function') loadNotifications();
                if (typeof loadFriendRequests === 'function') loadFriendRequests();
            });
        })
        .catch(function(e) {
            alert('Ошибка: ' + e.message);
        });
}

// ================================================================
// AUTH STATE
// ================================================================
auth.onAuthStateChanged(function(user) {
    console.log('🔄 Auth state changed:', user ? user.uid : 'null');
    
    if (user) {
        // Пользователь залогинен через Firebase
        var username = user.displayName || user.email || 'User';
        var uid = user.uid;
        var avatarUrl = user.photoURL || null;
        
        window.USER = username;
        window.USER_UID = uid;
        
        if (!avatarCache) avatarCache = {};
        avatarCache[uid] = avatarUrl;
        
        // Сохраняем в Firebase
        db.ref('sites/' + SITE + '/users/' + uid).update({
            name: username,
            email: user.email || 'anon',
            uid: uid,
            lastLogin: Date.now(),
            avatarUrl: avatarUrl
        });
        
        db.ref('sites/' + SITE + '/all_users/' + uid).set({
            name: username,
            email: user.email || 'anon',
            uid: uid,
            lastLogin: Date.now(),
            avatarUrl: avatarUrl
        });
        
        // Закрываем модалку
        var loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.remove('open');
        
        // Обновляем шапку
        updateTopbarAfterLogin(username, uid, false);
        
        // Загружаем данные
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadGroups === 'function') loadGroups();
        if (typeof loadPeople === 'function') loadPeople();
        if (typeof loadProfile === 'function') loadProfile();
        if (typeof loadNotifications === 'function') loadNotifications();
        if (typeof loadFriendRequests === 'function') loadFriendRequests();
        
    } else {
        // Пользователь не залогинен - проверяем localStorage
        var savedUid = localStorage.getItem('dc_uid_' + SITE);
        var savedName = localStorage.getItem('dc_u_' + SITE);
        
        if (savedUid && savedName) {
            console.log('🔄 Восстанавливаем пользователя из localStorage:', savedName);
            window.USER = savedName;
            window.USER_UID = savedUid;
            
            // Проверяем, существует ли пользователь в Firebase
            db.ref('sites/' + SITE + '/users/' + savedUid).once('value')
                .then(function(snap) {
                    if (snap.exists()) {
                        var data = snap.val();
                        window.USER = data.name || savedName;
                        updateTopbarAfterLogin(window.USER, savedUid, false);
                    } else {
                        // Пользователь не найден в Firebase - чистим localStorage
                        localStorage.removeItem('dc_u_' + SITE);
                        localStorage.removeItem('dc_uid_' + SITE);
                        window.USER = null;
                        window.USER_UID = null;
                        updateTopbarAfterLogin(null, null, false);
                        
                        var loginModal = document.getElementById('loginModal');
                        if (loginModal) loginModal.classList.add('open');
                    }
                })
                .catch(function() {
                    // Ошибка - показываем вход
                    var loginModal = document.getElementById('loginModal');
                    if (loginModal) loginModal.classList.add('open');
                });
        } else {
            // Нет сохраненных данных
            window.USER = null;
            window.USER_UID = null;
            window.isAdmin = false;
            
            updateTopbarAfterLogin(null, null, false);
            
            var loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.add('open');
            
            if (typeof loadSavedProfiles === 'function') loadSavedProfiles();
        }
    }
});

// ================================================================
// ИНИЦИАЛИЗАЦИЯ
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 auth.js инициализирован');
    
    // Пытаемся подключить Google-кнопку
    if (!initGoogleButton()) {
        setTimeout(initGoogleButton, 1500);
        setTimeout(initGoogleButton, 3000);
    }
    
    // Восстанавливаем пользователя из localStorage
    var savedUid = localStorage.getItem('dc_uid_' + SITE);
    var savedName = localStorage.getItem('dc_u_' + SITE);
    
    if (savedUid && savedName) {
        console.log('🔄 Восстанавливаем пользователя при загрузке:', savedName);
        setTimeout(function() {
            updateTopbarAfterLogin(savedName, savedUid, false);
        }, 300);
    }
});

console.log('✅ auth.js полностью загружен');

// ================================================================
// ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ШАПКИ - 100%
// ================================================================

(function() {
    console.log('🔥 ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ШАПКИ ЗАПУЩЕНО');
    
    function forceUpdate() {
        var name = localStorage.getItem('dc_u_default') || 
                   localStorage.getItem('dc_u_') || 
                   window.USER || 
                   null;
        
        var uid = localStorage.getItem('dc_uid_default') || 
                  localStorage.getItem('dc_uid_') || 
                  window.USER_UID || 
                  null;
        
        // Обновляем глобальные переменные
        if (name) {
            window.USER = name;
            window.USER_UID = uid;
        }
        
        // Обновляем элементы
        var topName = document.getElementById('topName');
        var topAvatarLetter = document.getElementById('topAvatarLetter');
        var sName = document.getElementById('sName');
        var sAvatar = document.getElementById('sAvatar');
        var adminDot = document.getElementById('adminDot');
        
        if (topName) {
            topName.textContent = name || 'Гость';
            console.log('👤 topName:', topName.textContent);
        }
        
        if (topAvatarLetter && name) {
            topAvatarLetter.textContent = name.charAt(0).toUpperCase();
        }
        
        if (sName) {
            sName.textContent = name || 'Гость';
        }
        
        if (adminDot) {
            var isAdmin = localStorage.getItem('dc_admin_default') === 'true' || 
                         localStorage.getItem('dc_admin_') === 'true' ||
                         window.isAdmin === true;
            
            if (isAdmin) {
                adminDot.classList.add('active');
                adminDot.style.display = 'inline-block';
            } else {
                adminDot.classList.remove('active');
                adminDot.style.display = 'none';
            }
        }
    }
    
    // Запускаем каждую секунду пока не появится имя
    var attempts = 0;
    var interval = setInterval(function() {
        attempts++;
        var topName = document.getElementById('topName');
        var name = localStorage.getItem('dc_u_default') || 
                   localStorage.getItem('dc_u_') || 
                   window.USER || 
                   null;
        
        if (topName && name && topName.textContent === 'Гость') {
            console.log('🔄 Попытка #' + attempts + ' - меняем Гость на', name);
            forceUpdate();
        }
        
        if (topName && name && topName.textContent !== 'Гость') {
            console.log('✅ Шапка обновлена! Имя:', topName.textContent);
            clearInterval(interval);
        }
        
        if (attempts > 20) {
            console.log('⚠️ Останавливаем попытки');
            clearInterval(interval);
        }
    }, 500);
    
    // Мутация обсервер
    var observer = new MutationObserver(function() {
        forceUpdate();
    });
    
    setTimeout(function() {
        try {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } catch(e) {}
    }, 300);
    
    console.log('✅ Принудительное обновление запущено!');
})();
