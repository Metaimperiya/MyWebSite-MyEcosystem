// ================================================================ */
// ЧАТ — С РАЗДЕЛЕНИЕМ СООБЩЕНИЙ (СЛЕВА/СПРАВА) И УВЕДОМЛЕНИЯМИ
// ================================================================ */

var dmUnreadRef = null;

function getDirectChatTargetUid() {
    if (!CURRENT_ROOM || CURRENT_ROOM.indexOf('_') === -1 || !USER_UID) return null;
    var parts = CURRENT_ROOM.split('_');
    if (parts.length !== 2) return null;
    return parts[0] === USER_UID ? parts[1] : (parts[1] === USER_UID ? parts[0] : null);
}

function updateChatReportButton() {
    var button = document.getElementById('chatReportBtn');
    if (!button) return;
    button.hidden = !getDirectChatTargetUid();
}

function isUnreadDirectMessage(message) {
    return message && message.senderUid && message.senderUid !== USER_UID &&
        (!message.readBy || message.readBy[USER_UID] !== true);
}

function updateChatUnreadBadge(count) {
    var badge = document.getElementById('chatUnreadBadge');
    if (!badge) return;
    badge.hidden = !count;
    badge.textContent = count > 99 ? '99+' : count;
}

function markDirectMessagesRead(path, messages) {
    if (!USER_UID || !messages) return;
    var updates = {};
    Object.keys(messages).forEach(function(id) {
        if (isUnreadDirectMessage(messages[id])) updates[id + '/readBy/' + USER_UID] = true;
    });
    if (Object.keys(updates).length) db.ref(path).update(updates);
}

function markChatNotificationsRead(chatId) {
    if (!USER_UID || !chatId) return;
    db.ref('sites/' + SITE + '/notifications/' + USER_UID).orderByChild('chatId').equalTo(chatId).once('value', function(snap) {
        var updates = {};
        snap.forEach(function(item) {
            if (item.val().type === 'message' && !item.val().read) updates[item.key + '/read'] = true;
        });
        if (Object.keys(updates).length) db.ref('sites/' + SITE + '/notifications/' + USER_UID).update(updates);
    });
}

window.startDirectMessageUnreadTracking = function() {
    if (dmUnreadRef) {
        dmUnreadRef.off('value');
        dmUnreadRef = null;
    }
    if (!USER_UID) return updateChatUnreadBadge(0);

    dmUnreadRef = db.ref('dms/' + SITE);
    dmUnreadRef.on('value', function(snap) {
        var count = 0;
        snap.forEach(function(chatSnap) {
            var chatId = chatSnap.key || '';
            if (chatId.split('_').indexOf(USER_UID) === -1) return;
            chatSnap.child('messages').forEach(function(messageSnap) {
                if (isUnreadDirectMessage(messageSnap.val())) count++;
            });
        });
        updateChatUnreadBadge(count);
    });
};

function loadChat(path) {
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }

    var box = document.getElementById('chatMessages');
    if (!box) return;
    box.innerHTML = '<div style="color:#bbb;text-align:center;padding:6px;font-size:0.65rem;">⏳ Загрузка...</div>';
    chatUnsub = path;
    updateChatReportButton();

    // Индикатор набора текста является необязательным модулем. Раньше здесь
    // вызывалась несуществующая функция setupTypingIndicator(), из-за чего
    // чат останавливался на «Загрузка…» ещё до подключения к сообщениям.
    if (CURRENT_ROOM && CURRENT_ROOM.includes('_') && typeof window.setupTypingIndicator === 'function') {
        window.setupTypingIndicator(CURRENT_ROOM);
    }

    db.ref(path).orderByChild('timestamp').on('value', function(snap) {
        box.innerHTML = '';
        if (!snap.exists()) {
            box.innerHTML = '<div style="color:#bbb;text-align:center;padding:6px;font-size:0.65rem;">Сообщений нет</div>';
            return;
        }

        var messages = snap.val() || {};
        markDirectMessagesRead(path, messages);
        snap.forEach(function(s) {
            var m = s.val();
            var msgId = s.key;
            var div = document.createElement('div');
            div.className = 'msg';
            div.dataset.id = msgId;

            var isMy = (m.nick === USER);
            var canDelete = isMy || isAdmin;

            // 👇 РАЗДЕЛЯЕМ СООБЩЕНИЯ: СВОИ СПРАВА, ЧУЖИЕ СЛЕВА
            div.style.display = 'flex';
            div.style.flexDirection = 'column';
            div.style.alignItems = isMy ? 'flex-end' : 'flex-start';
            div.style.marginBottom = '6px';
            div.style.width = '100%';

            var menuHtml = '';
            if (canDelete) {
                menuHtml = '<span class="msg-menu" onclick="toggleMsgMenu(\'' + msgId + '\', event)" style="position:absolute;right:6px;top:2px;cursor:pointer;color:var(--muted-text);font-size:0.8rem;padding:0 4px;z-index:5;">⋮</span>';
                menuHtml += '<div class="msg-dropdown" id="msgMenu_' + msgId + '" style="display:none;position:absolute;right:0;top:18px;background:var(--card-bg);border:1px solid var(--border-color);border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.15);z-index:60;min-width:120px;padding:4px 0;">';
                menuHtml += '<button class="del-btn" onclick="deleteMessage(\'' + path + '\', \'' + msgId + '\')" style="display:block;width:100%;padding:4px 12px;background:none;border:none;text-align:left;font-size:0.7rem;cursor:pointer;color:var(--danger);">🗑 Удалить</button>';
                menuHtml += '</div>';
            }

            var bubbleStyle = isMy
                ? 'background:var(--link-color);color:#fff;border-radius:16px 16px 4px 16px;padding:6px 12px;max-width:80%;word-break:break-word;position:relative;'
                : 'background:var(--input-bg);color:var(--text-color);border-radius:16px 16px 16px 4px;padding:6px 12px;max-width:80%;word-break:break-word;position:relative;';

            var authorStyle = isMy
                ? 'font-size:0.55rem;color:rgba(255,255,255,0.7);margin-bottom:1px;'
                : 'font-size:0.55rem;color:var(--link-color);font-weight:600;margin-bottom:1px;';

            div.innerHTML = `
                <div style="${bubbleStyle}">
                    ${menuHtml}
                    <div style="${authorStyle}">${esc(m.nick || '?')}</div>
                    <div style="font-size:0.75rem;line-height:1.4;">${esc(m.text || '')}</div>
                    <div style="font-size:0.45rem;text-align:right;margin-top:2px;opacity:0.7;${isMy ? 'color:rgba(255,255,255,0.6);' : 'color:var(--muted-text);'}">${m.time || ''}</div>
                </div>
            `;
            box.appendChild(div);
        });
        box.scrollTop = box.scrollHeight;
    }, function(error) {
        console.error('Не удалось загрузить сообщения:', error);
        box.innerHTML = '<div style="color:#b91c1c;text-align:center;padding:10px;font-size:0.75rem;">Не удалось загрузить сообщения. Обновите страницу или войдите заново.</div>';
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
    var chatId = CURRENT_ROOM;

    if (CURRENT_ROOM.includes('_')) {
        path = 'dms/' + SITE + '/' + CURRENT_ROOM + '/messages';
        var parts = CURRENT_ROOM.split('_');
        targetUid = parts[0] === USER_UID ? parts[1] : parts[0];
    } else {
        path = 'rooms/' + SITE + '_' + CURRENT_ROOM + '/messages';
    }

    var moderationPaths = ['sites/' + SITE + '/moderation_blocks/' + USER_UID];
    if (targetUid) moderationPaths.push('sites/' + SITE + '/moderation_blocks/' + targetUid);

    Promise.all(moderationPaths.map(function(blockPath) { return db.ref(blockPath).once('value'); })).then(function(blocks) {
        if (blocks.some(function(snap) { return snap.exists(); })) {
            alert('Отправка сообщений недоступна: один из участников заблокирован администрацией.');
            return;
        }

        return db.ref(path).push({
            nick: USER,
            senderUid: USER_UID,
            recipientUid: targetUid || null,
            text: text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        }).then(function() {
            if (targetUid) {
                sendNotification(targetUid, {
                    type: 'message',
                    from: USER_UID,
                    text: USER + ': ' + text,
                    chatId: CURRENT_ROOM,
                    timestamp: Date.now()
                });
            }
            input.value = '';
        });
    }).catch(function(error) {
        console.error('Не удалось отправить сообщение:', error);
        alert('Не удалось отправить сообщение. Попробуйте ещё раз.');
    });
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
    updateChatReportButton();
    openChatList();
};

window.openPrivateChat = function(targetUid) {
    if (!USER_UID) { alert('Войдите!'); return; }
    if (targetUid === USER_UID) { alert('Нельзя писать себе'); return; }

    Promise.all([
        db.ref('sites/' + SITE + '/blocks/' + USER_UID + '/' + targetUid).once('value'),
        db.ref('sites/' + SITE + '/moderation_blocks/' + USER_UID).once('value'),
        db.ref('sites/' + SITE + '/moderation_blocks/' + targetUid).once('value')
    ]).then(function(snaps) {
        if (snaps.some(function(snap) { return snap.exists(); })) {
            alert('Невозможно открыть диалог: один из пользователей заблокирован.');
            return;
        }

        var chatId = [USER_UID, targetUid].sort().join('_');
        var path = 'dms/' + SITE + '/' + chatId + '/messages';
        closeNotifications();
        markChatNotificationsRead(chatId);
        CURRENT_ROOM = chatId;
        document.getElementById('chatView').classList.add('active');
        setActivePage(null);
        loadChat(path);
    });
};

window.openChatReport = function() {
    var targetUid = getDirectChatTargetUid();
    if (!USER_UID || !targetUid) {
        alert('Жалобу можно отправить только из личного диалога.');
        return;
    }
    document.getElementById('reportReason').value = 'spam';
    document.getElementById('reportDetails').value = '';
    document.getElementById('chatReportModal').classList.add('open');
};

window.closeChatReport = function() {
    document.getElementById('chatReportModal').classList.remove('open');
};

window.submitChatReport = function() {
    var targetUid = getDirectChatTargetUid();
    if (!USER_UID || !targetUid) return;

    var details = document.getElementById('reportDetails').value.trim();
    var report = {
        reporterUid: USER_UID,
        reportedUid: targetUid,
        chatId: CURRENT_ROOM,
        reason: document.getElementById('reportReason').value,
        details: details.slice(0, 1000),
        status: 'new',
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    db.ref('sites/' + SITE + '/chat_reports').push(report).then(function() {
        closeChatReport();
        alert('Спасибо. Жалоба отправлена администратору на рассмотрение.');
    }).catch(function(error) {
        console.error('Не удалось отправить жалобу:', error);
        alert('Не удалось отправить жалобу. Попробуйте ещё раз.');
    });
};
