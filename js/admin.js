// ================================================================
// АДМИН-ПАНЕЛЬ
// ================================================================

// ===== ПРОВЕРКА АДМИНКИ ПРИ ЗАГРУЗКЕ =====
(function checkAdminOnLoad() {
    if (localStorage.getItem('dc_admin_' + SITE) === '1') {
        isAdmin = true;
        var dot = document.getElementById('adminDot');
        if (dot) dot.classList.add('active');
        console.log('✅ Админ-режим активен (из localStorage)');
        // Обновляем ленту, чтобы появились кнопки удаления
        setTimeout(function() {
            if (typeof loadFeed === 'function') loadFeed();
            if (typeof loadProfile === 'function') loadProfile();
        }, 500);
    }
})();

// ===== ВХОД В АДМИНКУ =====

window.adminLogin = function() {
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
        // Обновляем ленту и профиль
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadProfile === 'function') loadProfile();
    } else {
        alert('❌ Неверный пароль');
    }
};

// ===== ВЫХОД ИЗ АДМИНКИ =====

window.adminLogout = function() {
    if (!confirm('Выключить админ-режим?')) return;
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

// ===== УДАЛЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ =====

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

// ===== ОЧИСТКА КОМНАТ =====

function adminClearRooms() {
    if (!isAdmin) return;
    if (!confirm('Очистить все комнаты?')) return;
    db.ref('sites/' + SITE + '/rooms').remove();
    db.ref('sites/' + SITE + '/room_users').remove();
    loadGroups();
    alert('✅ Комнаты очищены');
}

// ===== ОЧИСТКА УВЕДОМЛЕНИЙ =====

function adminClearNotifications() {
    if (!isAdmin) return;
    if (!confirm('Очистить все уведомления?')) return;
    db.ref('sites/' + SITE + '/notifications').remove();
    alert('✅ Уведомления очищены');
}

// ===== ЭКСПОРТ ДАННЫХ =====

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

// ===== КНОПКА ВЫХОДА ИЗ АДМИНКИ В МЕНЮ =====

// Добавляем пункт в меню настроек, если его нет
(function addAdminLogoutToMenu() {
    setTimeout(function() {
        var dropdown = document.getElementById('settingsDropdown');
        if (dropdown) {
            // Проверяем, есть ли уже пункт выхода из админки
            var existing = dropdown.querySelector('.settings-item.admin-logout');
            if (!existing) {
                var divider = dropdown.querySelector('.settings-divider:last-child');
                var logoutItem = document.createElement('div');
                logoutItem.className = 'settings-item danger admin-logout';
                logoutItem.textContent = '🚫 Выключить админку';
                logoutItem.onclick = function() {
                    adminLogout();
                    closeSettingsMenu();
                };
                if (divider) {
                    divider.parentNode.insertBefore(logoutItem, divider.nextSibling);
                } else {
                    dropdown.appendChild(logoutItem);
                }
            }
        }
    }, 1000);
})();
