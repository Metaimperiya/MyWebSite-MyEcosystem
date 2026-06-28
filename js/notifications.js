function sendNotification(targetUid, data) {
    if (!USER_UID || !targetUid || targetUid === USER_UID) return;
    const ref = db.ref('sites/' + SITE + '/notifications/' + targetUid).push();
    ref.set({ ...data, fromName: USER, fromUid: USER_UID, read: false });
}

function loadNotifications() {
    if (!USER_UID) return;
    if (notifUnsub) { notifUnsub(); notifUnsub = null; }
    const ref = db.ref('sites/' + SITE + '/notifications/' + USER_UID).orderByChild('timestamp').limitToLast(20);
    notifUnsub = ref.on('value', snap => {
        const notifications = snap.val() || {};
        const keys = Object.keys(notifications).sort((a, b) => (notifications[b].timestamp || 0) - (notifications[a].timestamp || 0));
        const unread = keys.filter(k => !notifications[k].read);
        const badge = document.getElementById('notifBadge');
        if (badge) {
            if (unread.length > 0) {
                badge.style.display = 'inline';
                badge.textContent = unread.length;
            } else {
                badge.style.display = 'none';
            }
        }
        if (document.getElementById('notificationsModal').classList.contains('open')) {
            renderNotifications(notifications, keys);
        }
    });
}

function renderNotifications(notifications, keys) {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    if (!keys.length) {
        container.innerHTML = '<div style="color:#65676b;text-align:center;padding:16px;">Нет уведомлений</div>';
        return;
    }
    let html = '';
    keys.slice(0, 20).forEach(k => {
        const n = notifications[k];
        const icon = n.type === 'friend_request' ? '🤝' : n.type === 'friend_accepted' ? '✅' : '💬';
        const time = n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        html += `
            <div class="notif-item ${n.read ? '' : 'unread'}" onclick="handleNotifClick('${k}', '${n.fromUid || n.from}', '${n.type}')">
                <span class="notif-icon">${icon}</span>
                <div class="notif-text"><div style="font-weight:${n.read ? '400' : '600'};font-size:13px;">${n.text || 'Уведомление'}</div><div class="notif-time">${time}</div></div>
                ${n.read ? '' : '<span class="notif-dot"></span>'}
            </div>
        `;
    });
    container.innerHTML = html;
}

function handleNotifClick(notifId, fromUid, type) {
    if (!USER_UID || !fromUid) return;
    db.ref('sites/' + SITE + '/notifications/' + USER_UID + '/' + notifId + '/read').set(true);
    if (type === 'message') {
        closeNotifications();
        openPrivateChat(fromUid);
        db.ref('sites/' + SITE + '/notifications/' + USER_UID + '/' + notifId).remove();
    } else {
        closeNotifications();
        navigateToProfile(fromUid);
    }
}

function openNotifications() {
    document.getElementById('notificationsModal').classList.add('open');
    db.ref('sites/' + SITE + '/notifications/' + USER_UID).orderByChild('timestamp').limitToLast(20).once('value', snap => {
        const notifications = snap.val() || {};
        const keys = Object.keys(notifications).sort((a, b) => (notifications[b].timestamp || 0) - (notifications[a].timestamp || 0));
        renderNotifications(notifications, keys);
    });
}

function closeNotifications() {
    document.getElementById('notificationsModal').classList.remove('open');
}
