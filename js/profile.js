// ================================================================
// ПРОФИЛЬ — С МЕНЮ ЧЕРЕЗ ТРИ ТОЧКИ
// ================================================================

function loadProfile() {
    var uid = VIEWING_USER || USER_UID;
    if (!uid) return;
    
    db.ref('sites/' + SITE + '/users/' + uid).once('value', function(snap) {
        var u = snap.val() || {};
        document.getElementById('profileName').textContent = u.name || USER || 'Гость';
        document.getElementById('profileBio').textContent = u.bio || 'Привет!';
        var avatar = document.getElementById('profileAvatar');
        renderAvatar(uid, avatar, (u.name || '?').charAt(0).toUpperCase());
        showProfileActions(uid);
    });
    
    loadFriends(uid);
    loadSubscribers(uid);
    loadSubscriptions(uid);
    loadProfilePosts(uid);
}

function loadProfilePosts(uid) {
    var container = document.getElementById('profilePosts');
    container.innerHTML = '<div style="color:#bbb;text-align:center;padding:6px;font-size:0.65rem;">Загрузка...</div>';
    
    db.ref('sites/' + SITE + '/user_posts/' + uid).orderByChild('timestamp').on('value', function(snap) {
        container.innerHTML = '';
        var data = snap.val() || {};
        var keys = Object.keys(data).sort(function(a, b) {
            return (data[b].timestamp || 0) - (data[a].timestamp || 0);
        });
        
        if (!keys.length) {
            container.innerHTML = '<div style="text-align:center;padding:6px;color:#bbb;font-size:0.65rem;">Нет постов</div>';
            return;
        }
        
        keys.forEach(function(k) {
            var p = data[k];
            p.id = k;
            container.appendChild(renderPost(p, 'profile'));
        });
    });
}

// ================================================================
// КНОПКИ В ПРОФИЛЕ — С ТРЕМЯ ТОЧКАМИ (⋮)
// ================================================================

function showProfileActions(uid) {
    var actions = document.getElementById('profileActions');
    if (!uid) return;
    
    actions.innerHTML = '';
    
    if (uid === USER_UID) {
        // Свой профиль
        actions.innerHTML = `
            <button class="edit-btn" onclick="openEditProfile()">✏️ Редактировать</button>
            <button class="avatar-btn" onclick="uploadAvatar()">📷 Аватар</button>
        `;
        return;
    }
    
    // Чужой профиль — кнопка "В друзьях" + меню через три точки
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;align-items:center;gap:4px;justify-content:center;';
    
    // Основная кнопка
    var mainBtn = document.createElement('button');
    mainBtn.id = 'friendActionBtn';
    mainBtn.className = 'friend-btn add';
    mainBtn.textContent = 'Загрузка...';
    mainBtn.style.cssText = 'padding:4px 14px;border:none;border-radius:16px;font-weight:600;cursor:pointer;font-size:0.65rem;transition:0.2s;';
    wrapper.appendChild(mainBtn);
    
    // Кнопка "три точки"
    var dotsBtn = document.createElement('button');
    dotsBtn.className = 'profile-dots-btn';
    dotsBtn.textContent = '⋮';
    dotsBtn.style.cssText = 'background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--text-secondary);padding:4px 6px;border-radius:50%;transition:0.2s;';
    dotsBtn.onmouseover = function() { this.style.background = 'var(--input-bg)'; };
    dotsBtn.onmouseout = function() { this.style.background = 'transparent'; };
    dotsBtn.onclick = function(e) {
        e.stopPropagation();
        toggleProfileMenu(uid);
    };
    wrapper.appendChild(dotsBtn);
    
    actions.appendChild(wrapper);
    
    // Контейнер для меню
    var menuContainer = document.createElement('div');
    menuContainer.id = 'profileMenuContainer';
    menuContainer.style.cssText = 'position:relative;';
    actions.appendChild(menuContainer);
    
    // Само меню (скрыто)
    var menu = document.createElement('div');
    menu.id = 'profileMenu';
    menu.className = 'profile-dropdown-menu';
    menu.style.cssText = 'display:none;position:absolute;right:0;top:100%;background:var(--card-bg);border:1px solid var(--border-color);border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.15);min-width:180px;padding:4px 0;z-index:100;margin-top:4px;';
    menuContainer.appendChild(menu);
    
    // Заполняем меню в зависимости от статуса
    fillProfileMenu(uid, menu);
    
    // Обновляем кнопку в реальном времени
    updateFriendButton(uid);
    
    // Слушаем изменения
    db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + uid).on('value', function() {
        updateFriendButton(uid);
        fillProfileMenu(uid, document.getElementById('profileMenu'));
    });
    
    db.ref('sites/' + SITE + '/friend_requests/' + USER_UID + '/' + uid).on('value', function() {
        updateFriendButton(uid);
        fillProfileMenu(uid, document.getElementById('profileMenu'));
    });
}

// ================================================================
// ЗАПОЛНЕНИЕ МЕНЮ
// ================================================================

function fillProfileMenu(uid, menu) {
    if (!menu) return;
    
    var status = getCachedFriendStatus(USER_UID, uid);
    
    var items = [];
    
    if (status === 'friend') {
        items.push({ label: '⭐ В избранное', action: 'addFavorite', icon: '⭐' });
        items.push({ label: '📝 Редактировать список друзей', action: 'editFriendList', icon: '📝' });
        items.push({ label: '🔕 Отменить подписку', action: 'unsubscribe', icon: '🔕' });
        items.push({ label: '🗑 Удалить из друзей', action: 'removeFriend', icon: '🗑', danger: true });
    } else if (status === 'pending_sent') {
        items.push({ label: '⏳ Отменить заявку', action: 'cancelRequest', icon: '⏳' });
    } else if (status === 'pending_received') {
        items.push({ label: '✅ Принять заявку', action: 'acceptRequest', icon: '✅' });
        items.push({ label: '❌ Отклонить заявку', action: 'declineRequest', icon: '❌' });
    } else {
        items.push({ label: '➕ Добавить в друзья', action: 'addFriend', icon: '➕' });
    }
    
    var html = '';
    items.forEach(function(item, index) {
        var dangerClass = item.danger ? ' style="color:var(--danger);"' : '';
        html += '<div class="profile-menu-item" data-action="' + item.action + '"' + dangerClass + '>';
        html += item.icon + ' ' + item.label;
        html += '</div>';
        if (index < items.length - 1) {
            html += '<div style="height:1px;background:var(--border-color);margin:2px 12px;"></div>';
        }
    });
    
    menu.innerHTML = html;
    
    // Назначаем обработчики
    menu.querySelectorAll('.profile-menu-item').forEach(function(el) {
        el.onclick = function() {
            var action = this.dataset.action;
            handleProfileMenuAction(action, uid);
            closeProfileMenu();
        };
    });
}

// ================================================================
// ОБРАБОТКА ДЕЙСТВИЙ МЕНЮ
// ================================================================

function handleProfileMenuAction(action, uid) {
    switch(action) {
        case 'addFriend':
            sendFriendRequest(uid);
            break;
        case 'cancelRequest':
            cancelFriendRequest(uid);
            break;
        case 'acceptRequest':
            acceptFriendRequest(uid);
            break;
        case 'declineRequest':
            declineFriendRequest(uid);
            break;
        case 'removeFriend':
            removeFriend(uid);
            break;
        case 'unsubscribe':
            alert('🔕 Подписка отменена (заглушка)');
            break;
        case 'editFriendList':
            alert('📝 Редактирование списка друзей (заглушка)');
            break;
        case 'addFavorite':
            alert('⭐ Добавлено в избранное (заглушка)');
            break;
        default:
            break;
    }
}

// ================================================================
// ОТКРЫТИЕ/ЗАКРЫТИЕ МЕНЮ
// ================================================================

function toggleProfileMenu(uid) {
    var menu = document.getElementById('profileMenu');
    if (!menu) return;
    
    var isOpen = menu.style.display === 'block';
    
    // Закрываем все другие меню
    document.querySelectorAll('.profile-dropdown-menu').forEach(function(el) {
        el.style.display = 'none';
    });
    
    if (!isOpen) {
        menu.style.display = 'block';
        // Обновляем содержимое перед показом
        fillProfileMenu(uid, menu);
    }
}

function closeProfileMenu() {
    document.querySelectorAll('.profile-dropdown-menu').forEach(function(el) {
        el.style.display = 'none';
    });
}

// Закрываем меню при клике вне его
document.addEventListener('click', function(e) {
    if (!e.target.closest('#profileActions')) {
        closeProfileMenu();
    }
});

// ================================================================
// ОБНОВЛЕНИЕ КНОПКИ В РЕАЛЬНОМ ВРЕМЕНИ
// ================================================================

function updateFriendButton(uid) {
    var btn = document.getElementById('friendActionBtn');
    if (!btn) return;
    
    if (uid === USER_UID) {
        btn.style.display = 'none';
        return;
    }
    
    btn.style.display = 'inline-block';
    
    getFriendStatusRealtime(USER_UID, uid, function(status) {
        if (status === 'friend') {
            btn.textContent = '🤝 В друзьях';
            btn.className = 'friend-btn friend';
            btn.onclick = function() { 
                // При клике на кнопку открываем меню
                toggleProfileMenu(uid);
            };
        } else if (status === 'pending_sent') {
            btn.textContent = '⏳ Запрос отправлен';
            btn.className = 'friend-btn pending';
            btn.onclick = function() { toggleProfileMenu(uid); };
        } else if (status === 'pending_received') {
            btn.textContent = '📩 Заявка получена';
            btn.className = 'friend-btn received';
            btn.onclick = function() { toggleProfileMenu(uid); };
        } else if (status === 'self') {
            btn.style.display = 'none';
        } else {
            btn.textContent = '➕ Добавить в друзья';
            btn.className = 'friend-btn add';
            btn.onclick = function() { sendFriendRequest(uid); };
        }
    });
}

// ================================================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ СТАТУСА
// ================================================================

function getCachedFriendStatus(myUid, targetUid) {
    // Простая проверка для меню
    var status = 'none';
    // Синхронно проверяем через localStorage (быстро)
    var friendCheck = localStorage.getItem('fs_' + myUid + '_' + targetUid);
    if (friendCheck === 'friend') return 'friend';
    if (friendCheck === 'pending_sent') return 'pending_sent';
    if (friendCheck === 'pending_received') return 'pending_received';
    return 'none';
}
