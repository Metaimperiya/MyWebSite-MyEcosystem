// ================================================================
// ПРОФИЛЬ
// ================================================================

function loadProfile() {
    const uid = VIEWING_USER || USER_UID;
    if (!uid) return;

    db.ref('sites/' + SITE + '/users/' + uid).once('value', snap => {
        const u = snap.val() || {};
        document.getElementById('profileName').textContent = u.name || USER || 'Гость';
        document.getElementById('profileBio').textContent = u.bio || 'Привет!';
        const avatar = document.getElementById('profileAvatar');
        renderAvatar(uid, avatar, (u.name || '?').charAt(0).toUpperCase());
        showProfileActions(uid);
    });
    loadFriends(uid);
    loadSubscribers(uid);
    loadSubscriptions(uid);
    loadProfilePosts(uid);
}

function loadProfilePosts(uid) {
    const container = document.getElementById('profilePosts');
    container.innerHTML = '<div style="color:#bbb;text-align:center;padding:6px;font-size:0.65rem;">Загрузка...</div>';
    
    db.ref('sites/' + SITE + '/feed_posts').orderByChild('timestamp').on('value', snap => {
        container.innerHTML = '';
        const data = snap.val() || {};
        const keys = Object.keys(data).filter(k => data[k].authorUid === uid).sort((a, b) => (data[b].timestamp || 0) - (data[a].timestamp || 0));
        if (!keys.length) {
            container.innerHTML = '<div style="text-align:center;padding:6px;color:#bbb;font-size:0.65rem;">Нет постов</div>';
            return;
        }
        keys.forEach(k => {
            const p = data[k];
            p.id = k;
            container.appendChild(renderPost(p, 'feed'));
        });
    });
}

function showProfileActions(uid) {
    const actions = document.getElementById('profileActions');
    if (!uid || uid === USER_UID) {
        actions.innerHTML = `
            <button class="edit-btn" onclick="openEditProfile()">✏️ Редактировать</button>
            <button class="avatar-btn" onclick="uploadAvatar()">📷 Аватар</button>
        `;
        return;
    }
    const isFriend = checkFriend(uid);
    actions.innerHTML = `
        <button class="friend-btn ${isFriend ? 'added' : ''}" onclick="toggleFriend('${uid}')">
            ${isFriend ? '✅ В друзьях' : '➕ Добавить в друзья'}
        </button>
    `;
}

function checkFriend(uid) {
    if (!USER_UID) return false;
    return localStorage.getItem('fr_' + USER_UID + '_' + uid) === '1';
}

window.toggleFriend = function(uid) {
    if (!USER_UID) return;
    const isFriend = checkFriend(uid);
    if (isFriend) {
        if (!confirm('Удалить из друзей?')) return;
        localStorage.removeItem('fr_' + USER_UID + '_' + uid);
        db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + uid).remove();
        db.ref('sites/' + SITE + '/friends/' + uid + '/' + USER_UID).remove();
    } else {
        localStorage.setItem('fr_' + USER_UID + '_' + uid, '1');
        db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + uid).set(true);
        db.ref('sites/' + SITE + '/friends/' + uid + '/' + USER_UID).set(true);
    }
    loadProfile();
    if (VIEWING_USER) showProfileActions(VIEWING_USER);
};

function loadFriends(uid) {
    db.ref('sites/' + SITE + '/friends/' + uid).on('value', snap => {
        const data = snap.val() || {};
        const keys = Object.keys(data);
        document.getElementById('friendsCount').textContent = keys.length;
        const el = document.getElementById('friendList');
        if (!keys.length) { el.innerHTML = '<span style="color:#bbb;font-size:0.55rem;">Нет друзей</span>'; return; }
        let html = '';
        let loaded = 0;
        keys.forEach(k => {
            db.ref('sites/' + SITE + '/users/' + k).once('value', usnap => {
                const u = usnap.val() || {};
                const name = u.name || 'Аноним';
                const letter = name.charAt(0).toUpperCase();
                html += `<span class="friend-item" onclick="viewUser('${k}')">
                    <span class="avatar-wrap" id="fava-${k}"><span class="letter">${letter}</span></span> ${esc(name)}
                </span>`;
                loaded++;
                if (loaded === keys.length) {
                    el.innerHTML = html;
                    keys.forEach(k2 => {
                        const el2 = document.getElementById('fava-' + k2);
                        if (el2) renderAvatar(k2, el2, '?');
                    });
                }
            });
        });
    });
}

function loadSubscribers(uid) {
    if (!uid) return;
    db.ref('sites/' + SITE + '/subscribers/' + uid).on('value', snap => {
        const data = snap.val() || {};
        document.getElementById('subscribersCount').textContent = Object.keys(data).length;
    });
}

function loadSubscriptions(uid) {
    if (!uid) return;
    db.ref('sites/' + SITE + '/subscriptions/' + uid).on('value', snap => {
        const data = snap.val() || {};
        document.getElementById('subscriptionsCount').textContent = Object.keys(data).length;
    });
}

window.toggleStat = function(type) {
    showStat = type;
    document.getElementById('friendsSection').style.display = type === 'friends' ? 'block' : 'none';
};

window.viewUser = function(uid) {
    if (uid === USER_UID) { goToProfile(); return; }
    VIEWING_USER = uid;
    setActivePage('profilePage');
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
    const name = document.getElementById('editName').value.trim();
    const bio = document.getElementById('editBio').value.trim();
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
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Максимум 5 МБ'); return; }
        const ref = storage.ref('avatars/' + USER_UID + '/' + Date.now() + '_' + file.name);
        ref.put(file).then(snap => snap.ref.getDownloadURL()).then(url => {
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

// ================================================================
// КОНТЕКСТНОЕ МЕНЮ ПРОФИЛЯ
// ================================================================

function openProfileMenu(event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    const menu = document.getElementById('contextMenu');
    const overlay = document.getElementById('contextOverlay');
    const avatar = document.getElementById('profileAvatar');
    if (!menu || !avatar) return;
    if (menu.classList.contains('open')) { closeContextMenu(); return; }
    const rect = avatar.getBoundingClientRect();
    const left = Math.max(10, rect.left + rect.width / 2 - 100);
    const top = Math.min(rect.bottom + 10, window.innerHeight - 200);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.classList.add('open');
    overlay.classList.add('active');
}

function closeContextMenu() {
    const menu = document.getElementById('contextMenu');
    const overlay = document.getElementById('contextOverlay');
    if (menu) menu.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    const overlay = document.getElementById('profileDropdownOverlay');
    if (!dropdown) return;
    dropdown.classList.toggle('open');
    overlay.classList.toggle('active');
}

function closeProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    const overlay = document.getElementById('profileDropdownOverlay');
    if (dropdown) dropdown.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}
