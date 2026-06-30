// ================================================================
// ДРУЗЬЯ
// ================================================================

function loadPeople() {
    if (!USER_UID) {
        document.getElementById('peopleList').innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Войдите</div>';
        return;
    }
    
    db.ref('sites/' + SITE + '/users').once('value', function(snap) {
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
            html += '<div class="people-item" onclick="viewUser(\'' + k + '\')"><span class="avatar-wrap" id="pava-' + k + '"><span class="letter">' + letter + '</span></span><div class="info"><div class="name">' + esc(name) + '</div><div class="status">Нажмите для просмотра</div></div></div>';
        });
        el.innerHTML = html;
        
        keys.forEach(function(k) {
            var el2 = document.getElementById('pava-' + k);
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
    var updates = {};
    var p1 = 'sites/' + SITE + '/friends/' + myUid + '/' + targetUid;
    var p2 = 'sites/' + SITE + '/friends/' + targetUid + '/' + myUid;
    
    if (status === 'friend') {
        updates[p1] = 'friend';
        updates[p2] = 'friend';
        updates['sites/' + SITE + '/subscribers/' + targetUid + '/' + myUid] = true;
        updates['sites/' + SITE + '/subscribers/' + myUid + '/' + targetUid] = true;
    } else if (status === 'pending') {
        updates[p1] = 'pending';
        updates[p2] = 'pending';
    } else {
        updates[p1] = null;
        updates[p2] = null;
        updates['sites/' + SITE + '/subscribers/' + targetUid + '/' + myUid] = null;
        updates['sites/' + SITE + '/subscribers/' + myUid + '/' + targetUid] = null;
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
    
    db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + targetUid).once('value', function(snap) {
        var status = snap.val();
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
        if (VIEWING_USER) loadProfile();
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
    if (VIEWING_USER) loadProfile();
    loadPeople();
    loadProfile();
}

function declineFriendRequest(targetUid) {
    if (!USER_UID) return;
    if (!confirm('Отклонить запрос в друзья?')) return;
    updateFriendStatus(USER_UID, targetUid, 'none');
    if (VIEWING_USER) loadProfile();
    loadPeople();
}

function removeFriend(targetUid) {
    if (!USER_UID) return;
    if (!confirm('Удалить из друзей?')) return;
    updateFriendStatus(USER_UID, targetUid, 'none');
    if (VIEWING_USER) loadProfile();
    loadPeople();
    loadProfile();
}
