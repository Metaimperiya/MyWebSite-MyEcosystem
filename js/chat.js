// ================================================================
// ЧАТ
// ================================================================

function loadChat(path) {
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    
    var box = document.getElementById('chatMessages');
    box.innerHTML = '<div style="color:#bbb;text-align:center;padding:6px;font-size:0.65rem;">⏳ Загрузка...</div>';
    chatUnsub = path;
    
    db.ref(path).orderByChild('timestamp').on('value', function(snap) {
        box.innerHTML = '';
        if (!snap.exists()) {
            box.innerHTML = '<div style="color:#bbb;text-align:center;padding:6px;font-size:0.65rem;">Сообщений нет</div>';
            return;
        }
        
        snap.forEach(function(s) {
            var m = s.val();
            var div = document.createElement('div');
            div.className = 'msg';
            div.innerHTML = '<span class="author">' + esc(m.nick || '?') + '</span><span class="time">' + (m.time || '') + '</span><div>' + esc(m.text || '') + '</div>';
            box.appendChild(div);
        });
        box.scrollTop = box.scrollHeight;
    });
}

window.sendChatMessage = function() {
    var input = document.getElementById('chatInput');
    var text = input.value.trim();
    if (!text || !CURRENT_ROOM) return;
    
    db.ref('rooms/' + SITE + '_' + CURRENT_ROOM + '/messages').push({
        nick: USER,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    });
    input.value = '';
};

document.getElementById('chatInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendChatMessage();
});

window.closeChat = function() {
    document.getElementById('chatView').classList.remove('active');
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    CURRENT_ROOM = null;
    goToGroups();
};

// ================================================================
// ЛИЧНЫЕ СООБЩЕНИЯ
// ================================================================

function openPrivateChat(targetUid) {
    if (!USER_UID) { alert('Войдите!'); return; }
    if (targetUid === USER_UID) { alert('Нельзя писать себе'); return; }
    
    var chatId = [USER_UID, targetUid].sort().join('_');
    var path = 'dms/' + SITE + '/' + chatId + '/messages';
    closeNotifications();
    CURRENT_ROOM = chatId;
    document.getElementById('chatView').classList.add('active');
    setActivePage(null);
    loadChat(path);
}

function sendPrivateMessage(targetUid) {
    var input = document.getElementById('chatInput');
    var text = input.value.trim();
    if (!text || !CURRENT_ROOM) return;
    
    var path = 'dms/' + SITE + '/' + CURRENT_ROOM + '/messages';
    var parts = CURRENT_ROOM.split('_');
    var targetUid2 = parts[0] === USER_UID ? parts[1] : parts[0];
    
    db.ref(path).push({
        nick: USER,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    });
    
    sendNotification(targetUid2, {
        type: 'message',
        from: USER_UID,
        text: USER + ': ' + text,
        timestamp: Date.now()
    });
    
    input.value = '';
}
