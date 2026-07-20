// ================================================================
// СИСТЕМА УВЕДОМЛЕНИЙ — ПОЛНАЯ ВЕРСИЯ С ГЛОБАЛЬНОЙ sendNotification
// ================================================================

(function() {
    'use strict';

    var notifUnsub_Notif = null;

    // ================================================================
    // ОТПРАВКА УВЕДОМЛЕНИЙ — ГЛОБАЛЬНАЯ
    // ================================================================

    window.sendNotification = function(targetUid, data) {
        if (!USER_UID || !targetUid || targetUid === USER_UID) {
            console.log('⏭️ Уведомление пропущено (себе или нет пользователя)');
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
    };

    // ================================================================
    // ЗАГРУЗКА УВЕДОМЛЕНИЙ
    // ================================================================

    function loadNotifications() {
        if (!USER_UID) return;
        
        if (notifUnsub_Notif) {
            try { notifUnsub_Notif(); } catch(e) {}
            notifUnsub_Notif = null;
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
        
        notifUnsub_Notif = ref.on('value', callback);
    }

    // ================================================================
    // ОБНОВЛЕНИЕ БЕЙДЖА
    // ================================================================

    function updateNotificationBadge(count) {
        var badge = document.getElementById('notifBadge');
        if (!badge) return;
        
        if (count > 0) {
            badge.style.display = 'inline';
            badge.textContent = count;
        } else {
            badge.style.display = 'none';
        }
    }

    // ================================================================
    // РЕНДЕР УВЕДОМЛЕНИЙ
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
            var time = formatNotifTime(n.timestamp);
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
                }
            }

            html += `
                <div class="notif-item ${isUnread ? 'unread' : ''}" 
                     onclick="handleNotificationClick('${k}')" 
                     style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid var(--border-color);cursor:pointer;transition:0.15s;position:relative;
                            ${isUnread ? 'background:#e8f0fe;' : ''}">
                    <span class="notif-icon" style="font-size:1.2rem;flex-shrink:0;">${icon}</span>
                    <div class="notif-text" style="flex:1;min-width:0;">
                        <div style="font-weight:${isUnread ? '600' : '400'};font-size:0.8rem;color:var(--text-color);">${textDisplay}</div>
                        <div style="font-size:0.55rem;color:var(--muted-text);margin-top:2px;">${time}</div>
                        ${actionsHtml}
                    </div>
                    ${isUnread ? '<span class="notif-dot" style="width:8px;height:8px;background:#1877f2;border-radius:50%;flex-shrink:0;"></span>' : ''}
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // ================================================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
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
            case 'message': return '💬 ' + text;
            case 'friend_request': return '🤝 ' + text;
            case 'friend_accepted': return '✅ ' + text;
            case 'comment': return '💬 ' + text;
            case 'like': return '👍 ' + text;
            case 'repost': return '🔄 ' + text;
            default: return text;
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

    function handleNotificationClick(key) {
        markNotificationRead(key);
        console.log('📬 Клик по уведомлению:', key);
    }

    function markNotificationRead(key) {
        if (!USER_UID || !key) return;
        db.ref('sites/' + SITE + '/notifications/' + USER_UID + '/' + key + '/read').set(true);
    }

    // ================================================================
    // ПУБЛИЧНЫЕ ФУНКЦИИ
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

    window.updateNotifBadge = function() {
        if (!USER_UID) {
            var badge = document.getElementById('notifBadge');
            if (badge) badge.style.display = 'none';
            return;
        }
        
        db.ref('sites/' + SITE + '/notifications/' + USER_UID)
            .orderByChild('read').equalTo(false)
            .once('value', function(snap) {
                updateNotificationBadge(snap.numChildren());
            });
    };

    // ================================================================
    // ИНИЦИАЛИЗАЦИЯ
    // ================================================================

    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            if (USER_UID) {
                loadNotifications();
            }
        }, 1000);
    });

    setInterval(function() {
        if (typeof window.updateNotifBadge === 'function') {
            window.updateNotifBadge();
        }
    }, 10000);

    console.log('✅ notifications.js загружен (фикс)');

})();
