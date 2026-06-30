// ================================================================
// СИСТЕМА ДРУЗЕЙ — ПОЛНАЯ ПЕРЕРАБОТКА
// ================================================================

// ================================================================
// 1. ОТОБРАЖЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
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
            html += '<div class="info"><div class="name">' + esc(name) + '</div><div class="status">Нажмите для просмотра</div></div>';
            html += '</div>';
        });
        el.innerHTML = html;

        keys.forEach(function(k) {
            var el2 = document.getElementById('pava-' + k);
            if (el2) renderAvatar(k, el2, '?');
        });
    });
}

// ================================================================
// 2. ПОЛУЧЕНИЕ СТАТУСА ОТНОШЕНИЙ С ПОЛЬЗОВАТЕЛЕМ
// ================================================================

function getFriendStatus(myUid, targetUid) {
    // Возвращает: 'none' | 'pending_sent' | 'pending_received' | 'friend'
    var status = localStorage.getItem('fs_' + myUid + '_' + targetUid) || 'none';
    return status;
}

// ================================================================
// 3. ОТПРАВКА ЗАЯВКИ В ДРУЗЬЯ (НЕ ДОБАВЛЯЕТ В ДРУЗЬЯ!)
// ================================================================

function sendFriendRequest(targetUid) {
    if (!USER_UID || targetUid === USER_UID) {
        alert('Нельзя добавить себя');
        return;
    }

    // Проверяем текущий статус
    var ref = db.ref('sites/' + SITE + '/friend_requests/' + USER_UID + '/' + targetUid);
    ref.once('value', function(snap) {
        var existing = snap.val();
        if (existing) {
            alert('⏳ Запрос уже отправлен или вы уже друзья');
            return;
        }

        // Проверяем, не друзья ли уже
        db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + targetUid).once('value', function(friendSnap) {
            if (friendSnap.val() === true) {
                alert('✅ Вы уже друзья!');
                return;
            }

            // Отправляем заявку
            var requestData = {
                from: USER_UID,
                fromName: USER,
                to: targetUid,
                timestamp: Date.now(),
                status: 'pending' // pending | accepted | declined
            };

            // Сохраняем заявку у отправителя и получателя
            var updates = {};
            updates['sites/' + SITE + '/friend_requests/' + USER_UID + '/' + targetUid] = requestData;
            updates['sites/' + SITE + '/friend_requests/' + targetUid + '/' + USER_UID] = requestData;

            db.ref().update(updates).then(function() {
                // Сохраняем статус в localStorage
                localStorage.setItem('fs_' + USER_UID + '_' + targetUid, 'pending_sent');
                localStorage.setItem('fs_' + targetUid + '_' + USER_UID, 'pending_received');

                // Отправляем уведомление получателю
                sendNotification(targetUid, {
                    type: 'friend_request',
                    from: USER_UID,
                    fromName: USER,
                    text: USER + ' отправил(а) вам заявку в друзья',
                    timestamp: Date.now()
                });

                alert('✅ Заявка в друзья отправлена!');
                if (VIEWING_USER) loadProfile();
                loadPeople();
            });
        });
    });
}

// ================================================================
// 4. ОТМЕНА ЗАЯВКИ В ДРУЗЬЯ
// ================================================================

function cancelFriendRequest(targetUid) {
    if (!USER_UID) return;
    if (!confirm('Отменить заявку в друзья?')) return;

    var updates = {};
    updates['sites/' + SITE + '/friend_requests/' + USER_UID + '/' + targetUid] = null;
    updates['sites/' + SITE + '/friend_requests/' + targetUid + '/' + USER_UID] = null;

    db.ref().update(updates).then(function() {
        localStorage.removeItem('fs_' + USER_UID + '_' + targetUid);
        localStorage.removeItem('fs_' + targetUid + '_' + USER_UID);
        alert('✅ Заявка отменена');
        if (VIEWING_USER) loadProfile();
        loadPeople();
    });
}

// ================================================================
// 5. ПРИНЯТИЕ ЗАЯВКИ В ДРУЗЬЯ
// ================================================================

function acceptFriendRequest(fromUid) {
    if (!USER_UID) return;
    if (!confirm('Принять заявку в друзья от ' + fromUid + '?')) return;

    // Добавляем в друзья
    var updates = {};
    updates['sites/' + SITE + '/friends/' + USER_UID + '/' + fromUid] = true;
    updates['sites/' + SITE + '/friends/' + fromUid + '/' + USER_UID] = true;

    // Удаляем заявку
    updates['sites/' + SITE + '/friend_requests/' + USER_UID + '/' + fromUid] = null;
    updates['sites/' + SITE + '/friend_requests/' + fromUid + '/' + USER_UID] = null;

    db.ref().update(updates).then(function() {
        // Обновляем localStorage
        localStorage.setItem('fs_' + USER_UID + '_' + fromUid, 'friend');
        localStorage.setItem('fs_' + fromUid + '_' + USER_UID, 'friend');

        // Уведомление отправителю
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
    });
}

// ================================================================
// 6. ОТКЛОНЕНИЕ ЗАЯВКИ В ДРУЗЬЯ
// ================================================================

function declineFriendRequest(fromUid) {
    if (!USER_UID) return;
    if (!confirm('Отклонить заявку в друзья?')) return;

    var updates = {};
    updates['sites/' + SITE + '/friend_requests/' + USER_UID + '/' + fromUid] = null;
    updates['sites/' + SITE + '/friend_requests/' + fromUid + '/' + USER_UID] = null;

    db.ref().update(updates).then(function() {
        localStorage.removeItem('fs_' + USER_UID + '_' + fromUid);
        localStorage.removeItem('fs_' + fromUid + '_' + USER_UID);
        alert('✅ Заявка отклонена');
        if (VIEWING_USER) loadProfile();
        loadPeople();
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
        localStorage.removeItem('fs_' + USER_UID + '_' + targetUid);
        localStorage.removeItem('fs_' + targetUid + '_' + USER_UID);
        alert('✅ Пользователь удалён из друзей');
        if (VIEWING_USER) loadProfile();
        loadPeople();
        loadFriends(USER_UID);
    });
}

// ================================================================
// 8. ЗАГРУЗКА СПИСКА ДРУЗЕЙ
// ================================================================

function loadFriends(uid) {
    if (!uid) return;

    db.ref('sites/' + SITE + '/friends/' + uid).on('value', function(snap) {
        var data = snap.val() || {};
        var keys = Object.keys(data).filter(function(k) { return data[k] === true; });

        // Обновляем счетчик
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
// 9. ЗАГРУЗКА ЗАЯВОК В ДРУЗЬЯ (ДЛЯ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ)
// ================================================================

function loadFriendRequests() {
    if (!USER_UID) return;

    db.ref('sites/' + SITE + '/friend_requests/' + USER_UID).on('value', function(snap) {
        var requests = snap.val() || {};
        var keys = Object.keys(requests);
        var incoming = keys.filter(function(k) {
            return requests[k] && requests[k].from === k && requests[k].status === 'pending';
        });

        // Обновляем бейдж уведомлений
        var badge = document.getElementById('notifBadge');
        if (badge) {
            var currentCount = parseInt(badge.textContent) || 0;
            // Считаем заявки как уведомления
            var notifCount = incoming.length;
            // Обновляем общее количество
            if (notifCount > 0) {
                badge.style.display = 'inline';
                badge.textContent = notifCount;
            } else {
                badge.style.display = 'none';
            }
        }
    });
}

// ================================================================
// 10. ОБНОВЛЕНИЕ КНОПКИ В ПРОФИЛЕ
// ================================================================

function updateFriendButton(uid) {
    var btn = document.getElementById('friendActionBtn');
    if (!btn) return;

    var status = getFriendStatus(USER_UID, uid);

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
    } else {
        btn.textContent = '➕ Добавить в друзья';
        btn.className = 'friend-btn add';
        btn.onclick = function() { sendFriendRequest(uid); };
    }
}
