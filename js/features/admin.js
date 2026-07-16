// ================================================================ */
// АДМИН-ПАНЕЛЬ — ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ
// ================================================================ */

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
        if (typeof loadPeople === 'function') loadPeople();
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
            if (typeof loadPeople === 'function') loadPeople();
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
    if (typeof loadGroups === 'function') loadGroups();
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

// ===== ОТКРЫТИЕ АДМИН-ЧАТОВ =====
window.openAdminChats = function() {
    if (!isAdmin) {
        alert('Только для администратора!');
        return;
    }
    document.getElementById('adminChatsModal').classList.add('open');
    loadAdminChats();
};

window.closeAdminChats = function() {
    document.getElementById('adminChatsModal').classList.remove('open');
};

function loadAdminChats() {
    var container = document.getElementById('adminChatsList');
    if (!container) return;

    container.innerHTML = '<div style="color:#bbb;text-align:center;padding:12px;font-size:0.75rem;">⏳ Загрузка...</div>';

    db.ref('dms/' + SITE).once('value', function(snap) {
        var dms = snap.val() || {};
        var chatIds = Object.keys(dms);

        if (!chatIds.length) {
            container.innerHTML = '<div style="color:#bbb;text-align:center;padding:12px;font-size:0.75rem;">Нет личных чатов</div>';
            return;
        }

        var html = '';
        var loaded = 0;

        chatIds.forEach(function(chatId) {
            var uids = chatId.split('_');

            var promises = uids.map(function(uid) {
                return db.ref('sites/' + SITE + '/users/' + uid + '/name').once('value');
            });

            Promise.all(promises).then(function(results) {
                var names = results.map(function(r) { return r.val() || 'Аноним'; });
                var chatName = names.join(' ⬄ ');
                var path = 'dms/' + SITE + '/' + chatId + '/messages';

                db.ref(path).once('value', function(msgSnap) {
                    var count = msgSnap.numChildren();
                    var lastMsg = '';
                    msgSnap.orderByChild('timestamp').limitToLast(1).forEach(function(m) {
                        lastMsg = m.val().text || '';
                    });

                    html += '<div class="chat-list-item" onclick="adminViewChat(\'' + chatId + '\')">';
                    html += '<div class="chat-list-info">';
                    html += '<div class="chat-list-name">💬 ' + esc(chatName) + '</div>';
                    html += '<div class="chat-list-last">' + (lastMsg ? esc(lastMsg.slice(0, 30)) : 'Сообщений: ' + count) + '</div>';
                    html += '</div>';
                    html += '</div>';

                    loaded++;
                    if (loaded === chatIds.length) {
                        container.innerHTML = html;
                    }
                });
            });
        });
    });
}

window.adminViewChat = function(chatId) {
    if (!isAdmin) return;
    var path = 'dms/' + SITE + '/' + chatId + '/messages';
    closeAdminChats();
    CURRENT_ROOM = chatId;
    document.getElementById('chatView').classList.add('active');
    setActivePage(null);
    loadChat(path);
};

window.updateAdminMenu = function() {
    var item = document.getElementById('adminChatsMenuItem');
    if (item) {
        item.style.display = isAdmin ? 'block' : 'none';
    }
};

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
