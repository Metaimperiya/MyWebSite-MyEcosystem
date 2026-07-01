// ================================================================
// СИСТЕМА ДРУЗЕЙ — ПОЛНАЯ ВЕРСИЯ С РЕАЛЬНЫМ ВРЕМЕНЕМ
// ================================================================

// ================================================================
// 1. ПОЛУЧЕНИЕ СТАТУСА ДРУЖБЫ В РЕАЛЬНОМ ВРЕМЕНИ
// ================================================================

function getFriendStatusRealtime(myUid, targetUid, callback) {
    if (!myUid || !targetUid) { callback('none'); return; }
    if (myUid === targetUid) { callback('self'); return; }

    // Проверяем, друзья ли уже
    db.ref('sites/' + SITE + '/friends/' + myUid + '/' + targetUid).on('value', function(snap) {
        if (snap.val() === true) {
            callback('friend');
            return;
        }
        
        // Проверяем, есть ли входящая заявка
        db.ref('sites/' + SITE + '/friend_requests/' + myUid + '/' + targetUid).once('value', function(reqSnap) {
            var req = reqSnap.val();
            if (req && req.from === targetUid && req.status === 'pending') {
                callback('pending_received');
                return;
            }
            
            // Проверяем, есть ли исходящая заявка
            db.ref('sites/' + SITE + '/friend_requests/' + targetUid + '/' + myUid).once('value', function(reqSnap2) {
                var req2 = reqSnap2.val();
                if (req2 && req2.from === myUid && req2.status === 'pending') {
                    callback('pending_sent');
                    return;
                }
                
                callback('none');
            });
        });
    });
}

// ================================================================
// 2. ОТОБРАЖЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
// ================================================================

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
            html += '</div>';
        });
        el.innerHTML = html;

        keys.forEach(function(k) {
            var el2 = document.getElementById('pava-' + k);
            if (el2) renderAvatar(k, el2, '?');
            
            // Обновляем статус в реальном времени для каждого пользователя
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
            });
        });
    });
}

// ================================================================
// 3. ОТПРАВКА ЗАЯВКИ
// ================================================================

function sendFriendRequest(targetUid) {
    if (!USER_UID || targetUid === USER_UID) {
        alert('Нельзя добавить себя');
        return;
    }

    // Проверяем, не друзья ли уже
    db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + targetUid).once('value', function(friendSnap) {
        if (friendSnap.val() === true) {
            alert('✅ Вы уже друзья!');
            return;
        }

        // Проверяем, нет ли уже заявки
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
}

// ================================================================
// 4. ОТМЕНА ЗАЯВКИ
// ================================================================

function cancelFriendRequest(targetUid) {
    if (!USER_UID) return;
    if (!confirm('Отменить заявку в друзья?')) return;

    var updates = {};
    updates['sites/' + SITE + '/friend_requests/' + USER_UID + '/' + targetUid] = null;
    updates['sites/' + SITE + '/friend_requests/' + targetUid + '/' + USER_UID] = null;

    db.ref().update(updates).then(function() {
        alert('✅ Заявка отменена');
        if (VIEWING_USER) loadProfile();
        loadPeople();
    });
}

// ================================================================
// 5. ПРИНЯТИЕ ЗАЯВКИ
// ================================================================

function acceptFriendRequest(fromUid) {
    if (!USER_UID) return;
    if (!confirm('Принять заявку в друзья?')) return;

    var updates = {};
    updates['sites/' + SITE + '/friends/' + USER_UID + '/' + fromUid] = true;
    updates['sites/' + SITE + '/friends/' + fromUid + '/' + USER_UID] = true;
    updates['sites/' + SITE + '/friend_requests/' + USER_UID + '/' + fromUid] = null;
    updates['sites/' + SITE + '/friend_requests/' + fromUid + '/' + USER_UID] = null;

    db.ref().update(updates).then(function() {
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
        closeNotifications();
    });
}

// ================================================================
// 6. ОТКЛОНЕНИЕ ЗАЯВКИ
// ================================================================

function declineFriendRequest(fromUid) {
    if (!USER_UID) return;
    if (!confirm('Отклонить заявку в друзья?')) return;

    var updates = {};
    updates['sites/' + SITE + '/friend_requests/' + USER_UID + '/' + fromUid] = null;
    updates['sites/' + SITE + '/friend_requests/' + fromUid + '/' + USER_UID] = null;

    db.ref().update(updates).then(function() {
        alert('✅ Заявка отклонена');
        if (VIEWING_USER) loadProfile();
        loadPeople();
        closeNotifications();
    });
}

// ================================================================
// 7. УДАЛЕНИЕ ИЗ ДРУЗЕЙ
// ================================================================

function removeFriend(targetUid) {
    if (!USER_UID) return;
    if (!confirm('Удалить из друзей?')) return;

    var updates = {};
    updates['sites/' + SITE + '/friends/' + USER_UID + '/' + targetUid] = null;
    updates['sites/' + SITE + '/friends/' + targetUid + '/' + USER_UID] = null;

    db.ref().update(updates).then(function() {
        alert('✅ Пользователь удалён из друзей');
        if (VIEWING_USER) loadProfile();
        loadPeople();
        loadFriends(USER_UID);
    });
}

// ================================================================
// 8. ЗАГРУЗКА ДРУЗЕЙ
// ================================================================

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
            db.ref('sites/' + SITE + '/users/' + k).once('value', function(usnap) {
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

// ================================================================
// 9. ОБНОВЛЕНИЕ КНОПКИ В ПРОФИЛЕ (В РЕАЛЬНОМ ВРЕМЕНИ)
// ================================================================

function updateFriendButton(uid) {
    var btn = document.getElementById('friendActionBtn');
    if (!btn) return;
    
    if (uid === USER_UID) {
        btn.style.display = 'none';
        return;
    }
    
    btn.style.display = 'inline-block';
    
    getFriendStatusRealtime(USER_UID, uid, function(status) {
        if (status === 'friend') {
            btn.textContent = '✅ В друзьях';
            btn.className = 'friend-btn friend';
            btn.onclick = function() { removeFriend(uid); };
        } else if (status === 'pending_sent') {
            btn.textContent = '⏳ Запрос отправлен';
            btn.className = 'friend-btn pending';
            btn.onclick = function() { cancelFriendRequest(uid); };
        } else if (status === 'pending_received') {
            btn.textContent = '📩 Принять заявку';
            btn.className = 'friend-btn received';
            btn.onclick = function() { acceptFriendRequest(uid); };
        } else if (status === 'self') {
            btn.style.display = 'none';
        } else {
            btn.textContent = '➕ Добавить в друзья';
            btn.className = 'friend-btn add';
            btn.onclick = function() { sendFriendRequest(uid); };
        }
    });
}

// ================================================================
// 10. ЗАГРУЗКА ЗАЯВОК (ДЛЯ УВЕДОМЛЕНИЙ)
// ================================================================

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
