// ================================================================ */
// АДМИН-ПАНЕЛЬ — ПОЛНАЯ ВЕРСИЯ С ТОЧКОЙ
// ================================================================ */

// ===== КНОПКА АДМИНКИ (ТОЧКА) =====
window.adminLogin = function() {
    if (!USER_UID || !ADMIN_UIDS.includes(USER_UID)) {
        alert('Этот аккаунт не имеет прав администратора.');
        return;
    }
    isAdmin = true;
    localStorage.setItem('dc_admin_' + SITE, '1');
    updateAdminMenu();
    openAdminReports();
};

// ===== ВЫХОД ИЗ АДМИНКИ =====
function adminLogout() {
    isAdmin = false;
    localStorage.removeItem('dc_admin_' + SITE);
    var dot = document.getElementById('adminDot');
    if (dot) dot.classList.remove('active');
    alert('🏴‍☠️ Админ-режим выключен');
    if (typeof loadFeed === 'function') loadFeed();
    if (typeof loadProfile === 'function') loadProfile();
    if (typeof loadPeople === 'function') loadPeople();
    updateAdminMenu();
}

// ===== ОБНОВЛЕНИЕ МЕНЮ АДМИНА =====
function updateAdminMenu() {
    var items = document.querySelectorAll('.admin-only');
    items.forEach(function(el) {
        el.style.display = isAdmin ? 'block' : 'none';
    });
}

// ===== УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ =====
window.adminDeleteUser = function(uid) {
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
};

// ===== УДАЛЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ =====
window.adminDeleteAllUsers = function() {
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
};

// ===== ОЧИСТКА КОМНАТ =====
window.adminClearRooms = function() {
    if (!isAdmin) return;
    if (!confirm('Очистить все комнаты?')) return;
    db.ref('sites/' + SITE + '/rooms').remove();
    db.ref('sites/' + SITE + '/room_users').remove();
    if (typeof loadGroups === 'function') loadGroups();
    alert('✅ Комнаты очищены');
};

// ===== ОЧИСТКА УВЕДОМЛЕНИЙ =====
window.adminClearNotifications = function() {
    if (!isAdmin) return;
    if (!confirm('Очистить все уведомления?')) return;
    db.ref('sites/' + SITE + '/notifications').remove();
    alert('✅ Уведомления очищены');
};

// ===== ЭКСПОРТ ДАННЫХ =====
window.adminExportData = function() {
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
};

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

var reportReasonLabels = {
    spam: 'Спам', fraud: 'Мошенничество', harassment: 'Оскорбления или травля',
    unsafe: 'Опасный контент', other: 'Другое'
};

function isAdminAccount() {
    return !!USER_UID && ADMIN_UIDS.includes(USER_UID);
}

function reportStatusLabel(status) {
    return { new: 'Новая', reviewing: 'На рассмотрении', resolved: 'Решена', blocked: 'Пользователь заблокирован' }[status] || status;
}

function getReportUserName(uid) {
    return db.ref('sites/' + SITE + '/users/' + uid + '/name').once('value').then(function(snap) {
        return snap.val() || 'Пользователь';
    });
}

window.openAdminReports = function() {
    if (!isAdminAccount()) {
        alert('Только для администратора.');
        return;
    }
    isAdmin = true;
    document.getElementById('adminReportsModal').classList.add('open');
    loadAdminReports();
};

window.closeAdminReports = function() {
    document.getElementById('adminReportsModal').classList.remove('open');
};

function loadAdminReports() {
    var container = document.getElementById('adminReportsList');
    if (!container) return;
    container.innerHTML = '<div style="color:#bbb;text-align:center;padding:12px;font-size:0.75rem;">⏳ Загрузка...</div>';
    db.ref('sites/' + SITE + '/chat_reports').orderByChild('createdAt').once('value').then(function(snap) {
        var reports = [];
        snap.forEach(function(item) { reports.push({ id: item.key, data: item.val() || {} }); });
        reports.reverse();
        if (!reports.length) {
            container.innerHTML = '<div style="color:#bbb;text-align:center;padding:12px;font-size:0.75rem;">Жалоб пока нет</div>';
            return;
        }
        return Promise.all(reports.map(function(report) {
            return Promise.all([getReportUserName(report.data.reporterUid), getReportUserName(report.data.reportedUid)]).then(function(names) {
                return '<div class="admin-report-card">' +
                    '<strong style="font-size:0.82rem;">' + esc(names[0]) + ' → ' + esc(names[1]) + '</strong>' +
                    '<div class="admin-report-meta">' + esc(reportReasonLabels[report.data.reason] || report.data.reason || 'Не указана') + ' · ' +
                    esc(reportStatusLabel(report.data.status || 'new')) + ' · ' + new Date(report.data.createdAt || Date.now()).toLocaleString() + '</div>' +
                    (report.data.details ? '<div class="admin-report-text">' + esc(report.data.details) + '</div>' : '') +
                    '<div class="admin-report-actions">' +
                    '<button class="admin-report-view" onclick="adminReviewReport(\'' + report.id + '\')">Открыть переписку</button>' +
                    '<button class="admin-report-resolve" onclick="adminResolveReport(\'' + report.id + '\')">Закрыть жалобу</button>' +
                    '<button class="admin-report-block" onclick="adminBlockReportedUser(\'' + report.id + '\')">Заблокировать</button>' +
                    '<button class="admin-report-resolve" onclick="adminUnblockReportedUser(\'' + report.id + '\')">Снять блокировку</button>' +
                    '</div></div>';
            });
        })).then(function(cards) { container.innerHTML = cards.join(''); });
    }).catch(function(error) {
        console.error('Не удалось загрузить жалобы:', error);
        container.innerHTML = '<div style="color:var(--danger);padding:12px;">Не удалось загрузить жалобы.</div>';
    });
}

window.adminReviewReport = function(reportId) {
    if (!isAdminAccount()) return;
    db.ref('sites/' + SITE + '/chat_reports/' + reportId).once('value').then(function(snap) {
        var report = snap.val();
        if (!report || !report.chatId) return alert('Жалоба не найдена.');
        db.ref('sites/' + SITE + '/chat_reports/' + reportId).update({ status: 'reviewing', updatedAt: Date.now(), reviewedBy: USER_UID });
        closeAdminReports();
        CURRENT_ROOM = report.chatId;
        document.getElementById('chatView').classList.add('active');
        setActivePage(null);
        loadChat('dms/' + SITE + '/' + report.chatId + '/messages');
    });
};

window.adminResolveReport = function(reportId) {
    if (!isAdminAccount()) return;
    db.ref('sites/' + SITE + '/chat_reports/' + reportId).update({ status: 'resolved', updatedAt: Date.now(), reviewedBy: USER_UID }).then(loadAdminReports);
};

window.adminBlockReportedUser = function(reportId) {
    if (!isAdminAccount()) return;
    db.ref('sites/' + SITE + '/chat_reports/' + reportId).once('value').then(function(snap) {
        var report = snap.val();
        if (!report || !report.reportedUid) return alert('Жалоба не найдена.');
        if (!confirm('Заблокировать этого пользователя на всей платформе? Он не сможет писать личные сообщения.')) return;
        var updates = {};
        updates['sites/' + SITE + '/moderation_blocks/' + report.reportedUid] = {
            blockedAt: Date.now(), blockedBy: USER_UID, reportId: reportId, reason: report.reason || 'other'
        };
        updates['sites/' + SITE + '/chat_reports/' + reportId + '/status'] = 'blocked';
        updates['sites/' + SITE + '/chat_reports/' + reportId + '/updatedAt'] = Date.now();
        updates['sites/' + SITE + '/chat_reports/' + reportId + '/reviewedBy'] = USER_UID;
        return db.ref().update(updates).then(function() { alert('Пользователь заблокирован.'); loadAdminReports(); });
    }).catch(function(error) {
        console.error('Не удалось заблокировать пользователя:', error);
        alert('Не удалось заблокировать пользователя.');
    });
};

window.adminUnblockReportedUser = function(reportId) {
    if (!isAdminAccount()) return;
    db.ref('sites/' + SITE + '/chat_reports/' + reportId).once('value').then(function(snap) {
        var report = snap.val();
        if (!report || !report.reportedUid) return alert('Жалоба не найдена.');
        if (!confirm('Снять административную блокировку с этого пользователя?')) return;
        return db.ref('sites/' + SITE + '/moderation_blocks/' + report.reportedUid).remove().then(function() {
            alert('Блокировка снята.');
            loadAdminReports();
        });
    }).catch(function(error) {
        console.error('Не удалось снять блокировку:', error);
        alert('Не удалось снять блокировку.');
    });
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

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем админ-статус при загрузке
    if (USER_UID && ADMIN_UIDS.includes(USER_UID) && localStorage.getItem('dc_admin_' + SITE) === '1') {
        isAdmin = true;
        var dot = document.getElementById('adminDot');
        if (dot) dot.classList.add('active');
    }
    
    updateAdminMenu();
});

console.log('✅ admin.js загружен');
