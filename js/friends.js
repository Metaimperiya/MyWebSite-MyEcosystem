// ================================================================
// ДРУЗЬЯ, ПОДПИСКИ, УВЕДОМЛЕНИЯ
// ================================================================

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

function checkFriendStatus(uid) {
    if (!USER_UID) return 'none';
    return localStorage.getItem('fs_' + USER_UID + '_' + uid) || 'none';
}

function updateFriendStatus(myUid, targetUid, status) {
    if (!myUid || !targetUid) return;
    const updates = {};
    const p1 = 'sites/' + SITE + '/friends/' + myUid + '/' + targetUid;
    const p2 = 'sites/' + SITE + '/friends/' + targetUid + '/' + myUid;
    if (status === 'friend') {
        updates[p1] = 'friend';
        updates[p2] = 'friend';
        updates['sites/' + SITE + '/followers/' + targetUid + '/' + myUid] = true;
        updates['sites/' + SITE + '/followers/' + myUid + '/' + targetUid] = true;
    } else if (status === 'pending') {
        updates[p1] = 'pending';
        updates[p2] = 'pending';
    } else {
        updates[p1] = null;
        updates[p2] = null;
        updates['sites/' + SITE + '/followers/' + targetUid + '/' + myUid] = null;
        updates['sites/' + SITE + '/followers/' + myUid + '/' + targetUid] = null;
    }
    db.ref().update(updates);
    if (status === 'friend') {
        localStorage.setItem('fs_' + myUid + '_' + targetUid, 'friend');
        localStorage.setItem('fs_' + targetUid + '_' + myUid, 'friend');
    } else if (status === 'pending') {
        localStorage.setItem('fs_' + myUid + '_' + targetUid, 'pending');
        localStorage.setItem('fs_' + targetUid + '_' + myUid, 'pending');
    } else {
        localStorage.removeItem('fs_' + myUid + '_' + targetUid);
        localStorage.removeItem('fs_' + targetUid + '_' + myUid);
    }
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
            alert('⏳ Запрос уже отправлен');
            return;
        }
        updateFriendStatus(USER_UID, targetUid, 'pending');
        sendNotification(targetUid, {
            type: 'friend_request',
            from: USER_UID,
            fromName: USER,
            text: USER + ' отправил(а) запрос в друзья',
            timestamp: Date.now()
        });
        alert('✅ Запрос в друзья отправлен!');
        if (viewingProfileUid) renderProfile(viewingProfileUid);
        loadPeople();
    });
}

function acceptFriendRequest(targetUid) {
    if (!USER_UID) return;
    updateFriendStatus(USER_UID, targetUid, 'friend');
    sendNotification(targetUid, {
        type: 'friend_accepted',
        from: USER_UID,
        fromName: USER,
        text: USER + ' принял(а) ваш запрос в друзья',
        timestamp: Date.now()
    });
    alert('✅ Дружба подтверждена!');
    if (viewingProfileUid) renderProfile(viewingProfileUid);
    loadPeople();
    loadProfile();
}

function declineFriendRequest(targetUid) {
    if (!USER_UID) return;
    if (!confirm('Отклонить запрос в друзья?')) return;
    updateFriendStatus(USER_UID, targetUid, 'none');
    if (viewingProfileUid) renderProfile(viewingProfileUid);
    loadPeople();
}

function removeFriend(targetUid) {
    if (!USER_UID) return;
    if (!confirm('Удалить из друзей?')) return;
    updateFriendStatus(USER_UID, targetUid, 'none');
    if (viewingProfileUid) renderProfile(viewingProfileUid);
    loadPeople();
    loadProfile();
}

function loadFriends(uid) {
    db.ref('sites/' + SITE + '/friends/' + uid).on('value', snap => {
        const data = snap.val() || {};
        const keys = Object.keys(data).filter(k => data[k] === 'friend');
        document.getElementById('friendsCount').textContent = keys.length;
        const el = document.getElementById('friendList');
        if (!keys.length) {
            el.innerHTML = '<span style="color:#bbb;font-size:0.55rem;">Нет друзей</span>';
            return;
        }
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
    db.ref('sites/' + SITE + '/followers/' + uid).on('value', snap => {
        const data = snap.val() || {};
        document.getElementById('subscribersCount').textContent = Object.keys(data).length;
    });
}

function loadSubscriptions(uid) {
    if (!uid) return;
    db.ref('sites/' + SITE + '/followers').on('value', snap => {
        const all = snap.val() || {};
        let count = 0;
        for (const [target, followers] of Object.entries(all)) {
            if (followers && followers[uid] === true) count++;
        }
        document.getElementById('subscriptionsCount').textContent = count;
    });
}

function getFriendStatus(uid) {
    if (!USER_UID) return 'none';
    return localStorage.getItem('fs_' + USER_UID + '_' + uid) || 'none';
}

function updateFriendButton(uid) {
    const status = getFriendStatus(uid);
    const btn = document.getElementById('friendActionBtn');
    if (!btn) return;
    if (status === 'friend') {
        btn.textContent = '✅ В друзьях';
        btn.className = 'friend-btn friend';
        btn.onclick = () => removeFriend(uid);
    } else if (status === 'pending') {
        btn.textContent = '⏳ Запрос отправлен';
        btn.className = 'friend-btn pending';
        btn.onclick = () => sendFriendRequest(uid);
    } else {
        btn.textContent = '➕ Добавить в друзья';
        btn.className = 'friend-btn add';
        btn.onclick = () => sendFriendRequest(uid);
    }
}
