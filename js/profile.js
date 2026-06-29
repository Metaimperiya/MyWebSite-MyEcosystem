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
