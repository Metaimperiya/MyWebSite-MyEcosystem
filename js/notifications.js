// ================================================================
// УВЕДОМЛЕНИЯ — ПОЛНАЯ ВЕРСИЯ С ПЕРЕХОДОМ В ЧАТ И КОММЕНТАРИИ
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

// ===== 2. ЗАГРУЗКА УВЕДОМЛЕНИЙ =====

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

// ===== 3. РЕНДЕР УВЕДОМЛЕНИЙ =====

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
        var icon = n.type === 'friend_request' ? '🤝' : n.type === 'friend_accepted' ? '✅' : n.type === 'comment' ? '💬' : '💬';
        var time = n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        
        var textDisplay = n.text || 'Уведомление';
        if (n.type === 'message') {
            textDisplay = '💬 ' + n.text;
        }
        if (n.type === 'comment') {
            textDisplay = '💬 ' + n.text;
        }
        
        var actionsHtml = '';
        if (n.type === 'friend_request' && n.fromUid && n.fromUid !== USER_UID) {
            actionsHtml = '<div style="display:flex;gap:4px;margin-top:4px;">';
            actionsHtml += '<button onclick="event.stopPropagation();acceptFriendRequest(\'' + n.fromUid + '\');closeNotifications();" style="background:#1877f2;color:#fff;border:none;border-radius:12px;padding:2px 10px;font-size:0.6rem;cursor:pointer;">✅ Принять</button>';
            actionsHtml += '<button onclick="event.stopPropagation();declineFriendRequest(\'' + n.fromUid + '\');closeNotifications();" style="background:#e4e6eb;color:#555;border:none;border-radius:12px;padding:2px 10px;font-size:0.6rem;cursor:pointer;">❌ Отклонить</button>';
            actionsHtml += '</div>';
        }
        
        html += '<div class="notif-item ' + (n.read ? '' : 'unread') + '" onclick="handleNotifClick(\'' + k + '\', \'' + (n.fromUid || n.from || '') + '\', \'' + n.type + '\', \'' + (n.chatId || '') + '\', \'' + (n.postId || '') + '\', \'' + (n.postType || '') + '\')">';
        html += '<span class="notif-icon">' + icon + '</span>';
        html += '<div class="notif-text">';
        html += '<div style="font-weight:' + (n.read ? '400' : '600') + ';font-size:13px;">' + textDisplay + '</div>';
        html += '<div class="notif-time">' + time + '</div>';
        html += actionsHtml;
        html += '</div>';
        html += (n.read ? '' : '<span class="notif-dot"></span>');
        html += '</div>';
    });
    
    container.innerHTML = html;
}

// ===== 4. ОБРАБОТКА КЛИКА ПО УВЕДОМЛЕНИЮ =====

function handleNotifClick(notifId, fromUid, type, chatId, postId, postType) {
    if (!USER_UID || !fromUid) return;
    
    db.ref('sites/' + SITE + '/notifications/' + USER_UID + '/' + notifId + '/read').set(true);
    closeNotifications();
    
    // 👇 ДЛЯ КОММЕНТАРИЕВ — ОТКРЫВАЕМ ПОСТ
    if (type === 'comment') {
        if (postId) {
            openPostPage(postId, postType || 'feed');
        } else {
            viewUser(fromUid);
        }
        return;
    }
    
    // 👇 ДЛЯ СООБЩЕНИЙ — ОТКРЫВАЕМ ЧАТ
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
    
    // ДЛЯ ЗАЯВОК В ДРУЗЬЯ — ОТКРЫВАЕМ ПРОФИЛЬ
    if (type === 'friend_request' || type === 'friend_accepted') {
        viewUser(fromUid);
        setTimeout(function() {
            updateFriendButton(fromUid);
        }, 500);
        return;
    }
    
    viewUser(fromUid);
}

// ===== 5. ОТКРЫТИЕ МОДАЛКИ =====

window.openNotifications = function() {
    if (!USER_UID) { alert('Войдите!'); return; }
    document.getElementById('notificationsModal').classList.add('open');
    db.ref('sites/' + SITE + '/notifications/' + USER_UID).orderByChild('timestamp').limitToLast(20).once('value', function(snap) {
        var notifications = snap.val() || {};
        var keys = Object.keys(notifications).sort(function(a, b) {
            return (notifications[b].timestamp || 0) - (notifications[a].timestamp || 0);
        });
        renderNotifications(notifications, keys);
    });
};

// ===== 6. ЗАКРЫТИЕ МОДАЛКИ =====

window.closeNotifications = function() {
    document.getElementById('notificationsModal').classList.remove('open');
};

// ===== 7. СТИЛИ =====

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

// ===== 8. ОТКРЫТИЕ СТРАНИЦЫ ПОСТА =====

function openPostPage(postId, type) {
    window.CURRENT_POST_ID = postId;
    window.CURRENT_POST_TYPE = type;
    
    var container = document.getElementById('postPageContainer');
    if (!container) return;
    
    document.getElementById('postPage').classList.add('active');
    setActivePage(null);
    
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">⏳ Загрузка поста...</div>';
    
    var path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + postId).once('value', function(snap) {
        var post = snap.val();
        if (!post) {
            container.innerHTML = '<div style="text-align:center;padding:20px;color:#e74c3c;">❌ Пост не найден</div>';
            return;
        }
        post.id = postId;
        var postEl = renderPost(post, type);
        container.innerHTML = '';
        container.appendChild(postEl);
        
        setTimeout(function() {
            var wrapper = document.getElementById('commentsWrapper_' + postId);
            if (wrapper) {
                wrapper.style.display = 'block';
                wrapper.style.opacity = '1';
                var state = getCommentState(postId);
                state.open = true;
                loadComments(postId, type);
                
                setTimeout(function() {
                    wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 300);
            }
        }, 500);
    });
}

// ===== 9. ЗАКРЫТИЕ СТРАНИЦЫ ПОСТА =====

window.closePostPage = function() {
    document.getElementById('postPage').classList.remove('active');
    setActivePage('feed');
    window.CURRENT_POST_ID = null;
    window.CURRENT_POST_TYPE = null;
    loadFeed();
};
