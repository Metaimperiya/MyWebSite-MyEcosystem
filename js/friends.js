// ================================================================
// ДРУЗЬЯ
// ================================================================

function updateFriendStatus(myUid, targetUid, status) {
    if (!myUid || !targetUid) return;
    const updates = {};
    const p1 = 'sites/' + SITE + '/friends/' + myUid + '/' + targetUid;
    const p2 = 'sites/' + SITE + '/friends/' + targetUid + '/' + myUid;
    if (status === 'friend') {
        updates[p1] = 'friend'; updates[p2] = 'friend';
        updates['sites/' + SITE + '/followers/' + targetUid + '/' + myUid] = true;
    } else if (status === 'pending') {
        updates[p1] = 'pending'; updates[p2] = 'pending';
        updates['sites/' + SITE + '/followers/' + targetUid + '/' + myUid] = true;
    } else {
        updates[p1] = null; updates[p2] = null;
        updates['sites/' + SITE + '/followers/' + targetUid + '/' + myUid] = null;
    }
    db.ref().update(updates);
}

function sendFriendRequest(targetUid) {
    if (!USER_UID || targetUid === USER_UID) { alert('Нельзя добавить себя'); return; }
    db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + targetUid).once('value', snap => {
        const status = snap.val();
        if (status === 'friend') { alert('✅ Уже в друзьях'); return; }
        if (status === 'pending') { updateFriendStatus(USER_UID, targetUid, null); if (viewingProfileUid) renderProfile(viewingProfileUid); return; }
        updateFriendStatus(USER_UID, targetUid, 'pending');
        sendNotification(targetUid, { type: 'friend_request', from: USER_UID, text: USER + ' отправил(а) запрос в друзья', timestamp: Date.now() });
        if (viewingProfileUid) renderProfile(viewingProfileUid);
    });
}

function acceptFriendRequest(targetUid) {
    if (!USER_UID) return;
    updateFriendStatus(USER_UID, targetUid, 'friend');
    sendNotification(targetUid, { type: 'friend_accepted', from: USER_UID, text: USER + ' принял(а) ваш запрос в друзья', timestamp: Date.now() });
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
