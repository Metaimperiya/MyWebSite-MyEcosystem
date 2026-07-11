// ================================================================
// АВТОРИЗАЦИЯ — GOOGLE POPUP
// ================================================================

document.addEventListener('DOMContentLoaded', function() {

    function initGoogleButton() {
        var btn = document.getElementById('googleBtn');
        if (btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('🔵 Google-вход нажат (POPUP)');
                
                auth.signInWithPopup(provider)
                    .then(function(result) {
                        console.log('✅ Вход через попап успешен!');
                    })
                    .catch(function(error) {
                        console.error('❌ Ошибка попап:', error);
                        if (error.code === 'auth/popup-blocked') {
                            alert('⚠️ Браузер заблокировал попап. Разрешите всплывающие окна.');
                        } else if (error.code === 'auth/unauthorized-domain') {
                            alert('⚠️ Добавьте домен в Firebase Console → Authentication → Authorized domains');
                        } else {
                            alert('❌ ' + error.message);
                        }
                    });
            });
            console.log('✅ Google-кнопка подключена (POPUP)');
            return true;
        }
        return false;
    }

    if (!initGoogleButton()) {
        setTimeout(initGoogleButton, 1500);
        setTimeout(initGoogleButton, 3000);
    }

    // ===== ЗАКРЫТИЕ МОДАЛКИ =====
    window.closeLogin = function() {
        var modal = document.getElementById('loginModal');
        if (modal) modal.classList.remove('open');
    };

    // ===== ОТКРЫТИЕ МОДАЛКИ =====
    window.openLoginModal = function() {
        var modal = document.getElementById('loginModal');
        if (modal) modal.classList.add('open');
    };

    // ===== ВЫХОД =====
    window.logout = function() {
        if (!confirm('Выйти из профиля?')) return;
        if (notifUnsub) { try { notifUnsub(); } catch(e) {} notifUnsub = null; }
        auth.signOut()
            .then(function() {
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
                if (typeof updateUI === 'function') updateUI();
            })
            .catch(function(e) { alert('Ошибка: ' + e.message); });
    };

    // ===== СОСТОЯНИЕ АВТОРИЗАЦИИ =====
    auth.onAuthStateChanged(function(user) {
        if (user) {
            USER_UID = user.uid;
            USER = user.displayName || user.email || 'User';
            localStorage.setItem('dc_u_' + SITE, USER);
            var avatarUrl = user.photoURL || null;
            if (!avatarCache) avatarCache = {};
            avatarCache[USER_UID] = avatarUrl;
            
            var slug = USER.toLowerCase().replace(/[^a-z0-9]/g, '-');
            if (slug.length > 30) slug = slug.slice(0, 30);
            
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
            
            isAdmin = ADMIN_UIDS.includes(USER_UID);
            if (isAdmin) {
                localStorage.setItem('dc_admin_' + SITE, 'true');
                var dot = document.getElementById('adminDot');
                if (dot) dot.classList.add('active');
                console.log('✅ Админ-режим активен');
            }
            
            var loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.remove('open');
            var mainContainer = document.getElementById('mainContainer');
            if (mainContainer) mainContainer.style.display = 'block';
            
            if (typeof updateUI === 'function') updateUI();
            if (typeof loadFeed === 'function') loadFeed();
            if (typeof loadGroups === 'function') loadGroups();
            if (typeof loadPeople === 'function') loadPeople();
            if (typeof loadProfile === 'function') loadProfile();
            if (typeof loadNotifications === 'function') loadNotifications();
            if (typeof loadFriendRequests === 'function') loadFriendRequests();
            
            console.log('✅ Пользователь авторизован:', USER);
        } else {
            USER = null;
            USER_UID = null;
            isAdmin = false;
            var loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.add('open');
            var mainContainer = document.getElementById('mainContainer');
            if (mainContainer) mainContainer.style.display = 'none';
            if (typeof updateUI === 'function') updateUI();
            console.log('⛔ Гость, иди нахуй!');
        }
    });

    console.log('✅ Google Auth настроен (POPUP)');
});
