// ================================================================
// УВЕДОМЛЕНИЯ — ИСПРАВЛЕННАЯ ВЕРСИЯ
// ================================================================

// ===== 1. ОТПРАВКА УВЕДОМЛЕНИЯ =====

function sendNotification(targetUid, data) {
    if (!USER_UID || !targetUid || targetUid === USER_UID) return;
    var ref = db.ref('sites/' + SITE + '/notifications/' + targetUid).push();
    ref.set({
        ...data,
        fromName: USER,
        fromUid: USER_UID,
        read: false,
        timestamp: Date.now()
    });
}

// ===== 2. ЗАГРУЗКА УВЕДОМЛЕНИЙ — ИСПРАВЛЕНО =====

function loadNotifications() {
    if (!USER_UID) {
        console.warn('⚠️ loadNotifications: нет USER_UID');
        return;
    }
    
    if (notifUnsub) { 
        try { notifUnsub(); } catch(e) {} 
        notifUnsub = null; 
    }
    
    var ref = db.ref('sites/' + SITE + '/notifications/' + USER_UID);
    
    notifUnsub = ref.orderByChild('timestamp').limitToLast(50).on('value', function(snap) {
        // ПРОВЕРКА: если snap нет или null
        if (!snap) {
            console.warn('⚠️ loadNotifications: snap is null');
            return;
        }
        
        var notifications = snap.val() || {};
        var keys = Object.keys(notifications).sort(function(a, b) {
            return (notifications[b].timestamp || 0) - (notifications[a].timestamp || 0);
        });
        
        var unread = keys.filter(function(k) { return !notifications[k].read; });
        var badge = document.getElementById('notifBadge');
        if (badge) {
            if (unread.length > 0) {
                badge.style.display = 'inline';
                badge.textContent = unread.length;
            } else {
                badge.style.display = 'none';
            }
        }
        
        if (document.getElementById('notificationsModal') && 
            document.getElementById('notificationsModal').classList.contains('open')) {
            renderNotifications(notifications, keys);
        }
    }, function(error) {
        console.error('❌ Ошибка загрузки уведомлений:', error);
    });
}

// ===== 3. РЕНДЕР УВЕДОМЛЕНИЙ =====

function renderNotifications(notifications, keys) {
    var container = document.getElementById('notificationsList');
    if (!container) return;
    
    if (!keys || !keys.length) {
        container.innerHTML = '<div style="color:#65676b;text-align:center;padding:16px;">Нет уведомлений</div>';
        return;
    }
    
    var html = '';
    keys.slice(0, 50).forEach(function(k) {
        var n = notifications[k];
        if (!n) return;
        
        var icon = n.type === 'friend_request' ? '🤝' : 
                   n.type === 'friend_accepted' ? '✅' : 
                   n.type === 'comment' ? '💬' : '💬';
        var time = n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        var textDisplay = n.text || 'Уведомление';
        
        var isFriendRequest = (n.type === 'friend_request' && n.fromUid && n.fromUid !== USER_UID);
        
        var actionsHtml = '';
        if (isFriendRequest) {
            var friendCheck = localStorage.getItem('fs_' + USER_UID + '_' + n.fromUid);
            if (friendCheck === 'friend') {
                actionsHtml = '<div style="display:flex;gap:4px;margin-top:4px;">';
                actionsHtml += '<span style="background:#e4e6eb;color:#555;border:none;border-radius:12px;padding:2px 10px;font-size:0.6rem;">🤝 В друзьях</span>';
                actionsHtml += '</div>';
            } else if (friendCheck === 'pending_sent') {
                actionsHtml = '<div style="display:flex;gap:4px;margin-top:4px;">';
                actionsHtml += '<span style="background:#fff3cd;color:#856404;border:none;border-radius:12px;padding:2px 10px;font-size:0.6rem;">⏳ Запрос отправлен</span>';
                actionsHtml += '</div>';
            } else {
                actionsHtml = '<div style="display:flex;gap:4px;margin-top:4px;">';
                actionsHtml += '<button onclick="event.stopPropagation();acceptFriendRequest(\'' + n.fromUid + '\');" style="background:#1877f2;color:#fff;border:none;border-radius:12px;padding:2px 10px;font-size:0.6rem;cursor:pointer;">✅ Принять</button>';
                actionsHtml += '<button onclick="event.stopPropagation();declineFriendRequest(\'' + n.fromUid + '\');" style="background:#e4e6eb;color:#555;border:none;border-radius:12px;padding:2px 10px;font-size:0.6rem;cursor:pointer;">❌ Отклонить</button>';
                actionsHtml += '</div>';
            }
        }
        
        var menuHtml = `
            <div style="position:relative;display:inline-block;margin-left:auto;flex-shrink:0;">
                <button onclick="event.stopPropagation();toggleNotifMenu('${k}')" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--muted-text);padding:0 4px;line-height:1;">⋮</button>
                <div id="notifMenu_${k}" style="display:none;position:absolute;right:0;top:24px;background:var(--card-bg);border:1px solid var(--border-color);border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.15);z-index:70;min-width:120px;padding:4px 0;">
                    <button onclick="event.stopPropagation();deleteNotification('${k}')" style="display:block;width:100%;padding:6px 14px;background:none;border:none;text-align:left;font-size:0.7rem;cursor:pointer;color:var(--danger);">🗑 Удалить</button>
                </div>
            </div>
        `;
        
        html += '<div class="notif-item ' + (n.read ? '' : 'unread') + '" onclick="handleNotifClick(\'' + k + '\', \'' + (n.fromUid || '') + '\', \'' + n.type + '\', \'' + (n.chatId || '') + '\', \'' + (n.postId || '') + '\', \'' + (n.postType || '') + '\')">';
        html += '<span class="notif-icon">' + icon + '</span>';
        html += '<div class="notif-text">';
        html += '<div style="font-weight:' + (n.read ? '400' : '600') + ';font-size:13px;">' + textDisplay + '</div>';
        html += '<div class="notif-time">' + time + '</div>';
        html += actionsHtml;
        html += '</div>';
        html += menuHtml;
        html += (n.read ? '' : '<span class="notif-dot"></span>');
        html += '</div>';
    });
    
    container.innerHTML = html;
}

// ===== 4. УДАЛЕНИЕ УВЕДОМЛЕНИЯ =====

window.deleteNotification = function(notifId) {
    if (!USER_UID) return;
    db.ref('sites/' + SITE + '/notifications/' + USER_UID + '/' + notifId).remove();
    var menu = document.getElementById('notifMenu_' + notifId);
    if (menu) menu.style.display = 'none';
};

// ===== 5. ТОГГЛ МЕНЮ =====

window.toggleNotifMenu = function(notifId) {
    var menu = document.getElementById('notifMenu_' + notifId);
    if (!menu) return;
    
    document.querySelectorAll('.notif-item .dropdown-menu').forEach(function(el) {
        if (el.id !== 'notifMenu_' + notifId) el.style.display = 'none';
    });
    
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('.notif-item')) {
        document.querySelectorAll('.notif-item .dropdown-menu').forEach(function(el) {
            el.style.display = 'none';
        });
    }
});

// ===== 6. ОБРАБОТКА КЛИКА =====

function handleNotifClick(notifId, fromUid, type, chatId, postId, postType) {
    if (!USER_UID || !fromUid) return;
    
    db.ref('sites/' + SITE + '/notifications/' + USER_UID + '/' + notifId + '/read').set(true);
    closeNotifications();
    
    if (type === 'comment') {
        if (postId) {
            openPostPage(postId, postType || 'feed');
        } else {
            viewUser(fromUid);
        }
        return;
    }
    
    if (type === 'message') {
        if (document.getElementById('chatView').classList.contains('active')) {
            document.getElementById('chatView').classList.remove('active');
            if (chatUnsub) {
                if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
                chatUnsub = null;
            }
            CURRENT_ROOM = null;
        }
        openPrivateChat(fromUid);
        return;
    }
    
    if (type === 'friend_request' || type === 'friend_accepted') {
        viewUser(fromUid);
        setTimeout(function() {
            updateFriendButton(fromUid);
        }, 500);
        return;
    }
    
    viewUser(fromUid);
}

// ===== 7. ОТКРЫТИЕ/ЗАКРЫТИЕ =====

window.openNotifications = function() {
    if (!USER_UID) { alert('Войдите!'); return; }
    document.getElementById('notificationsModal').classList.add('open');
    loadNotifications();
};

window.closeNotifications = function() {
    document.getElementById('notificationsModal').classList.remove('open');
};

// ===== 8. СТИЛИ =====

(function addNotifStyles() {
    var style = document.createElement('style');
    style.textContent = `
        .notif-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 10px;
            border-bottom: 1px solid #eee;
            cursor: pointer;
            transition: 0.15s;
            position: relative;
        }
        .notif-item:hover { background: #f0f2f5; }
        .notif-item.unread { background: #e8f0fe; }
        .notif-item .notif-icon { font-size: 1.2rem; flex-shrink: 0; }
        .notif-item .notif-text { flex: 1; min-width: 0; }
        .notif-item .notif-time { font-size: 0.55rem; color: #999; }
        .notif-item .notif-dot {
            width: 8px;
            height: 8px;
            background: #1877f2;
            border-radius: 50%;
            flex-shrink: 0;
        }
    `;
    document.head.appendChild(style);
})();

// ===== 9. ЭКСПОРТ =====

window.loadNotifications = loadNotifications;
window.openNotifications = openNotifications;
window.closeNotifications = closeNotifications;
window.deleteNotification = deleteNotification;
window.toggleNotifMenu = toggleNotifMenu;
window.sendNotification = sendNotification;
