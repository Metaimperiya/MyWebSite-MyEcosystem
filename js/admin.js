// ================================================================
// АДМИН-ПАНЕЛЬ — АВТОВХОД ПО UID
// ================================================================

// ===== ТВОЙ UID (ЗАМЕНИ НА СВОЙ!) =====
const MY_UID = "ayXehcol9FgAQU6tZuup7aSaRoV2"; // <- СЮДА ВСТАВЬ СВОЙ UID

// ===== АВТОВХОД В АДМИНКУ =====
(function autoAdmin() {
    if (USER_UID && USER_UID === MY_UID) {
        isAdmin = true;
        localStorage.setItem('dc_admin_' + SITE, '1');
        var dot = document.getElementById('adminDot');
        if (dot) dot.classList.add('active');
        console.log('✅ Админ-режим активен (автовход по UID)');
        setTimeout(function() {
            if (typeof loadFeed === 'function') loadFeed();
            if (typeof loadProfile === 'function') loadProfile();
        }, 500);
    }
})();

// ===== КНОПКА АДМИНКИ =====

window.adminLogin = function() {
    if (isAdmin) {
        adminLogout();
        return;
    }
    document.getElementById('adminModal').classList.add('open');
    document.getElementById('adminPass').value = '';
};

window.closeAdminModal = function() {
    document.getElementById('adminModal').classList.remove('open');
};

window.checkAdmin = function() {
    if (document.getElementById('adminPass').value.trim() === '12345') {
        isAdmin = true;
        localStorage.setItem('dc_admin_' + SITE, '1');
        document.getElementById('adminDot').classList.add('active');
        closeAdminModal();
        alert('🏴‍☠️ Админ-режим включён!');
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadProfile === 'function') loadProfile();
    } else {
        alert('❌ Неверный пароль');
    }
};

// ===== ВЫХОД ИЗ АДМИНКИ =====

window.adminLogout = function() {
    isAdmin = false;
    localStorage.removeItem('dc_admin_' + SITE);
    document.getElementById('adminDot').classList.remove('active');
    alert('🏴‍☠️ Админ-режим выключен');
    if (typeof loadFeed === 'function') loadFeed();
    if (typeof loadProfile === 'function') loadProfile();
};

// ===== УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ =====

function adminDeleteUser(uid) {
    if (!isAdmin || !uid || uid === USER_UID) return;
    if (!confirm('Удалить пользователя? Это необратимо!')) return;
    
    var updates = {};
    ['users', 'all_users', 'friends', 'subscribers', 'notifications'].forEach(function(p) {
        updates['sites/' + SITE + '/' + p + '/' + uid] = null;
    });
    
    db.ref().update(updates).then(function() {
        loadPeople();
        alert('✅ Пользователь удален');
    }).catch(function(err) {
        console.error(err);
        alert('Ошибка удаления');
    });
}

function adminDeleteAllUsers() {
    if (!isAdmin) return;
    if (!confirm('Удалить ВСЕХ пользователей, кроме админов? Это НЕОБРАТИМО!')) return;
    
    db.ref('sites/' + SITE + '/all_users').once('value', function(snap) {
        var users = snap.val() || {};
        var updates = {};
        
        Object.keys(users).forEach(function(uid) {
            if (!ADMIN_UIDS.includes(uid) && uid !== USER_UID) {
                ['users', 'all_users', 'friends', 'subscribers', 'notifications'].forEach(function(p) {
                    updates['sites/' + SITE + '/' + p + '/' + uid] = null;
                });
            }
        });
        
        updates['sites/' + SITE + '/room_users'] = null;
        
        db.ref().update(updates).then(function() {
            loadPeople();
            alert('✅ Все пользователи удалены');
        }).catch(function(err) {
            console.error(err);
            alert('Ошибка удаления');
        });
    });
}

function adminClearRooms() {
    if (!isAdmin) return;
    if (!confirm('Очистить все комнаты?')) return;
    db.ref('sites/' + SITE + '/rooms').remove();
    db.ref('sites/' + SITE + '/room_users').remove();
    loadGroups();
    alert('✅ Комнаты очищены');
}

function adminClearNotifications() {
    if (!isAdmin) return;
    if (!confirm('Очистить все уведомления?')) return;
    db.ref('sites/' + SITE + '/notifications').remove();
    alert('✅ Уведомления очищены');
}

function adminExportData() {
    if (!isAdmin) return;
    db.ref('sites/' + SITE).once('value', function(snap) {
        var data = snap.val();
        var json = JSON.stringify(data, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'metaimperiya_export_' + Date.now() + '.json';
        a.click();
        URL.revokeObjectURL(url);
    });
}

// ===== ПРИНУДИТЕЛЬНАЯ ПРОВЕРКА АДМИНКИ =====
setTimeout(function() {
    if (localStorage.getItem('dc_admin_' + SITE) === '1') {
        isAdmin = true;
        var dot = document.getElementById('adminDot');
        if (dot) dot.classList.add('active');
        console.log('✅ Админ-режим подтверждён (повторная проверка)');
        if (typeof loadFeed === 'function') loadFeed();
    }
}, 1000);

// ===== СОЗДАТЬ СТРАНИЦУ АДМИНИСТРАТОРА =====
window.createAdminPage = function() {
    if (!isAdmin) {
        alert('❌ Только для администратора!');
        return;
    }

    if (!USER_UID) {
        alert('❌ Вы не авторизованы');
        return;
    }

    var pageData = {
        slug: 'player-likee',
        type: 'profile',
        role: 'admin',
        name: 'PLAYER Likee',
        description: 'Администратор METAIMPERIYA',
        ownerUid: USER_UID,
        createdAt: Date.now(),
        isActive: true
    };

    db.ref('sites/' + SITE + '/pages/profiles/' + USER_UID).set(pageData)
        .then(function() {
            alert('✅ Страница PLAYER Likee создана!');
            console.log('✅ Страница создана:', pageData);
        })
        .catch(function(err) {
            console.error('❌ Ошибка:', err);
            alert('❌ Ошибка: ' + err.message);
        });
};
