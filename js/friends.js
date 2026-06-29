// ================================================================
// ДРУЗЬЯ, ПОДПИСКИ, УВЕДОМЛЕНИЯ
// ================================================================

// ===== ЛЮДИ =====
function loadPeople() {
    if (!USER_UID) {
        document.getElementById('peopleList').innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Войдите</div>';
        return;
    }
    db.ref('sites/' + SITE + '/users').once('value', snap => {
        const users = snap.val() || {};
        const keys = Object.keys(users).filter(k => k !== USER_UID);
        const el = document.getElementById('peopleList');
        if (!keys.length) {
            el.innerHTML = '<div style="text-align:center;padding:6px;color:#bbb;font-size:0.65rem;">Нет других пользователей</div>';
            return;
        }
        el.innerHTML = keys.map(k => {
            const u = users[k];
            const name = u.name || 'Аноним';
            const letter = name.charAt(0).toUpperCase();
            return `<div class="people-item" onclick="viewUser('${k}')">
                <span class="avatar-wrap" id="pava-${k}"><span class="letter">${letter}</span></span>
                <div class="info"><div class="name">${esc(name)}</div><div class="status">Нажмите для просмотра</div></div>
            </div>`;
        }).join('');
        keys.forEach(k => {
            const el2 = document.getElementById('pava-' + k);
            if (el2) renderAvatar(k, el2, '?');
        });
    });
}

// ===== ДРУЗЬЯ (БАЗОВЫЕ ФУНКЦИИ) =====
function checkFriend(uid) {
    if (!USER_UID) return false;
    return localStorage.getItem('fr_' + USER_UID + '_' + uid) === '1';
}

window.toggleFriend = function(uid) {
    if (!USER_UID) return;
    const isFriend = checkFriend(uid);
    if (isFriend) {
        if (!confirm('Удалить из друзей?')) return;
        localStorage.removeItem('fr_' + USER_UID + '_' + uid);
        db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + uid).remove();
        db.ref('sites/' + SITE + '/friends/' + uid + '/' + USER_UID).remove();
    } else {
        localStorage.setItem('fr_' + USER_UID + '_' + uid, '1');
        db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + uid).set(true);
        db.ref('sites/' + SITE + '/friends/' + uid + '/' + USER_UID).set(true);
        // ===== ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ =====
        sendNotification(uid, {
            type: 'friend_request',
            from: USER_UID,
            text: USER + ' отправил(а) запрос в друзья',
            timestamp: Date.now()
        });
    }
    loadProfile();
    if (VIEWING_USER) showProfileActions(VIEWING_USER);
};

function loadFriends(uid) {
    db.ref('sites/' + SITE + '/friends/' + uid).on('value', snap => {
        const data = snap.val() || {};
        const keys = Object.keys(data);
        document.getElementById('friendsCount').textContent = keys.length;
        const el = document.getElementById('friendList');
        if (!keys.length) { el.innerHTML = '<span style="color:#bbb;font-size:0.55rem;">Нет друзей</span>'; return; }
        let html = '';
        let loaded = 0;
        keys.forEach(k => {
            db.ref('sites/' + SITE + '/users/' + k).once('value', usnap => {
                const u = usnap.val() || {};
                const name = u.name || 'Аноним';
                const letter = name.charAt(0).toUpperCase();
                html += `<span class="friend-item" onclick="viewUser('${k}')">
                    <span class="avatar-wrap" id="fava-${k}"><span class="letter">${letter}</span></span> ${esc(name)}
                </span>`;
                loaded++;
                if (loaded === keys.length) {
                    el.innerHTML = html;
                    keys.forEach(k2 => {
                        const el2 = document.getElementById('fava-' + k2);
                        if (el2) renderAvatar(k2, el2, '?');
                    });
                }
            });
        });
    });
}

function loadSubscribers(uid) {
    if (!uid) return;
    db.ref('sites/' + SITE + '/subscribers/' + uid).on('value', snap => {
        const data = snap.val() || {};
        document.getElementById('subscribersCount').textContent = Object.keys(data).length;
    });
}

function loadSubscriptions(uid) {
    if (!uid) return;
    db.ref('sites/' + SITE + '/subscriptions/' + uid).on('value', snap => {
        const data = snap.val() || {};
        document.getElementById('subscriptionsCount').textContent = Object.keys(data).length;
    });
}

// ================================================================
// ПРОДВИНУТАЯ ЛОГИКА ДРУЗЕЙ (С УВЕДОМЛЕНИЯМИ)
// ================================================================

function updateFriendStatus(myUid, targetUid, status) {
    if (!myUid || !targetUid) return;
    const updates = {};
    const p1 = 'sites/' + SITE + '/friends/' + myUid + '/' + targetUid;
    const p2 = 'sites/' + SITE + '/friends/' + targetUid + '/' + myUid;
    if (status === 'friend') {
        updates[p1] = 'friend';
        updates[p2] = 'friend';
        updates['sites/' + SITE + '/followers/' + targetUid + '/' + myUid] = true;
    } else if (status === 'pending') {
        updates[p1] = 'pending';
        updates[p2] = 'pending';
        updates['sites/' + SITE + '/followers/' + targetUid + '/' + myUid] = true;
    } else {
        updates[p1] = null;
        updates[p2] = null;
        updates['sites/' + SITE + '/followers/' + targetUid + '/' + myUid] = null;
    }
    db.ref().update(updates);
}

function sendFriendRequest(targetUid) {
    if (!USER_UID || targetUid === USER_UID) {
        alert('Нельзя добавить себя');
        return;
    }
    db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + targetUid).once('value', snap => {
        const status = snap.val();
        if (status === 'friend') {
            alert('✅ Уже в друзьях');
            return;
        }
        if (status === 'pending') {
            updateFriendStatus(USER_UID, targetUid, null);
            if (viewingProfileUid) renderProfile(viewingProfileUid);
            return;
        }
        updateFriendStatus(USER_UID, targetUid, 'pending');
        // ===== ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ =====
        sendNotification(targetUid, {
            type: 'friend_request',
            from: USER_UID,
            text: USER + ' отправил(а) запрос в друзья',
            timestamp: Date.now()
        });
        if (viewingProfileUid) renderProfile(viewingProfileUid);
    });
}

function acceptFriendRequest(targetUid) {
    if (!USER_UID) return;
    updateFriendStatus(USER_UID, targetUid, 'friend');
    // ===== ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ О ПРИНЯТИИ =====
    sendNotification(targetUid, {
        type: 'friend_accepted',
        from: USER_UID,
        text: USER + ' принял(а) ваш запрос в друзья',
        timestamp: Date.now()
    });
    alert('✅ Дружба подтверждена!');
    if (viewingProfileUid) renderProfile(viewingProfileUid);
}

function removeFriend(targetUid) {
    if (!USER_UID) return;
    if (!confirm('Удалить из друзей?')) return;
    updateFriendStatus(USER_UID, targetUid, null);
    if (viewingProfileUid) renderProfile(viewingProfileUid);
}

function declineFriendRequest(targetUid) {
    if (!USER_UID) return;
    const updates = {};
    updates['sites/' + SITE + '/friends/' + USER_UID + '/' + targetUid] = null;
    updates['sites/' + SITE + '/friends/' + targetUid + '/' + USER_UID] = null;
    db.ref().update(updates);
    if (viewingProfileUid) renderProfile(viewingProfileUid);
}

function listenFriendStatus(targetUid) {
    if (!USER_UID || !targetUid) return;
    if (friendListeners[targetUid]) { friendListeners[targetUid](); delete friendListeners[targetUid]; }
    const ref = db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + targetUid);
    const handler = snap => { updateFriendButton(targetUid, snap.val() || 'none'); };
    ref.on('value', handler);
    friendListeners[targetUid] = () => { ref.off('value', handler); delete friendListeners[targetUid]; };
}

function updateFriendButton(uid, status) {
    const btn = document.getElementById('friend-btn-' + uid);
    if (!btn) return;
    btn.className = 'btn-action btn-friend';
    btn.disabled = false;
    if (status === 'friend') {
        btn.innerHTML = `<span class="icon">✓</span> В друзьях`;
        btn.classList.add('friend');
        btn.onclick = (e) => { e.stopPropagation(); removeFriend(uid); };
    } else if (status === 'pending') {
        btn.innerHTML = `<span class="icon">⏳</span> Запрос`;
        btn.classList.add('pending');
        btn.onclick = (e) => { e.stopPropagation(); sendFriendRequest(uid); };
    } else {
        btn.innerHTML = `<span class="icon">➕</span> Добавить`;
        btn.classList.add('add');
        btn.onclick = (e) => { e.stopPropagation(); sendFriendRequest(uid); };
    }
}
