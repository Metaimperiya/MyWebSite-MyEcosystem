// ================================================================
// УВЕДОМЛЕНИЯ
// ================================================================

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

function loadNotifications() {
    if (!USER_UID) return;
    if (notifUnsub) { notifUnsub(); notifUnsub = null; }
    
    var ref = db.ref('sites/' + SITE + '/notifications/' + USER_UID).orderByChild('timestamp').limitToLast(20);
    notifUnsub = ref.on('value', function(snap) {
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
        
        if (document.getElementById('notificationsModal') && document.getElementById('notificationsModal').classList.contains('open')) {
            renderNotifications(notifications, keys);
        }
    });
}

function renderNotifications(notifications, keys) {
    var container = document.getElementById('notificationsList');
    if (!container) return;
    
    if (!keys.length) {
        container.innerHTML = '<div style="color:#65676b;text-align:center;padding:16px;">Нет уведомлений</div>';
        return;
    }
    
    var html = '';
    keys.slice(0, 20).forEach(function(k) {
        var n = notifications[k];
        var icon = n.type === 'friend_request' ? '🤝' : n.type === 'friend_accepted' ? '✅' : '💬';
        var time = n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        html += '<div class="notif-item ' + (n.read ? '' : 'unread') + '" onclick="handleNotifClick(\'' + k + '\', \'' + (n.fromUid || n.from) + '\', \'' + n.type + '\')"><span class="notif-icon">' + icon + '</span><div class="notif-text"><div style="font-weight:' + (n.read ? '400' : '600') + ';font-size:13px;">' + (n.text || 'Уведомление') + '</div><div class="notif-time">' + time + '</div></div>' + (n.read ? '' : '<span class="notif-dot"></span>') + '</div>';
    });
    container.innerHTML = html;
}

function handleNotifClick(notifId, fromUid, type) {
    if (!USER_UID || !fromUid) return;
    db.ref('sites/' + SITE + '/notifications/' + USER_UID + '/' + notifId + '/read').set(true);
    closeNotifications();
    viewUser(fromUid);
}

window.openNotifications = function() {
    document.getElementById('notificationsModal').classList.add('open');
    db.ref('sites/' + SITE + '/notifications/' + USER_UID).orderByChild('timestamp').limitToLast(20).once('value', function(snap) {
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

// Стили для уведомлений
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
    }
    .notif-item:hover { background: #f0f2f5; }
    .notif-item.unread { background: #e8f0fe; }
    .notif-item .notif-icon { font-size: 1.2rem; }
    .notif-item .notif-text { flex: 1; }
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
