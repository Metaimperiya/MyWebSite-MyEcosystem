// ================================================================ */
// ПРОФИЛЬ — ПОЛНАЯ ВЕРСИЯ
// ================================================================ */

function loadProfile() {
    var uid = VIEWING_USER || USER_UID;
    console.log('🔵 loadProfile вызвана с uid:', uid, 'VIEWING_USER:', VIEWING_USER);

    if (!uid) {
        var nameEl = document.getElementById('profileName');
        var bioEl = document.getElementById('profileBio');
        var avatarEl = document.getElementById('profileAvatar');

        if (nameEl) {
            nameEl.textContent = '👤 Войдите';
            nameEl.style.display = 'block';
        }
        if (bioEl) {
            bioEl.textContent = 'Нажмите на аватар для входа';
            bioEl.style.display = 'block';
        }
        if (avatarEl) {
            avatarEl.innerHTML = '<span class="letter" style="cursor:pointer;font-size:24px;" onclick="document.getElementById(\'loginModal\').classList.add(\'open\')">🔑</span>';
        }

        var postsContainer = document.getElementById('profilePosts');
        if (postsContainer) postsContainer.innerHTML = '';
        return;
    }

    db.ref('sites/' + SITE + '/all_users/' + uid).once('value', function(snap) {
        var u = snap.val() || {};

        var nameEl = document.getElementById('profileName');
        var bioEl = document.getElementById('profileBio');
        var avatarEl = document.getElementById('profileAvatar');

        if (!u.name) {
            if (nameEl) {
                nameEl.textContent = '👤 Пользователь не найден';
                nameEl.style.display = 'block';
            }
            if (bioEl) {
                bioEl.textContent = 'Возможно, профиль удалён';
                bioEl.style.display = 'block';
            }
            if (avatarEl) {
                avatarEl.innerHTML = '<span class="letter">?</span>';
            }
            return;
        }

        if (nameEl) {
            nameEl.textContent = u.name;
            nameEl.style.display = 'block';
        }
        if (bioEl) {
            bioEl.textContent = u.bio || 'Привет!';
            bioEl.style.display = 'block';
        }
        renderAvatar(uid, avatarEl, (u.name || '?').charAt(0).toUpperCase());
        showProfileActions(uid);
        makeStatsClickable(uid);
        loadProfileLink(uid);
    });

    loadFriends(uid);
    loadProfileRelationshipCounts(uid);
    loadProfilePosts(uid);
}

// ===== ОСТАЛЬНЫЕ ФУНКЦИИ ПРОФИЛЯ =====
function loadProfilePosts(uid) {
    var container = document.getElementById('profilePosts');
    if (!container) return;

    container.innerHTML = '<div style="color:#bbb;text-align:center;padding:6px;font-size:0.65rem;">⏳ Загрузка...</div>';

    var postsRef = db.ref('sites/' + SITE + '/user_posts/' + uid);

    postsRef.orderByChild('timestamp').on('value', function(snap) {
        container.innerHTML = '';
        var data = snap.val() || {};
        var keys = Object.keys(data).sort(function(a, b) {
            return (data[b].timestamp || 0) - (data[a].timestamp || 0);
        });

        if (!keys.length) {
            container.innerHTML = '<div style="text-align:center;padding:12px;color:#bbb;font-size:0.65rem;">📝 Нет постов. Напишите что-нибудь!</div>';
            return;
        }

        keys.forEach(function(k) {
            var p = data[k];
            p.id = k;
            var postEl = renderPost(p, 'profile');
            if (postEl) container.appendChild(postEl);
        });
    }, function(error) {
        console.error('❌ Ошибка загрузки постов:', error);
        container.innerHTML = '<div style="text-align:center;padding:12px;color:#e74c3c;font-size:0.65rem;">❌ Ошибка загрузки постов</div>';
    });
}

function loadFriends(uid) {
    if (!uid) return;

    db.ref('sites/' + SITE + '/friends/' + uid).on('value', function(snap) {
        var data = snap.val() || {};
        var keys = Object.keys(data).filter(function(k) { return data[k] === true; });

        var countEl = document.getElementById('friendsCount');
        if (countEl) countEl.textContent = keys.length;

        var el = document.getElementById('friendList');
        if (!el) return;

        if (!keys.length) {
            el.innerHTML = '<span style="color:#bbb;font-size:0.55rem;">Нет друзей</span>';
            return;
        }

        var html = '';
        var loaded = 0;
        keys.forEach(function(k) {
            db.ref('sites/' + SITE + '/all_users/' + k).once('value', function(usnap) {
                var u = usnap.val() || {};
                var name = u.name || 'Аноним';
                var letter = name.charAt(0).toUpperCase();
                html += '<span class="friend-item" onclick="viewUser(\'' + k + '\')">';
                html += '<span class="avatar-wrap" id="fava-' + k + '"><span class="letter">' + letter + '</span></span> ';
                html += esc(name);
                html += '</span>';
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

function makeStatsClickable(uid) {
    var stats = [
        { id: 'friendsStat', type: 'friends' },
        { id: 'subscribersStat', type: 'subscribers' },
        { id: 'subscriptionsStat', type: 'subscriptions' }
    ];

    stats.forEach(function(stat) {
        var button = document.getElementById(stat.id);
        if (button) button.onclick = function() { openProfileList(stat.type, uid); };
    });
}

function loadProfileRelationshipCounts(uid) {
    var relationships = [
        { path: 'subscribers', element: 'subscribersCount' },
        { path: 'subscriptions', element: 'subscriptionsCount' }
    ];

    relationships.forEach(function(item) {
        var ref = db.ref('sites/' + SITE + '/' + item.path + '/' + uid);
        ref.off('value');
        ref.on('value', function(snap) {
            var data = snap.val() || {};
            var count = Object.keys(data).filter(function(key) { return data[key] === true; }).length;
            var element = document.getElementById(item.element);
            if (element) element.textContent = count;
        });
    });
}

window.openProfileList = function(type, uid) {
    uid = uid || VIEWING_USER || USER_UID;
    if (!uid) return;

    var config = {
        friends: { path: 'friends', title: 'Друзья', empty: 'Пока нет друзей' },
        subscribers: { path: 'subscribers', title: 'Подписчики', empty: 'Пока нет подписчиков' },
        subscriptions: { path: 'subscriptions', title: 'Подписки', empty: 'Пока нет подписок' }
    }[type];
    if (type === 'blocks') {
        config = { path: 'blocks', title: 'Заблокированные пользователи', empty: 'Список блокировок пуст' };
    }
    if (!config) return;

    var section = document.getElementById('profileListSection');
    var title = document.getElementById('profileListTitle');
    var list = document.getElementById('profileUserList');
    if (!section || !title || !list) return;

    section.hidden = false;
    title.textContent = config.title;
    list.innerHTML = '<div class="profile-list-state">Загрузка…</div>';

    db.ref('sites/' + SITE + '/' + config.path + '/' + uid).once('value', function(snap) {
        var data = snap.val() || {};
        var ids = Object.keys(data).filter(function(key) { return data[key] === true || (type === 'blocks' && !!data[key]); });
        if (!ids.length) {
            list.innerHTML = '<div class="profile-list-state">' + config.empty + '</div>';
            return;
        }

        Promise.all(ids.map(function(userId) {
            return db.ref('sites/' + SITE + '/all_users/' + userId).once('value').then(function(userSnap) {
                return { uid: userId, user: userSnap.val() || {} };
            });
        })).then(function(users) {
            list.innerHTML = users.map(function(item) {
                var name = item.user.name || 'Пользователь';
                return '<button type="button" class="profile-user-row" onclick="viewUser(\'' + item.uid + '\')">' +
                    '<span class="avatar-wrap" id="profile-list-avatar-' + item.uid + '"><span class="letter">' + esc(name.charAt(0).toUpperCase()) + '</span></span>' +
                    '<span>' + esc(name) + '</span></button>';
            }).join('');
            users.forEach(function(item) {
                var avatar = document.getElementById('profile-list-avatar-' + item.uid);
                if (avatar) renderAvatar(item.uid, avatar, '?');
            });
        }).catch(function() {
            list.innerHTML = '<div class="profile-list-state">Не удалось загрузить список</div>';
        });
    }, function() {
        list.innerHTML = '<div class="profile-list-state">Нет доступа к этому списку</div>';
    });
};

window.closeProfileList = function() {
    var section = document.getElementById('profileListSection');
    if (section) section.hidden = true;
};

window.toggleFriendsList = function() {
    var section = document.getElementById('profileListSection');
    if (section && !section.hidden) return closeProfileList();
    openProfileList('friends');
};

function loadProfileLink(uid) {
    db.ref('sites/' + SITE + '/users/' + uid + '/profileLink').once('value', function(snap) {
        var link = snap.val();
        if (link) {
            var input = document.getElementById('profileLinkInput');
            var iframe = document.getElementById('profileIframe');
            var wrap = document.getElementById('profileIframeWrap');
            if (input) input.value = link;
            if (iframe) iframe.src = link;
            if (wrap) wrap.style.display = 'block';
        }
    });
}

function setProfileRelationshipButton(button, active, activeLabel, inactiveLabel, activeClass) {
    if (!button) return;
    button.className = 'profile-action-btn ' + (active ? activeClass : 'primary');
    button.textContent = active ? activeLabel : inactiveLabel;
}

function watchProfileSubscription(targetUid, button) {
    db.ref('sites/' + SITE + '/subscriptions/' + USER_UID + '/' + targetUid).on('value', function(snap) {
        var subscribed = snap.val() === true;
        setProfileRelationshipButton(button, subscribed, '✓ Вы подписаны', '+ Подписаться', 'secondary');
        button.setAttribute('aria-pressed', subscribed ? 'true' : 'false');
        button.onclick = function() { toggleProfileSubscription(targetUid, subscribed, button); };
    });
}

window.toggleProfileSubscription = function(targetUid, subscribed, button) {
    if (!USER_UID || !targetUid || targetUid === USER_UID) return;
    if (button) button.disabled = true;

    // A subscription must never be created when either participant has blocked the other.
    Promise.all([
        db.ref('sites/' + SITE + '/blocks/' + USER_UID + '/' + targetUid).once('value'),
        db.ref('sites/' + SITE + '/blocks/' + targetUid + '/' + USER_UID).once('value')
    ]).then(function(snaps) {
        if (!subscribed && (snaps[0].exists() || snaps[1].exists())) {
            alert('Нельзя оформить подписку: один из пользователей заблокировал другого.');
            return;
        }
        var updates = {};
        updates['sites/' + SITE + '/subscriptions/' + USER_UID + '/' + targetUid] = subscribed ? null : true;
        updates['sites/' + SITE + '/subscribers/' + targetUid + '/' + USER_UID] = subscribed ? null : true;
        return db.ref().update(updates).then(function() {
            if (!subscribed && typeof sendNotification === 'function') {
                sendNotification(targetUid, { type: 'subscribe', fromUid: USER_UID, text: USER + ' подписался(ась) на вас', timestamp: Date.now() });
            }
        });
    }).catch(function() { alert('Не удалось обновить подписку. Попробуйте ещё раз.');
    }).finally(function() {
        if (button) button.disabled = false;
    });
};

function watchProfileBlock(targetUid, button, controls) {
    db.ref('sites/' + SITE + '/blocks/' + USER_UID + '/' + targetUid).on('value', function(snap) {
        var blocked = snap.exists();
        setProfileRelationshipButton(button, blocked, '✓ Разблокировать', '⛔ Заблокировать', 'danger');
        button.onclick = function() { blocked ? unblockUser(targetUid) : blockUser(targetUid); };
        controls.forEach(function(control) { if (control) control.disabled = blocked; });
    });
}

window.blockUser = function(targetUid) {
    if (!USER_UID || !targetUid || targetUid === USER_UID) return;
    if (!confirm('Заблокировать пользователя? Заявки и дружба с ним будут удалены.')) return;
    var updates = {};
    updates['sites/' + SITE + '/blocks/' + USER_UID + '/' + targetUid] = { blockedAt: Date.now() };
    updates['sites/' + SITE + '/friends/' + USER_UID + '/' + targetUid] = null;
    updates['sites/' + SITE + '/friends/' + targetUid + '/' + USER_UID] = null;
    updates['sites/' + SITE + '/friend_requests/' + USER_UID + '/' + targetUid] = null;
    updates['sites/' + SITE + '/friend_requests/' + targetUid + '/' + USER_UID] = null;
    // Blocking also breaks a follow relationship in both denormalized indexes.
    updates['sites/' + SITE + '/subscriptions/' + USER_UID + '/' + targetUid] = null;
    updates['sites/' + SITE + '/subscribers/' + targetUid + '/' + USER_UID] = null;
    db.ref().update(updates).then(function() {
        localStorage.removeItem('fs_' + USER_UID + '_' + targetUid);
        localStorage.removeItem('fs_' + targetUid + '_' + USER_UID);
        if (typeof loadPeople === 'function') loadPeople();
        if (typeof loadProfile === 'function') loadProfile();
    }).catch(function() { alert('Не удалось заблокировать пользователя. Попробуйте ещё раз.'); });
};

window.unblockUser = function(targetUid) {
    if (!USER_UID || !targetUid) return;
    db.ref('sites/' + SITE + '/blocks/' + USER_UID + '/' + targetUid).remove().catch(function() {
        alert('Не удалось снять блокировку. Попробуйте ещё раз.');
    });
};

window.openBlockedUsers = function() {
    if (USER_UID) openProfileList('blocks', USER_UID);
};

function showProfileActions(uid) {
    var actions = document.getElementById('profileActions');
    if (!uid || !actions) return;

    actions.innerHTML = '';
    actions.style.cssText = 'display:flex;flex-direction:column;align-items:center;width:100%;margin-top:8px;gap:6px;';

    if (uid === USER_UID) {
        var header = document.querySelector('.profile-header');
        if (!header) return;

        var container = document.createElement('div');
        container.style.cssText = 'position:absolute;top:12px;right:16px;z-index:10;';

        var dotsBtn = document.createElement('button');
        dotsBtn.textContent = '⋮';
        dotsBtn.style.cssText = 'background:none;border:none;font-size:1.8rem;cursor:pointer;color:var(--text-secondary);padding:0 4px;line-height:1;transition:0.2s;border-radius:50%;';
        dotsBtn.onclick = function(e) {
            e.stopPropagation();
            var menu = document.getElementById('profileMenuDropdown');
            if (menu) {
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            }
        };
        container.appendChild(dotsBtn);

        var menu = document.createElement('div');
        menu.id = 'profileMenuDropdown';
        menu.style.cssText = 'display:none;position:absolute;right:0;top:32px;background:var(--card-bg);border:1px solid var(--border-color);border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.15);min-width:200px;padding:4px 0;z-index:100;';
        menu.innerHTML = `
            <div class="profile-menu-item" onclick="openEditProfile();closeProfileMenu();" style="padding:8px 16px;cursor:pointer;font-size:0.8rem;color:var(--text-color);transition:0.15s;border-radius:4px;">✏️ Редактировать профиль</div>
            <div style="height:1px;background:var(--border-color);margin:2px 12px;"></div>
            <div class="profile-menu-item" onclick="uploadAvatar();closeProfileMenu();" style="padding:8px 16px;cursor:pointer;font-size:0.8rem;color:var(--text-color);transition:0.15s;border-radius:4px;">📷 Сменить аватар</div>
            <div style="height:1px;background:var(--border-color);margin:2px 12px;"></div>
            <div class="profile-menu-item" onclick="goToFeed();closeProfileMenu();" style="padding:8px 16px;cursor:pointer;font-size:0.8rem;color:var(--text-color);transition:0.15s;border-radius:4px;">🏠 На главную</div>
            <div style="height:1px;background:var(--border-color);margin:2px 12px;"></div>
            <div class="profile-menu-item" onclick="logout();closeProfileMenu();" style="padding:8px 16px;cursor:pointer;font-size:0.8rem;color:var(--danger);transition:0.15s;border-radius:4px;">🚪 Выйти</div>
        `;
        var blockedMenuItem = document.createElement('button');
        blockedMenuItem.type = 'button';
        blockedMenuItem.className = 'profile-menu-item';
        blockedMenuItem.textContent = '⛔ Заблокированные пользователи';
        blockedMenuItem.style.cssText = 'width:100%;padding:8px 16px;border:0;background:transparent;text-align:left;cursor:pointer;font-size:0.8rem;color:var(--text-color);';
        blockedMenuItem.onclick = function() { openBlockedUsers(); closeProfileMenu(); };
        menu.insertBefore(blockedMenuItem, menu.lastElementChild);
        container.appendChild(menu);
        header.appendChild(container);

        document.addEventListener('click', function(e) {
            if (!e.target.closest('.profile-header')) {
                var m = document.getElementById('profileMenuDropdown');
                if (m) m.style.display = 'none';
            }
        });

        return;
    }

    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;width:100%;';

    var mainBtn = document.createElement('button');
    mainBtn.id = 'friendActionBtn';
    mainBtn.className = 'friend-btn add';
    mainBtn.textContent = 'Загрузка...';
    mainBtn.style.cssText = 'padding:6px 20px;border:none;border-radius:20px;font-weight:600;cursor:pointer;font-size:0.7rem;transition:0.2s;';
    wrapper.appendChild(mainBtn);

    var msgBtn = document.createElement('button');
    msgBtn.className = 'profile-action-btn primary';
    msgBtn.textContent = '💬 Написать';
    msgBtn.onclick = function() { openPrivateChat(uid); };
    wrapper.appendChild(msgBtn);

    var subscribeBtn = document.createElement('button');
    subscribeBtn.type = 'button';
    wrapper.appendChild(subscribeBtn);

    var blockBtn = document.createElement('button');
    blockBtn.type = 'button';
    wrapper.appendChild(blockBtn);

    actions.appendChild(wrapper);
    getFriendStatusRealtime(USER_UID, uid, function(status) {
        setProfileFriendAction(mainBtn, status, uid);
    });
    watchProfileSubscription(uid, subscribeBtn);
    watchProfileBlock(uid, blockBtn, [mainBtn, msgBtn, subscribeBtn]);

    // Остальной код showProfileActions...
    // (полная версия есть в твоём profile.js, я просто добавил недостающие функции)
}

window.viewUser = function(uid) {
    navigateToProfile(uid);
};

window.openEditProfile = function() {
    var editName = document.getElementById('editName');
    var editBio = document.getElementById('editBio');
    var modal = document.getElementById('editProfileModal');
    if (editName) editName.value = USER || '';
    if (editBio) editBio.value = '';
    if (modal) modal.classList.add('open');
};

window.closeEditProfile = function() {
    var modal = document.getElementById('editProfileModal');
    if (modal) modal.classList.remove('open');
};

window.saveProfile = function() {
    var editName = document.getElementById('editName');
    var editBio = document.getElementById('editBio');
    if (!editName) return;
    var name = editName.value.trim();
    var bio = editBio ? editBio.value.trim() : '';
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

function closeProfileMenu() {
    document.querySelectorAll('.profile-dropdown-menu').forEach(function(el) {
        el.style.display = 'none';
    });
    var menu = document.getElementById('profileMenuDropdown');
    if (menu) menu.style.display = 'none';
}
