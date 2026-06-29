function loadChat(path) {
    if (chatUnsub) { if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value'); chatUnsub = null; }
    const box = document.getElementById('chatMessages');
    box.innerHTML = '<div style="color:#bbb;text-align:center;padding:6px;font-size:0.65rem;">⏳ Загрузка...</div>';
    chatUnsub = path;
    db.ref(path).orderByChild('timestamp').on('value', snap => {
        box.innerHTML = '';
        if (!snap.exists()) { box.innerHTML = '<div style="color:#bbb;text-align:center;padding:6px;font-size:0.65rem;">Сообщений нет</div>'; return; }
        snap.forEach(s => {
            const m = s.val();
            const div = document.createElement('div');
            div.className = 'msg';
            div.innerHTML = `<span class="author">${esc(m.nick||'?')}</span><span class="time">${m.time||''}</span><div>${esc(m.text||'')}</div>`;
            box.appendChild(div);
        });
        box.scrollTop = box.scrollHeight;
    });
}

window.sendChat = function() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || !CURRENT_ROOM) return;
    db.ref('rooms/' + SITE + '_' + CURRENT_ROOM + '/messages').push({
        nick: USER,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    });
    input.value = '';
};

document.getElementById('chatInput').addEventListener('keypress', e => { if (e.key === 'Enter') sendChat(); });

window.closeChat = function() {
    document.getElementById('chatView').classList.remove('active');
    if (chatUnsub) { if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value'); chatUnsub = null; }
    CURRENT_ROOM = null;
    if (document.getElementById('groupsPage').classList.contains('active')) goToGroups();
    else if (document.getElementById('peoplePage').classList.contains('active')) goToPeople();
    else if (document.getElementById('profilePage').classList.contains('active')) goToProfile();
    else goToFeed();
};

// ================================================================
// ЛИЧНЫЕ СООБЩЕНИЯ
// ================================================================

function openPrivateChat(targetUid) {
    if (!USER_UID) { alert('Войдите!'); return; }
    if (targetUid === USER_UID) { alert('Нельзя писать себе'); return; }
    const chatId = [USER_UID, targetUid].sort().join('_');
    const path = 'dms/' + SITE + '/' + chatId + '/messages';
    closeNotifications();
    closeContextMenu();
    closeProfileDropdown();
    CURRENT_ROOM = chatId;
    document.getElementById('chatWindow').classList.add('active');
    db.ref('sites/' + SITE + '/all_users/' + targetUid).once('value', snap => {
        const user = snap.val() || {};
        document.getElementById('chatTitle').textContent = '💬 ' + (user.name || 'Собеседник');
    });
    loadChat(path);
}

function loadChat(path) {
    if (chatUnsub) { if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value'); chatUnsub = null; }
    const box = document.getElementById('chatMessages');
    box.innerHTML = '<div style="color:#65676b;text-align:center;padding:16px;">⏳ Загрузка...</div>';
    chatUnsub = path;
    db.ref(path).orderByChild('timestamp').on('value', snap => {
        box.innerHTML = '';
        if (!snap.exists()) { box.innerHTML = '<div style="color:#65676b;text-align:center;padding:20px;">Сообщений нет</div>'; return; }
        snap.forEach(s => {
            const m = s.val();
            const isSelf = m.nick === USER;
            const div = document.createElement('div');
            div.className = 'msg' + (isSelf ? ' self' : '');
            div.innerHTML = `<span class="author">${esc(m.nick || '?')}</span><span class="time">${m.time || ''}</span><div>${esc(m.text || '')}</div>`;
            box.appendChild(div);
        });
        box.scrollTop = box.scrollHeight;
    });
}

function sendChat() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || !CURRENT_ROOM) return;
    const path = 'dms/' + SITE + '/' + CURRENT_ROOM + '/messages';
    const parts = CURRENT_ROOM.split('_');
    const targetUid = parts[0] === USER_UID ? parts[1] : parts[0];
    db.ref(path).push({
        nick: USER,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    });
    sendNotification(targetUid, { type: 'message', from: USER_UID, text: USER + ': ' + text, timestamp: Date.now() });
    input.value = '';
}

function closeChat() {
    document.getElementById('chatWindow').classList.remove('active');
    if (chatUnsub) { if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value'); chatUnsub = null; }
    CURRENT_ROOM = null;
}
