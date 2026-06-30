// ================================================================
// ПРОФИЛЬ — ПОЛНАЯ ВЕРСИЯ С НОВОЙ СИСТЕМОЙ ДРУЗЕЙ
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
    
    db.ref('sites/' + SITE + '/feed_posts').orderByChild('timestamp').on('value', function(snap) {
        container.innerHTML = '';
        var data = snap.val() || {};
        var keys = Object.keys(data).filter(function(k) {
            return data[k].authorUid === uid;
        }).sort(function(a, b) {
            return (data[b].timestamp || 0) - (data[a].timestamp || 0);
        });
        
        if (!keys.length) {
            container.innerHTML = '<div style="text-align:center;padding:6px;color:#bbb;font-size:0.65rem;">Нет постов</div>';
            return;
        }
        
        keys.forEach(function(k) {
            var p = data[k];
            p.id = k;
            container.appendChild(renderPost(p, 'feed'));
        });
    });
}

// ================================================================
// КНОПКИ В ПРОФИЛЕ — НОВАЯ СИСТЕМА ДРУЗЕЙ
// ================================================================

function showProfileActions(uid) {
    var actions = document.getElementById('profileActions');
    if (!uid || uid === USER_UID) {
        actions.innerHTML = '<button class="edit-btn" onclick="openEditProfile()">✏️ Редактировать</button><button class="avatar-btn" onclick="uploadAvatar()">📷 Аватар</button>';
        return;
    }

    // Определяем статус отношений через новую систему
    var status = getFriendStatus(USER_UID, uid);

    if (status === 'friend') {
        actions.innerHTML = '<button class="friend-btn friend" onclick="removeFriend(\'' + uid + '\')">✅ В друзьях</button>';
    } else if (status === 'pending_sent') {
        actions.innerHTML = '<button class="friend-btn pending" onclick="cancelFriendRequest(\'' + uid + '\')">⏳ Запрос отправлен</button>';
    } else if (status === 'pending_received') {
        actions.innerHTML = '<button class="friend-btn received" onclick="acceptFriendRequest(\'' + uid + '\')">📩 Принять заявку</button>';
    } else {
        actions.innerHTML = '<button class="friend-btn add" onclick="sendFriendRequest(\'' + uid + '\')">➕ Добавить в друзья</button>';
    }
}

// ================================================================
// ЗАГРУЗКА ДРУЗЕЙ
// ================================================================

function loadFriends(uid) {
    db.ref('sites/' + SITE + '/friends/' + uid).on('value', function(snap) {
        var data = snap.val() || {};
        var keys = Object.keys(data);
        document.getElementById('friendsCount').textContent = keys.length;
        var el = document.getElementById('friendList');
        
        if (!keys.length) {
            el.innerHTML = '<span style="color:#bbb;font-size:0.55rem;">Нет друзей</span>';
            return;
        }
        
        var html = '';
        var loaded = 0;
        keys.forEach(function(k) {
            db.ref('sites/' + SITE + '/users/' + k).once('value', function(usnap) {
                var u = usnap.val() || {};
                var name = u.name || 'Аноним';
                var letter = name.charAt(0).toUpperCase();
                html += '<span class="friend-item" onclick="viewUser(\'' + k + '\')"><span class="avatar-wrap" id="fava-' + k + '"><span class="letter">' + letter + '</span></span> ' + esc(name) + '</span>';
                loaded++;
                if (loaded === keys.length) {
                    el.innerHTML = html;
                    keys.forEach(function(k2) {
                        var el2 = document.getElementById('fava-' + k2);
                        if (el2) renderAvatar(k2, el2, '?');
                    });
                }
            });
        });
    });
}

function loadSubscribers(uid) {
    if (!uid) return;
    db.ref('sites/' + SITE + '/subscribers/' + uid).on('value', function(snap) {
        var data = snap.val() || {};
        document.getElementById('subscribersCount').textContent = Object.keys(data).length;
    });
}

function loadSubscriptions(uid) {
    if (!uid) return;
    db.ref('sites/' + SITE + '/subscriptions/' + uid).on('value', function(snap) {
        var data = snap.val() || {};
        document.getElementById('subscriptionsCount').textContent = Object.keys(data).length;
    });
}

window.viewUser = function(uid) {
    if (uid === USER_UID) { goToProfile(); return; }
    VIEWING_USER = uid;
    setActivePage('profile');
    loadProfile();
};

window.openEditProfile = function() {
    document.getElementById('editName').value = USER || '';
    document.getElementById('editBio').value = '';
    document.getElementById('editProfileModal').classList.add('open');
};

window.closeEditProfile = function() {
    document.getElementById('editProfileModal').classList.remove('open');
};

window.saveProfile = function() {
    var name = document.getElementById('editName').value.trim();
    var bio = document.getElementById('editBio').value.trim();
    if (!name) { alert('Введите имя'); return; }
    
    USER = name;
    localStorage.setItem('dc_u_' + SITE, USER);
    db.ref('sites/' + SITE + '/users/' + USER_UID).update({ name: USER, bio: bio });
    db.ref('sites/' + SITE + '/all_users/' + USER_UID).update({ name: USER, bio: bio });
    updateUI();
    closeEditProfile();
    loadProfile();
    loadFeed();
};

window.uploadAvatar = function() {
    if (!USER_UID) { alert('Сначала войдите!'); return; }
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Максимум 5 МБ'); return; }
        
        var ref = storage.ref('avatars/' + USER_UID + '/' + Date.now() + '_' + file.name);
        ref.put(file).then(function(snap) {
            return snap.ref.getDownloadURL();
        }).then(function(url) {
            db.ref('sites/' + SITE + '/users/' + USER_UID + '/avatarUrl').set(url);
            db.ref('sites/' + SITE + '/all_users/' + USER_UID + '/avatarUrl').set(url);
            if (!avatarCache) avatarCache = {};
            avatarCache[USER_UID] = url;
            updateUI();
            loadProfile();
            loadFeed();
            alert('✅ Аватарка обновлена!');
        });
    };
    input.click();
};
