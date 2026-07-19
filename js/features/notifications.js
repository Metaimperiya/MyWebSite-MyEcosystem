// ================================================================
// СИСТЕМА УВЕДОМЛЕНИЙ — ИСПРАВЛЕННАЯ ВЕРСИЯ
// ================================================================

// ===== БЕЗОПАСНОЕ ОБЪЯВЛЕНИЕ ПЕРЕМЕННЫХ =====
if (typeof window.notifUnsub === 'undefined') {
    window.notifUnsub = null;
    window.notificationListeners = {};
}

var notifUnsub = window.notifUnsub;
var notificationListeners = window.notificationListeners;

// ================================================================
// 1. ОТПРАВКА УВЕДОМЛЕНИЙ
// ================================================================

function sendNotification(targetUid, data) {
    if (!USER_UID || !targetUid || targetUid === USER_UID) {
        console.log('⏭️ Уведомление пропущено');
        return;
    }

    var ref = db.ref('sites/' + SITE + '/notifications/' + targetUid);
    
    ref.orderByChild('timestamp').limitToLast(10).once('value', function(snap) {
        var notifications = snap.val() || {};
        var isDuplicate = false;
        
        Object.keys(notifications).forEach(function(key) {
            var n = notifications[key];
            if (n.type === data.type && 
                n.fromUid === data.fromUid && 
                n.postId === data.postId &&
                (Date.now() - n.timestamp) < 5000) {
                isDuplicate = true;
            }
        });
        
        if (isDuplicate) {
            console.log('⏭️ Уведомление пропущено (дубликат)');
            return;
        }
        
        var newRef = db.ref('sites/' + SITE + '/notifications/' + targetUid).push();
        newRef.set({
            type: data.type,
            from: data.from || USER,
            fromUid: data.fromUid || USER_UID,
            text: data.text || '',
            postId: data.postId || null,
            postType: data.postType || null,
            chatId: data.chatId || null,
            commentId: data.commentId || null,
            replyTo: data.replyTo || null,
            read: false,
            timestamp: Date.now()
        });
        
        console.log('✅ Уведомление отправлено:', data.type, 'для', targetUid);
    });
}

// ================================================================
// 2. ЗАГРУЗКА УВЕДОМЛЕНИЙ
// ================================================================

function loadNotifications() {
    if (!USER_UID) {
        console.warn('⚠️ Нет пользователя для загрузки уведомлений');
        return;
    }
    
    if (notifUnsub) {
        try { notifUnsub(); } catch(e) {}
        notifUnsub = null;
    }

    var ref = db.ref('sites/' + SITE + '/notifications/' + USER_UID);
    var callback = function(snap) {
        var notifications = snap.val() || {};
        var keys = Object.keys(notifications).sort(function(a, b) {
            return (notifications[b].timestamp || 0) - (notifications[a].timestamp || 0);
        });

        var unread = keys.filter(function(k) { return !notifications[k].read; });
        updateNotificationBadge(unread.length);

        if (document.getElementById('notificationsModal') && 
            document.getElementById('notificationsModal').classList.contains('open')) {
            renderNotifications(notifications, keys);
        }
    };
    
    notifUnsub = ref.on('value', callback);
}

// ================================================================
// 3. ОБНОВЛЕНИЕ БЕЙДЖА
// ================================================================

function updateNotificationBadge(count) {
    var badge = document.getElementById('notifBadge');
    if (!badge) return;
    
    if (count > 0) {
        badge.style.display = 'inline';
        badge.textContent = count;
        badge.style.background = '#e74c3c';
        badge.style.color = '#fff';
        badge.style.borderRadius = '50%';
        badge.style.padding = '0 4px';
        badge.style.fontSize = '0.45rem';
        badge.style.fontWeight = '700';
        badge.style.position = 'absolute';
        badge.style.top = '-2px';
        badge.style.right = '-2px';
        badge.style.minWidth = '16px';
        badge.style.height = '16px';
        badge.style.lineHeight = '16px';
        badge.style.textAlign = 'center';
        badge.style.border = '2px solid var(--card-bg)';
    } else {
        badge.style.display = 'none';
    }
}

// ================================================================
// 4. РЕНДЕР УВЕДОМЛЕНИЙ
// ================================================================

function renderNotifications(notifications, keys) {
    var container = document.getElementById('notificationsList');
    if (!container) return;

    if (!keys || !keys.length) {
        container.innerHTML = '<div style="color:#65676b;text-align:center;padding:16px;font-size:0.8rem;">📭 Нет уведомлений</div>';
        return;
    }

    var html = '';
    var maxDisplay = 50;
    
    keys.slice(0, maxDisplay).forEach(function(k) {
        var n = notifications[k];
        if (!n) return;
        
        var icon = getNotificationIcon(n.type);
        var time = n.timestamp ? formatNotifTime(n.timestamp) : '';
        var textDisplay = formatNotificationText(n);
        var isUnread = !n.read;
        
        var actionsHtml = '';
        if (n.type === 'friend_request' && n.fromUid && n.fromUid !== USER_UID) {
            var friendStatus = localStorage.getItem('fs_' + USER_UID + '_' + n.fromUid);
            if (friendStatus !== 'friend' && friendStatus !== 'pending_sent') {
                actionsHtml = `
                    <div style="display:flex;gap:4px;margin-top:4px;">
                        <button onclick="event.stopPropagation();acceptFriendRequest('${n.fromUid}');" 
                                style="background:#1877f2;color:#fff;border:none;border-radius:12px;padding:2px 10px;font-size:0.6rem;cursor:pointer;">
                            ✅ Принять
                        </button>
                        <button onclick="event.stopPropagation();declineFriendRequest('${n.fromUid}');" 
                                style="background:#e4e6eb;color:#555;border:none;border-radius:12px;padding:2px 10px;font-size:0.6rem;cursor:pointer;">
                            ❌ Отклонить
                        </button>
                    </div>
                `;
            } else if (friendStatus === 'friend') {
                actionsHtml = `<div style="margin-top:4px;"><span style="background:#e4e6eb;color:#555;border:none;border-radius:12px;padding:2px 10px;font-size:0.6rem;">🤝 В друзьях</span></div>`;
            }
        }

        var menuHtml = `
            <div style="position:relative;display:inline-block;margin-left:auto;flex-shrink:0;">
                <button onclick="event.stopPropagation();toggleNotifMenu('${k}')" 
                        style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--muted-text);padding:0 4px;line-height:1;">
                    ⋮
                </button>
                <div id="notifMenu_${k}" class="dropdown-menu" style="display:none;position:absolute;right:0;top:24px;background:var(--card-bg);border:1px solid var(--border-color);border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.15);z-index:70;min-width:120px;padding:4px 0;">
                    <button class="del-btn" onclick="event.stopPropagation();deleteNotification('${k}')" 
                            style="display:block;width:100%;padding:6px 14px;background:none;border:none;text-align:left;font-size:0.7rem;cursor:pointer;color:var(--danger);">
                        🗑 Удалить
                    </button>
                    <button onclick="event.stopPropagation();markNotificationRead('${k}')" 
                            style="display:block;width:100%;padding:6px 14px;background:none;border:none;text-align:left;font-size:0.7rem;cursor:pointer;color:var(--text-secondary);">
                        ✅ Прочитано
                    </button>
                </div>
            </div>
        `;

        var clickHandler = buildNotificationClickHandler(n, k);

        html += `
            <div class="notif-item ${isUnread ? 'unread' : ''}" 
                 onclick="${clickHandler}" 
                 style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid var(--border-color);cursor:pointer;transition:0.15s;position:relative;
                        ${isUnread ? 'background:#e8f0fe;' : ''}">
                <span class="notif-icon" style="font-size:1.2rem;flex-shrink:0;">${icon}</span>
                <div class="notif-text" style="flex:1;min-width:0;">
                    <div style="font-weight:${isUnread ? '600' : '400'};font-size:0.8rem;color:var(--text-color);">${textDisplay}</div>
                    <div style="font-size:0.55rem;color:var(--muted-text);margin-top:2px;">${time}</div>
                    ${actionsHtml}
                </div>
                ${menuHtml}
                ${isUnread ? '<span class="notif-dot" style="width:8px;height:8px;background:#1877f2;border-radius:50%;flex-shrink:0;"></span>' : ''}
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// 5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ================================================================

function getNotificationIcon(type) {
    var icons = {
        'message': '💬',
        'friend_request': '🤝',
        'friend_accepted': '✅',
        'comment': '💬',
        'like': '👍',
        'repost': '🔄',
        'subscribe': '👤',
        'mention': '@'
    };
    return icons[type] || '📢';
}

function formatNotificationText(n) {
    var text = n.text || '';
    
    switch(n.type) {
        case 'message':
            return '💬 ' + text;
        case 'friend_request':
            return '🤝 ' + text;
        case 'friend_accepted':
            return '✅ ' + text;
        case 'comment':
            return '💬 ' + text;
        case 'like':
            return '👍 ' + text;
        case 'repost':
            return '🔄 ' + text;
        case 'subscribe':
            return '👤 ' + text;
        case 'mention':
            return '@ ' + text;
        default:
            return text;
    }
}

function formatNotifTime(timestamp) {
    if (!timestamp) return '';
    var diff = Date.now() - timestamp;
    
    if (diff < 60000) return 'Только что';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' мин.';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' ч.';
    if (diff < 604800000) return Math.floor(diff / 86400000) + ' дн.';
    
    var date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function buildNotificationClickHandler(n, key) {
    var actions = {
        'message': function() {
            if (n.chatId) {
                closeNotifications();
                openPrivateChat(n.fromUid);
            }
        },
        'friend_request': function() {
            closeNotifications();
            viewUser(n.fromUid);
        },
        'friend_accepted': function() {
            closeNotifications();
            viewUser(n.fromUid);
        },
        'comment': function() {
            closeNotifications();
            if (n.postId) {
                openPostPage(n.postId, n.postType || 'feed');
            } else {
                viewUser(n.fromUid);
            }
        },
        'like': function() {
            closeNotifications();
            if (n.postId) {
                openPostPage(n.postId, n.postType || 'feed');
            } else {
                viewUser(n.fromUid);
            }
        },
        'repost': function() {
            closeNotifications();
            if (n.postId) {
                openPostPage(n.postId, n.postType || 'feed');
            } else {
                viewUser(n.fromUid);
            }
        },
        'subscribe': function() {
            closeNotifications();
            viewUser(n.fromUid);
        },
        'mention': function() {
            closeNotifications();
            if (n.postId) {
                openPostPage(n.postId, n.postType || 'feed');
            } else {
                viewUser(n.fromUid);
            }
        }
    };
    
    var handler = actions[n.type] || function() {
        closeNotifications();
        if (n.fromUid) viewUser(n.fromUid);
    };
    
    return function() {
        markNotificationRead(key);
        handler();
    };
}

// ================================================================
// 6. УПРАВЛЕНИЕ УВЕДОМЛЕНИЯМИ
// ================================================================

window.toggleNotifMenu = function(key) {
    var menu = document.getElementById('notifMenu_' + key);
    if (!menu) return;
    
    document.querySelectorAll('.dropdown-menu').forEach(function(el) {
        if (el.id !== 'notifMenu_' + key) {
            el.style.display = 'none';
        }
    });
    
    menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
};

function markNotificationRead(key) {
    if (!USER_UID || !key) return;
    db.ref('sites/' + SITE + '/notifications/' + USER_UID + '/' + key + '/read').set(true);
}

function deleteNotification(key) {
    if (!USER_UID || !key) return;
    if (!confirm('🗑 Удалить уведомление?')) return;
    db.ref('sites/' + SITE + '/notifications/' + USER_UID + '/' + key).remove();
    var menu = document.getElementById('notifMenu_' + key);
    if (menu) menu.style.display = 'none';
}

function markAllNotificationsRead() {
    if (!USER_UID) return;
    if (!confirm('Отметить все уведомления как прочитанные?')) return;
    
    db.ref('sites/' + SITE + '/notifications/' + USER_UID).once('value', function(snap) {
        var notifications = snap.val() || {};
        var updates = {};
        Object.keys(notifications).forEach(function(key) {
            if (!notifications[key].read) {
                updates[key + '/read'] = true;
            }
        });
        if (Object.keys(updates).length > 0) {
            db.ref('sites/' + SITE + '/notifications/' + USER_UID).update(updates);
        }
    });
}

// ================================================================
// 7. ОТКРЫТИЕ/ЗАКРЫТИЕ МОДАЛКИ
// ================================================================

window.openNotifications = function() {
    if (!USER_UID) {
        alert('Войдите!');
        return;
    }
    document.getElementById('notificationsModal').classList.add('open');
    
    db.ref('sites/' + SITE + '/notifications/' + USER_UID)
        .orderByChild('timestamp').limitToLast(50)
        .once('value', function(snap) {
            var notifications = snap.val() || {};
            var keys = Object.keys(notifications).sort(function(a, b) {
                return (notifications[b].timestamp || 0) - (notifications[a].timestamp || 0);
            });
            renderNotifications(notifications, keys);
        });
};

window.closeNotifications = function() {
    document.getElementById('notificationsModal').classList.remove('open');
};

// ================================================================
// 8. ОБРАБОТЧИКИ СОБЫТИЙ
// ================================================================

document.addEventListener('click', function(e) {
    if (!e.target.closest('.notif-item')) {
        document.querySelectorAll('.dropdown-menu').forEach(function(el) {
            el.style.display = 'none';
        });
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeNotifications();
    }
});

// ================================================================
// 9. СТИЛИ
// ================================================================

(function addNotificationStyles() {
    var style = document.createElement('style');
    style.textContent = `
        .notif-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 10px;
            border-bottom: 1px solid var(--border-color);
            cursor: pointer;
            transition: 0.15s;
            position: relative;
        }
        .notif-item:hover { background: var(--input-bg); }
        .notif-item.unread { background: #e8f0fe; }
        .notif-item .notif-icon { font-size: 1.2rem; flex-shrink: 0; }
        .notif-item .notif-text { flex: 1; min-width: 0; }
        .notif-item .notif-dot {
            width: 8px;
            height: 8px;
            background: #1877f2;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .dropdown-menu {
            display: none;
            position: absolute;
            right: 0;
            top: 24px;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.15);
            z-index: 70;
            min-width: 120px;
            padding: 4px 0;
        }
        .dropdown-menu.open { display: block; }
        .dropdown-menu button {
            display: block;
            width: 100%;
            padding: 6px 14px;
            background: none;
            border: none;
            text-align: left;
            font-size: 0.7rem;
            cursor: pointer;
            color: var(--text-secondary);
            transition: 0.15s;
        }
        .dropdown-menu button:hover { background: var(--input-bg); }
        .dropdown-menu .del-btn { color: var(--danger); }
        .dropdown-menu .del-btn:hover { background: var(--danger-bg); }
    `;
    document.head.appendChild(style);
})();

console.log('✅ Система уведомлений загружена!');
