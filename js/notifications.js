// ================================================================
// УВЕДОМЛЕНИЯ
// ================================================================

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
    });
}

function openNotifications() {
    document.getElementById('notificationsModal').classList.add('open');
}

function closeNotifications() {
    document.getElementById('notificationsModal').classList.remove('open');
}
