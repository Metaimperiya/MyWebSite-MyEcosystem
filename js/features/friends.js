// ================================================================ */
// СИСТЕМА ДРУЗЕЙ — ПОЛНАЯ ВЕРСИЯ С РЕАЛЬНЫМ ВРЕМЕНЕМ
// ================================================================ */

// ================================================================ */
// 1. ПОЛУЧЕНИЕ СТАТУСА ДРУЖБЫ В РЕАЛЬНОМ ВРЕМЕНИ
// ================================================================ */

function getFriendStatusRealtime(myUid, targetUid, callback) {
    if (!myUid || !targetUid) { callback('none'); return; }
    if (myUid === targetUid) { callback('self'); return; }

    // Проверяем, друзья ли уже
    db.ref('sites/' + SITE + '/friends/' + myUid + '/' + targetUid).on('value', function(snap) {
        if (snap.val() === true) {
            localStorage.setItem('fs_' + myUid + '_' + targetUid, 'friend');
            callback('friend');
            return;
        }

        // Проверяем, есть ли входящая заявка
        db.ref('sites/' + SITE + '/friend_requests/' + myUid + '/' + targetUid).once('value', function(reqSnap) {
            var req = reqSnap.val();
            if (req && req.from === targetUid && req.status === 'pending') {
                localStorage.setItem('fs_' + myUid + '_' + targetUid, 'pending_received');
                callback('pending_received');
                return;
            }

            // Проверяем, есть ли исходящая заявка
            db.ref('sites/' + SITE + '/friend_requests/' + targetUid + '/' + myUid).once('value', function(reqSnap2) {
                var req2 = reqSnap2.val();
                if (req2 && req2.from === myUid && req2.status === 'pending') {
                    localStorage.setItem('fs_' + myUid + '_' + targetUid, 'pending_sent');
                    callback('pending_sent');
                    return;
                }

                localStorage.removeItem('fs_' + myUid + '_' + targetUid);
                callback('none');
            });
        });
    });
}

// ================================================================ */
// 2. ОТОБРАЖЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
// ================================================================ */

function friendActionHtml(status, targetUid) {
    if (status === 'friend') {
        return '<button class="people-action secondary" onclick="event.stopPropagation();removeFriend(\'' + targetUid + '\')">Remove</button>';
    }
    if (status === 'pending_sent') {
        return '<button class="people-action secondary" onclick="event.stopPropagation();cancelFriendRequest(\'' + targetUid + '\')">Requested</button>';
    }
    if (status === 'pending_received') {
        return '<button class="people-action" onclick="event.stopPropagation();acceptFriendRequest(\'' + targetUid + '\')">Accept</button>' +
            '<button class="people-action secondary" onclick="event.stopPropagation();declineFriendRequest(\'' + targetUid + '\')">Decline</button>';
    }
    return '<button class="people-action" onclick="event.stopPropagation();sendFriendRequest(\'' + targetUid + '\')">Add friend</button>';
}

function canInteractWithUser(targetUid, callback) {
    if (!USER_UID || !targetUid || targetUid === USER_UID) return callback(false);
    db.ref('sites/' + SITE + '/blocks/' + USER_UID + '/' + targetUid).once('value', function(snap) {
        callback(!snap.exists());
    }, function() { callback(false); });
}

function setProfileFriendAction(button, status, targetUid) {
    if (!button) return;
    button.className = 'friend-btn';
    button.disabled = false;
    button.onclick = null;
    if (status === 'friend') {
        button.classList.add('friend'); button.textContent = '🤝 Friends'; button.onclick = function() { removeFriend(targetUid); };
    } else if (status === 'pending_sent') {
        button.classList.add('pending'); button.textContent = '⏳ Request sent'; button.onclick = function() { cancelFriendRequest(targetUid); };
    } else if (status === 'pending_received') {
        button.classList.add('received'); button.textContent = '📩 Accept request'; button.onclick = function() { acceptFriendRequest(targetUid); };
    } else {
        button.classList.add('add'); button.textContent = '➕ Add friend'; button.onclick = function() { sendFriendRequest(targetUid); };
    }
}

function loadPeople() {
    if (!USER_UID) {
        document.getElementById('peopleList').innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Войдите</div>';
        return;
    }

    db.ref('sites/' + SITE + '/all_users').once('value', function(snap) {
        var users = snap.val() || {};
        var keys = Object.keys(users).filter(function(k) { return k !== USER_UID; });
        var el = document.getElementById('peopleList');

        if (!keys.length) {
            el.innerHTML = '<div style="text-align:center;padding:6px;color:#bbb;font-size:0.65rem;">Нет других пользователей</div>';
            return;
        }

        var html = '';
        keys.forEach(function(k) {
            var u = users[k];
            var name = u.name || 'Аноним';
            var letter = name.charAt(0).toUpperCase();
            html += '<div class="people-item" onclick="viewUser(\'' + k + '\')">';
            html += '<span class="avatar-wrap" id="pava-' + k + '"><span class="letter">' + letter + '</span></span>';
            html += '<div class="info"><div class="name">' + esc(name) + '</div><div class="status" id="pstatus-' + k + '">Загрузка...</div></div>';
            html += '<div class="people-actions" id="paction-' + k + '"></div>';
            html += '</div>';
        });
        el.innerHTML = html;

        keys.forEach(function(k) {
            var el2 = document.getElementById('pava-' + k);
            if (el2) renderAvatar(k, el2, '?');

            getFriendStatusRealtime(USER_UID, k, function(status) {
                var statusEl = document.getElementById('pstatus-' + k);
                if (!statusEl) return;

                var labels = {
                    'friend': '🤝 В друзьях',
                    'pending_sent': '⏳ Запрос отправлен',
                    'pending_received': '📩 Заявка от вас',
                    'none': '➕ Добавить в друзья',
                    'self': '👤 Это вы'
                };
                statusEl.textContent = labels[status] || '❓ Неизвестно';
                statusEl.style.color = status === 'friend' ? '#1877f2' : '#888';
                var actionEl = document.getElementById('paction-' + k);
                if (actionEl) actionEl.innerHTML = friendActionHtml(status, k);
            });
        });
    });
}

// ================================================================ */
// 3. ОТПРАВКА ЗАЯВКИ
// ================================================================ */

function sendFriendRequest(targetUid) {
    if (!USER_UID || targetUid === USER_UID) {
        alert('Нельзя добавить себя');
        return;
    }

    canInteractWithUser(targetUid, function(allowed) {
        if (!allowed) {
            alert('Сначала снимите блокировку с этого пользователя.');
            return;
        }
    db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + targetUid).once('value', function(friendSnap) {
        if (friendSnap.val() === true) {
            alert('✅ Вы уже друзья!');
            return;
        }

        db.ref('sites/' + SITE + '/friend_requests/' + USER_UID + '/' + targetUid).once('value', function(reqSnap) {
            if (reqSnap.val()) {
                alert('⏳ Запрос уже отправлен');
                return;
            }

            var requestData = {
                from: USER_UID,
                fromName: USER,
                to: targetUid,
                timestamp: Date.now(),
                status: 'pending'
            };

            var updates = {};
            updates['sites/' + SITE + '/friend_requests/' + USER_UID + '/' + targetUid] = requestData;
            updates['sites/' + SITE + '/friend_requests/' + targetUid + '/' + USER_UID] = requestData;

            db.ref().update(updates).then(function() {
                localStorage.setItem('fs_' + USER_UID + '_' + targetUid, 'pending_sent');

                sendNotification(targetUid, {
                    type: 'friend_request',
                    from: USER_UID,
                    fromName: USER,
                    text: USER + ' отправил(а) вам заявку в друзья',
                    timestamp: Date.now()
                });

                alert('✅ Заявка отправлена!');
                if (VIEWING_USER) loadProfile();
                loadPeople();
            });
        });
    });
    });
}

// ================================================================ */
// 4. ОТМЕНА ЗАЯВКИ
// ================================================================ */

function cancelFriendRequest(targetUid) {
    if (!USER_UID) return;
    if (!confirm('Отменить заявку в друзья?')) return;

    var updates = {};
    updates['sites/' + SITE + '/friend_requests/' + USER_UID + '/' + targetUid] = null;
    updates['sites/' + SITE + '/friend_requests/' + targetUid + '/' + USER_UID] = null;

    db.ref().update(updates).then(function() {
        localStorage.removeItem('fs_' + USER_UID + '_' + targetUid);
        alert('✅ Заявка отменена');
        if (VIEWING_USER) loadProfile();
        loadPeople();
    });
}

// ================================================================ */
// 5. ПРИНЯТИЕ ЗАЯВКИ — С ОБНОВЛЕНИЕМ СТАТУСА
// ================================================================ */

function acceptFriendRequest(fromUid) {
    if (!USER_UID) return;
    if (!confirm('Принять заявку в друзья?')) return;

    var updates = {};
    updates['sites/' + SITE + '/friends/' + USER_UID + '/' + fromUid] = true;
    updates['sites/' + SITE + '/friends/' + fromUid + '/' + USER_UID] = true;
    updates['sites/' + SITE + '/friend_requests/' + USER_UID + '/' + fromUid] = null;
    updates['sites/' + SITE + '/friend_requests/' + fromUid + '/' + USER_UID] = null;

    db.ref().update(updates).then(function() {
        // 👇 ОБНОВЛЯЕМ СТАТУС В ЛОКАЛЬНОМ ХРАНИЛИЩЕ
        localStorage.setItem('fs_' + USER_UID + '_' + fromUid, 'friend');
        localStorage.setItem('fs_' + fromUid + '_' + USER_UID, 'friend');

        sendNotification(fromUid, {
            type: 'friend_accepted',
            from: USER_UID,
            fromName: USER,
            text: USER + ' принял(а) вашу заявку в друзья!',
            timestamp: Date.now()
        });

        alert('✅ Теперь вы друзья!');
        if (VIEWING_USER) loadProfile();
        loadPeople();
        loadFriends(USER_UID);
        // 👇 ПЕРЕЗАГРУЖАЕМ УВЕДОМЛЕНИЯ
        if (document.getElementById('notificationsModal') && document.getElementById('notificationsModal').classList.contains('open')) {
            openNotifications();
        }
    });
}

// ================================================================ */
// 6. ОТКЛОНЕНИЕ ЗАЯВКИ
// ================================================================ */

function declineFriendRequest(fromUid) {
    if (!USER_UID) return;
    if (!confirm('Отклонить заявку в друзья?')) return;

    var updates = {};
    updates['sites/' + SITE + '/friend_requests/' + USER_UID + '/' + fromUid] = null;
    updates['sites/' + SITE + '/friend_requests/' + fromUid + '/' + USER_UID] = null;

    db.ref().update(updates).then(function() {
        localStorage.removeItem('fs_' + USER_UID + '_' + fromUid);
        alert('✅ Заявка отклонена');
        if (VIEWING_USER) loadProfile();
        loadPeople();
        closeNotifications();
    });
}

// ================================================================ */
// 7. УДАЛЕНИЕ ИЗ ДРУЗЕЙ
// ================================================================ */

function removeFriend(targetUid) {
    if (!USER_UID) return;
    if (!confirm('Удалить из друзей?')) return;

    var updates = {};
    updates['sites/' + SITE + '/friends/' + USER_UID + '/' + targetUid] = null;
    updates['sites/' + SITE + '/friends/' + targetUid + '/' + USER_UID] = null;

    db.ref().update(updates).then(function() {
        localStorage.removeItem('fs_' + USER_UID + '_' + targetUid);
        localStorage.removeItem('fs_' + targetUid + '_' + USER_UID);
        alert('✅ Пользователь удалён из друзей');
        if (VIEWING_USER) loadProfile();
        loadPeople();
        loadFriends(USER_UID);
    });
}

// ================================================================ */
// 8. ЗАГРУЗКА ДРУЗЕЙ
// ================================================================ */

function loadFriends(uid) {
    if (!uid) return;

    db.ref('sites/' + SITE + '/friends/' + uid).on('value', function(snap) {
        var data = snap.val() || {};
        var keys = Object.keys(data).filter(function(k) { return data[k] === true; });

        var countEl = document.getElementById('friendsCount');
        if (countEl) countEl.textContent = keys.length;

        var el = document.getElementById('friendList');
        if (!el) return;

        if (!keys.length) {
            el.innerHTML = '<span style="color:#bbb;font-size:0.55rem;">Нет друзей</span>';
            return;
        }

        var html = '';
        var loaded = 0;
        keys.forEach(function(k) {
            db.ref('sites/' + SITE + '/all_users/' + k).once('value', function(usnap) {
                var u = usnap.val() || {};
                var name = u.name || 'Аноним';
                var letter = name.charAt(0).toUpperCase();
                html += '<span class="friend-item" onclick="viewUser(\'' + k + '\')">';
                html += '<span class="avatar-wrap" id="fava-' + k + '"><span class="letter">' + letter + '</span></span> ';
                html += esc(name);
                html += '</span>';
                loaded++;
                if (loaded === keys.length) {
                    el.innerHTML = html;
                    keys.forEach(function(k2) {
                        var el2 = document.getElementById('fava-' + k2);
                        if (el2) renderAvatar(k2, el2, '?');
                    });
                }
            });
        });
    });
}

// ================================================================ */
// 9. ЗАГРУЗКА ЗАЯВОК
// ================================================================ */

function loadFriendRequests() {
    if (!USER_UID) return;

    db.ref('sites/' + SITE + '/friend_requests/' + USER_UID).on('value', function(snap) {
        var requests = snap.val() || {};
        var keys = Object.keys(requests);
        var incoming = keys.filter(function(k) {
            return requests[k] && requests[k].from === k && requests[k].status === 'pending';
        });

        var badge = document.getElementById('notifBadge');
        if (badge) {
            if (incoming.length > 0) {
                badge.style.display = 'inline';
                badge.textContent = incoming.length;
            } else {
                badge.style.display = 'none';
            }
        }
    });
}
