// ================================================================
// ЧАТ — ПОЛНАЯ ВЕРСИЯ С УДАЛЕНИЕМ
// ================================================================

function loadChat(path) {
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    
    var box = document.getElementById('chatMessages');
    if (!box) return;
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
            var msgId = s.key;
            var div = document.createElement('div');
            div.className = 'msg';
            div.dataset.id = msgId;
            
            var isMy = (m.nick === USER);
            var canDelete = isMy || isAdmin;
            
            var menuHtml = '';
            if (canDelete) {
                menuHtml = '<span class="msg-menu" onclick="toggleMsgMenu(\'' + msgId + '\', event)">⋮</span>';
                menuHtml += '<div class="msg-dropdown" id="msgMenu_' + msgId + '" style="display:none;position:absolute;right:0;top:20px;background:var(--card-bg);border:1px solid var(--border-color);border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.15);z-index:60;min-width:120px;padding:4px 0;">';
                menuHtml += '<button class="del-btn" onclick="deleteMessage(\'' + path + '\', \'' + msgId + '\')" style="display:block;width:100%;padding:4px 12px;background:none;border:none;text-align:left;font-size:0.7rem;cursor:pointer;color:var(--danger);">🗑 Удалить</button>';
                menuHtml += '</div>';
            }
            
            div.innerHTML = '<span class="author">' + esc(m.nick || '?') + '</span><span class="time">' + (m.time || '') + '</span>' + menuHtml + '<div class="msg-text">' + esc(m.text || '') + '</div>';
            box.appendChild(div);
        });
        box.scrollTop = box.scrollHeight;
    });
}

window.toggleMsgMenu = function(msgId, event) {
    if (event) event.stopPropagation();
    var menu = document.getElementById('msgMenu_' + msgId);
    if (!menu) return;
    
    document.querySelectorAll('.msg-dropdown').forEach(function(el) {
        if (el.id !== 'msgMenu_' + msgId) el.style.display = 'none';
    });
    
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
};

window.deleteMessage = function(path, msgId) {
    if (!confirm('🗑 Удалить сообщение?')) return;
    db.ref(path + '/' + msgId).remove();
    var menu = document.getElementById('msgMenu_' + msgId);
    if (menu) menu.style.display = 'none';
};

// Закрываем меню при клике вне
document.addEventListener('click', function(e) {
    if (!e.target.closest('.msg')) {
        document.querySelectorAll('.msg-dropdown').forEach(function(el) {
            el.style.display = 'none';
        });
    }
});

window.sendChatMessage = function() {
    var input = document.getElementById('chatInput');
    if (!input) return;
    var text = input.value.trim();
    if (!text || !CURRENT_ROOM) return;
    
    var path = '';
    var targetUid = '';
    
    if (CURRENT_ROOM.includes('_')) {
        path = 'dms/' + SITE + '/' + CURRENT_ROOM + '/messages';
        var parts = CURRENT_ROOM.split('_');
        targetUid = parts[0] === USER_UID ? parts[1] : parts[0];
    } else {
        path = 'rooms/' + SITE + '_' + CURRENT_ROOM + '/messages';
    }
    
    db.ref(path).push({
        nick: USER,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    });
    
    if (targetUid) {
        sendNotification(targetUid, {
            type: 'message',
            from: USER_UID,
            text: USER + ': ' + text,
            timestamp: Date.now()
        });
    }
    
    input.value = '';
};

document.addEventListener('DOMContentLoaded', function() {
    var chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') window.sendChatMessage();
        });
    }
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

window.openPrivateChat = function(targetUid) {
    if (!USER_UID) { alert('Войдите!'); return; }
    if (targetUid === USER_UID) { alert('Нельзя писать себе'); return; }
    
    var chatId = [USER_UID, targetUid].sort().join('_');
    var path = 'dms/' + SITE + '/' + chatId + '/messages';
    closeNotifications();
    CURRENT_ROOM = chatId;
    document.getElementById('chatView').classList.add('active');
    setActivePage(null);
    loadChat(path);
};