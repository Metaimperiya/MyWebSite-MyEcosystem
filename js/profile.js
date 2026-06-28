// ===== ПРОФИЛЬ =====

function renderProfile(uid) {
    const container = document.getElementById('profileContent');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center;padding:30px;color:#65676b;">⏳ Загрузка...</div>';
    
    safeFirebaseQuery('profile_' + uid, db.ref('sites/' + SITE + '/all_users/' + uid), (snap) => {
        const user = snap.val();
        if (!user) {
            container.innerHTML = '<div style="text-align:center;padding:30px;color:#e74c3c;">❌ Пользователь не найден</div>';
            return;
        }
        
        const isOwn = (uid === USER_UID);
        const name = user.name || 'Аноним';
        const email = user.email || '';
        const bio = user.bio || 'Привет! 👋';
        const avatarUrl = user.avatarUrl || null;
        
        // Получаем настройки приватности
        if (isOwn) {
            db.ref('sites/' + SITE + '/users/' + uid + '/settings/hideFriends').once('value', snap => {
                profilePrivacy.hideFriends = snap.val() === true;
            });
        } else {
            db.ref('sites/' + SITE + '/users/' + uid + '/settings/hideFriends').once('value', snap => {
                profilePrivacy.hideFriends = snap.val() === true;
            });
        }
        
        const avatarHtml = avatarUrl ? 
            `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;">` : 
            `<span>${name.charAt(0).toUpperCase()}</span>`;
        
        let dropdownItems = '';
        if (isOwn) {
            dropdownItems = `
                <button class="dropdown-item" onclick="editProfile();closeProfileDropdown();">
                    <span class="icon">✏️</span> Редактировать
                </button>
                <button class="dropdown-item" onclick="uploadAvatar();closeProfileDropdown();">
                    <span class="icon">📷</span> Сменить аватар
                </button>
                <div class="dropdown-divider"></div>
                <div class="toggle-wrap">
                    <span class="toggle-label">
                        <span class="icon">🔒</span> Скрыть список друзей
                    </span>
                    <div class="toggle-switch ${profilePrivacy.hideFriends ? 'active' : ''}" id="privacyToggle" onclick="togglePrivacy(event)">
                        <div class="toggle-slider"></div>
                    </div>
                </div>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item danger" onclick="logout();closeProfileDropdown();">
                    <span class="icon">🚪</span> Выйти
                </button>
            `;
        } else {
            // Для чужого профиля показываем кнопки в выпадающем меню
            db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + uid).once('value', snap => {
                const status = snap.val();
                let friendBtn = '';
                if (status === 'friend') {
                    friendBtn = `<button class="dropdown-item danger" onclick="removeFriend('${uid}');closeProfileDropdown();">
                        <span class="icon">❌</span> Удалить из друзей
                    </button>`;
                } else if (status === 'pending') {
                    friendBtn = `<button class="dropdown-item" style="cursor:default;opacity:0.7;">
                        <span class="icon">⏳</span> Запрос отправлен
                    </button>`;
                } else {
                    friendBtn = `<button class="dropdown-item" onclick="sendFriendRequest('${uid}');closeProfileDropdown();">
                        <span class="icon">➕</span> Добавить в друзья
                    </button>`;
                }
                
                const dropdown = document.getElementById('profileDropdown');
                if (dropdown) {
                    const items = dropdown.querySelector('.dropdown-items');
                    if (items) {
                        items.innerHTML = `
                            <button class="dropdown-item" onclick="openPrivateChat('${uid}');closeProfileDropdown();">
                                <span class="icon">✉️</span> Написать сообщение
                            </button>
                            ${friendBtn}
                            <div class="dropdown-divider"></div>
                            <button class="dropdown-item danger" onclick="alert('⚠️ Жалоба отправлена');closeProfileDropdown();">
                                <span class="icon">🚫</span> Пожаловаться
                            </button>
                        `;
                    }
                }
            });
        }
        
        let actionsHtml = '';
        let statHtml = '';
        
        if (isOwn) {
            actionsHtml = `
                <button class="btn-action" onclick="openPrivateChat('${uid}')">✉️ Сообщение</button>
            `;
            statHtml = `
                <div class="stat-toggles">
                    <button class="stat-toggle" onclick="toggleStatList('friends', this)">
                        🤝 Друзья <span class="count" id="friendsCount">0</span>
                    </button>
                    <button class="stat-toggle" onclick="toggleStatList('following', this)">
                        📌 Подписки <span class="count" id="subscriptionsCount">0</span>
                    </button>
                    <button class="stat-toggle" onclick="toggleStatList('followers', this)">
                        👀 Подписчики <span class="count" id="followersCount">0</span>
                    </button>
                </div>
                <div class="stat-container" id="statContainer">
                    <div id="statListContent"></div>
                </div>
            `;
        } else {
            // Для чужого профиля — кнопка сообщения
            db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + uid).once('value', snap => {
                const status = snap.val();
                let mainBtn = '';
                if (status === 'friend') {
                    mainBtn = `<button class="btn-action" onclick="openPrivateChat('${uid}')">✉️ Написать сообщение</button>`;
                } else if (status === 'pending') {
                    mainBtn = `<button class="btn-action" style="cursor:default;opacity:0.7;">⏳ Запрос отправлен</button>`;
                } else {
                    mainBtn = `<button class="btn-action" onclick="sendFriendRequest('${uid}')">➕ Добавить в друзья</button>`;
                }
                const pa = document.querySelector('#profileContent .profile-actions');
                if (pa) pa.innerHTML = mainBtn;
            });
            
            actionsHtml = `
                <button class="btn-action" onclick="openPrivateChat('${uid}')">✉️ Сообщение</button>
            `;
            
            if (!profilePrivacy.hideFriends) {
                statHtml = `
                    <div class="stat-toggles">
                        <button class="stat-toggle" onclick="toggleStatList('friends', this)">
                            🤝 Друзья <span class="count" id="friendsCount">0</span>
                        </button>
                        <button class="stat-toggle" onclick="toggleStatList('following', this)">
                            📌 Подписки <span class="count" id="subscriptionsCount">0</span>
                        </button>
                        <button class="stat-toggle" onclick="toggleStatList('followers', this)">
                            👀 Подписчики <span class="count" id="followersCount">0</span>
                        </button>
                    </div>
                    <div class="stat-container" id="statContainer">
                        <div id="statListContent"></div>
                    </div>
                `;
            } else {
                statHtml = `
                    <div class="stat-private">🔒 Списки скрыты владельцем профиля</div>
                `;
            }
        }
        
        container.innerHTML = `
            <div class="profile-page">
                <button class="back-btn" onclick="navigateToFeed()">← Назад</button>
                
                <button class="profile-more-btn" id="profileMoreBtn" onclick="toggleProfileDropdown()">⋮</button>
                
                <div class="profile-dropdown" id="profileDropdown">
                    <div class="dropdown-items">
                        ${isOwn ? dropdownItems : ''}
                    </div>
                </div>
                <div class="profile-dropdown-overlay" id="profileDropdownOverlay" onclick="closeProfileDropdown()"></div>
                
                <div class="profile-avatar" id="profileAvatar" onclick="${isOwn ? 'openProfileMenu(event)' : ''}" style="cursor:${isOwn ? 'pointer' : 'default'}">
                    ${avatarHtml}
                    ${isOwn ? '<span class="avatar-hint">📷 Сменить</span>' : ''}
                </div>
                
                <div class="profile-name">${name}</div>
                <div class="profile-email">${email}</div>
                <div class="profile-bio">${bio}</div>
                
                <div class="profile-actions">
                    ${actionsHtml}
                </div>
                
                ${statHtml}
            </div>
        `;
        
        // Загружаем счетчики
        if (isOwn) {
            updateCounters();
        } else {
            if (!profilePrivacy.hideFriends) {
                updateCountersForUid(uid);
            }
        }
    });
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

function togglePrivacy(event) {
    event.stopPropagation();
    if (!USER_UID) return;
    
    const toggle = document.getElementById('privacyToggle');
    if (!toggle) return;
    
    const newState = !toggle.classList.contains('active');
    toggle.classList.toggle('active', newState);
    profilePrivacy.hideFriends = newState;
    
    db.ref('sites/' + SITE + '/users/' + USER_UID + '/settings/hideFriends').set(newState);
    
    if (viewingProfileUid) renderProfile(viewingProfileUid);
}

function editProfile() {
    closeContextMenu();
    closeProfileDropdown();
    document.getElementById('editProfileModal').classList.add('open');
    document.getElementById('editName').value = USER || '';
    document.getElementById('editBio').value = '';
}

function closeEditProfile() {
    document.getElementById('editProfileModal').classList.remove('open');
}

function saveProfile() {
    const name = document.getElementById('editName').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    if (!name) { alert('Введите имя'); return; }
    
    USER = name;
    localStorage.setItem('dc_u_' + SITE, USER);
    
    const updates = { name: USER, bio: bio };
    db.ref('sites/' + SITE + '/users/' + USER_UID).update(updates);
    db.ref('sites/' + SITE + '/all_users/' + USER_UID).update(updates);
    
    const profile = SAVED_PROFILES.find(p => p.uid === USER_UID);
    if (profile) {
        profile.name = USER;
        localStorage.setItem('dc_profiles_' + SITE, JSON.stringify(SAVED_PROFILES));
    }
    
    closeEditProfile();
    if (viewingProfileUid) renderProfile(viewingProfileUid);
    updateUI();
    loadPeople();
}

function uploadAvatar() {
    if (!USER_UID) { alert('Войдите!'); return; }
    closeContextMenu();
    closeProfileDropdown();
    
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
            
            const profile = SAVED_PROFILES.find(p => p.uid === USER_UID);
            if (profile) {
                profile.avatarUrl = url;
                localStorage.setItem('dc_profiles_' + SITE, JSON.stringify(SAVED_PROFILES));
            }
            
            avatarCache = url;
            updateUI();
            if (viewingProfileUid) renderProfile(viewingProfileUid);
            alert('✅ Аватарка обновлена!');
        });
    };
    input.click();
}

function toggleStatList(type, btn) {
    const container = document.getElementById('statContainer');
    if (!container) return;
    
    if (activeStatToggle === type && container.classList.contains('open')) {
        container.classList.remove('open');
        activeStatToggle = null;
        document.querySelectorAll('.stat-toggle').forEach(b => b.classList.remove('active'));
        return;
    }
    
    document.querySelectorAll('.stat-toggle').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    container.classList.add('open');
    activeStatToggle = type;
    
    loadStatList(type);
}

function loadStatList(type) {
    const container = document.getElementById('statListContent');
    if (!container) return;
    const uid = viewingProfileUid || USER_UID;
    container.innerHTML = '<div style="text-align:center;padding:16px;color:#65676b;">⏳ Загрузка...</div>';
    
    if (type === 'friends') {
        db.ref('sites/' + SITE + '/friends/' + uid).once('value', snap => {
            const data = snap.val() || {};
            const friends = Object.keys(data).filter(k => data[k] === 'friend');
            renderStatList(container, friends, 'Друзья');
        });
    } else if (type === 'followers') {
        db.ref('sites/' + SITE + '/followers/' + uid).once('value', snap => {
            const data = snap.val() || {};
            renderStatList(container, Object.keys(data), 'Подписчики');
        });
    } else if (type === 'following') {
        db.ref('sites/' + SITE + '/followers').once('value', snap => {
            const all = snap.val() || {};
            const list = [];
            for (const [target, followers] of Object.entries(all)) {
                if (followers && followers[uid] === true) list.push(target);
            }
            renderStatList(container, list, 'Подписки');
        });
    }
}

function renderStatList(container, uids, title) {
    if (!uids || !uids.length) {
        container.innerHTML = `<div class="stat-empty">Нет ${title.toLowerCase()}</div>`;
        return;
    }
    
    const wrapper = document.createElement('div');
    wrapper.className = 'stat-list';
    container.innerHTML = '';
    container.appendChild(wrapper);
    
    uids.forEach(uid => {
        db.ref('sites/' + SITE + '/all_users/' + uid).once('value', snap => {
            const user = snap.val() || {};
            const name = user.name || 'Аноним';
            const letter = name.charAt(0).toUpperCase();
            const avatarHtml = user.avatarUrl ? `<img src="${user.avatarUrl}">` : letter;
            const item = document.createElement('span');
            item.className = 'stat-item';
            item.onclick = () => navigateToProfile(uid);
            item.innerHTML = `<span class="mini-avatar">${avatarHtml}</span> ${name}`;
            wrapper.appendChild(item);
        });
    });
}

function updateCounters() {
    if (!USER_UID) return;
    db.ref('sites/' + SITE + '/friends/' + USER_UID).once('value', snap => {
        const data = snap.val() || {};
        const friends = Object.keys(data).filter(k => data[k] === 'friend');
        const el = document.getElementById('friendsCount');
        if (el) el.textContent = friends.length;
    });
    db.ref('sites/' + SITE + '/followers/' + USER_UID).once('value', snap => {
        const el = document.getElementById('followersCount');
        if (el) el.textContent = Object.keys(snap.val() || {}).length;
    });
    db.ref('sites/' + SITE + '/followers').once('value', snap => {
        const all = snap.val() || {};
        let count = 0;
        for (const [target, followers] of Object.entries(all)) {
            if (followers && followers[USER_UID] === true) count++;
        }
        const el = document.getElementById('subscriptionsCount');
        if (el) el.textContent = count;
    });
}

function updateCountersForUid(uid) {
    if (!uid) return;
    db.ref('sites/' + SITE + '/friends/' + uid).once('value', snap => {
        const data = snap.val() || {};
        const friends = Object.keys(data).filter(k => data[k] === 'friend');
        const el = document.getElementById('friendsCount');
        if (el) el.textContent = friends.length;
    });
    db.ref('sites/' + SITE + '/followers/' + uid).once('value', snap => {
        const el = document.getElementById('followersCount');
        if (el) el.textContent = Object.keys(snap.val() || {}).length;
    });
    db.ref('sites/' + SITE + '/followers').once('value', snap => {
        const all = snap.val() || {};
        let count = 0;
        for (const [target, followers] of Object.entries(all)) {
            if (followers && followers[uid] === true) count++;
        }
        const el = document.getElementById('subscriptionsCount');
        if (el) el.textContent = count;
    });
}

function openProfileMenu(event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    
    const menu = document.getElementById('contextMenu');
    const overlay = document.getElementById('contextOverlay');
    const avatar = document.getElementById('profileAvatar');
    if (!menu || !avatar) return;
    
    if (menu.classList.contains('open')) {
        closeContextMenu();
        return;
    }
    
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
