// ================================================================ */
// ПРОФИЛЬ — ПОЛНАЯ ПЕРЕЗАПИСЬ (БЕЗ ЛИШНИХ КНОПОК)
// ================================================================ */

function loadProfile() {
    var uid = VIEWING_USER || USER_UID;

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

    db.ref('sites/' + SITE + '/users/' + uid).once('value', function(snap) {
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
    loadSubscribers(uid);
    loadSubscriptions(uid);
    loadProfilePosts(uid);
}

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

function makeStatsClickable(uid) {
    var friendsCount = document.getElementById('friendsCount');
    var subscribersCount = document.getElementById('subscribersCount');
    var subscriptionsCount = document.getElementById('subscriptionsCount');

    if (friendsCount) {
        friendsCount.style.cursor = 'pointer';
        friendsCount.style.color = 'var(--link-color)';
        friendsCount.onclick = function() { toggleFriendsList(); };
    }
    if (subscribersCount) {
        subscribersCount.style.cursor = 'pointer';
        subscribersCount.style.color = 'var(--link-color)';
        subscribersCount.onclick = function() { alert('👀 Подписчики: ' + (document.getElementById('subscribersCount')?.textContent || '0')); };
    }
    if (subscriptionsCount) {
        subscriptionsCount.style.cursor = 'pointer';
        subscriptionsCount.style.color = 'var(--link-color)';
        subscriptionsCount.onclick = function() { alert('📌 Подписки: ' + (document.getElementById('subscriptionsCount')?.textContent || '0')); };
    }
}

window.toggleFriendsList = function() {
    var section = document.getElementById('friendsSection');
    if (!section) return;

    if (section.style.display === 'none') {
        section.style.display = 'block';
        loadFriends(VIEWING_USER || USER_UID);
    } else {
        section.style.display = 'none';
    }
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

window.saveProfileLink = function() {
    if (!USER_UID) { alert('Войдите!'); return; }
    var input = document.getElementById('profileLinkInput');
    if (!input) return;
    var link = input.value.trim();

    if (!link) {
        var wrap = document.getElementById('profileIframeWrap');
        if (wrap) wrap.style.display = 'none';
        db.ref('sites/' + SITE + '/users/' + USER_UID + '/profileLink').remove();
        return;
    }

    if (!link.startsWith('http://') && !link.startsWith('https://')) {
        link = 'https://' + link;
    }

    db.ref('sites/' + SITE + '/users/' + USER_UID + '/profileLink').set(link);
    var iframe = document.getElementById('profileIframe');
    var wrap = document.getElementById('profileIframeWrap');
    if (iframe) iframe.src = link;
    if (wrap) wrap.style.display = 'block';
    alert('✅ Ссылка сохранена!');
};

window.toggleIframe = function() {
    var wrap = document.getElementById('profileIframeWrap');
    if (!wrap) return;
    var btn = wrap.querySelector('.iframe-header button');
    var iframe = document.getElementById('profileIframe');

    if (iframe) {
        if (iframe.style.display === 'none') {
            iframe.style.display = 'block';
            if (btn) btn.textContent = '🔼 Свернуть';
        } else {
            iframe.style.display = 'none';
            if (btn) btn.textContent = '🔽 Развернуть';
        }
    }
};

// ================================================================ */
// ГЛАВНАЯ ФУНКЦИЯ — ПОЛНОСТЬЮ ПЕРЕПИСАНА
// ================================================================ */

function showProfileActions(uid) {
    var actions = document.getElementById('profileActions');
    if (!uid) return;

    actions.innerHTML = '';
    actions.style.cssText = 'display:flex;flex-direction:column;align-items:center;width:100%;margin-top:8px;gap:6px;';

    if (uid === USER_UID) {
        var header = document.querySelector('.profile-header');
        if (!header) return;

        var oldMenu = document.getElementById('profileMenuDropdown');
        if (oldMenu) oldMenu.remove();

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
    msgBtn.className = 'friend-btn';
    msgBtn.textContent = '💬 Написать';
    msgBtn.style.cssText = 'padding:6px 20px;border:none;border-radius:20px;font-weight:600;cursor:pointer;font-size:0.7rem;transition:0.2s;background:#1877f2;color:#fff;';
    msgBtn.onclick = function() { openPrivateChat(uid); };
    msgBtn.onmouseover = function() { this.style.background = '#4a9eff'; };
    msgBtn.onmouseout = function() { this.style.background = '#1877f2'; };
    wrapper.appendChild(msgBtn);

    actions.appendChild(wrapper);

    var menuContainer = document.createElement('div');
    menuContainer.style.cssText = 'position:relative;width:100%;';
    actions.appendChild(menuContainer);

    var menu = document.createElement('div');
    menu.id = 'profileMenu';
    menu.className = 'profile-dropdown-menu';
    menu.style.cssText = 'display:none;position:absolute;right:50%;transform:translateX(50%);top:100%;background:var(--card-bg);border:1px solid var(--border-color);border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.15);min-width:200px;padding:4px 0;z-index:100;margin-top:4px;';
    menuContainer.appendChild(menu);

    var dotsBtn = document.createElement('button');
    dotsBtn.className = 'profile-dots-btn';
    dotsBtn.textContent = '⋮';
    dotsBtn.style.cssText = 'background:none;border:none;font-size:1.8rem;cursor:pointer;color:var(--text-secondary);padding:0 4px;border-radius:50%;transition:0.2s;line-height:1;';
    dotsBtn.onmouseover = function() { this.style.background = 'var(--input-bg)'; };
    dotsBtn.onmouseout = function() { this.style.background = 'transparent'; };
    dotsBtn.onclick = function(e) {
        e.stopPropagation();
        var m = document.getElementById('profileMenu');
        if (m) {
            m.style.display = m.style.display === 'block' ? 'none' : 'block';
            if (m.style.display === 'block') {
                fillProfileMenu(uid, m);
            }
        }
    };
    wrapper.appendChild(dotsBtn);

    fillProfileMenu(uid, menu);
    updateFriendButton(uid);

    db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + uid).on('value', function() {
        updateFriendButton(uid);
        fillProfileMenu(uid, document.getElementById('profileMenu'));
    });

    db.ref('sites/' + SITE + '/friend_requests/' + USER_UID + '/' + uid).on('value', function() {
        updateFriendButton(uid);
        fillProfileMenu(uid, document.getElementById('profileMenu'));
    });
}

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

    menu.querySelectorAll('.profile-menu-item').forEach(function(el) {
        el.onclick = function() {
            var action = this.dataset.action;
            handleProfileMenuAction(action, uid);
            closeProfileMenu();
        };
    });
}

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

function closeProfileMenu() {
    document.querySelectorAll('.profile-dropdown-menu').forEach(function(el) {
        el.style.display = 'none';
    });
    var menu = document.getElementById('profileMenuDropdown');
    if (menu) menu.style.display = 'none';
}

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
                var m = document.getElementById('profileMenu');
                if (m) {
                    m.style.display = m.style.display === 'block' ? 'none' : 'block';
                    if (m.style.display === 'block') fillProfileMenu(uid, m);
                }
            };
        } else if (status === 'pending_sent') {
            btn.textContent = '⏳ Запрос отправлен';
            btn.className = 'friend-btn pending';
            btn.onclick = function() { 
                var m = document.getElementById('profileMenu');
                if (m) {
                    m.style.display = m.style.display === 'block' ? 'none' : 'block';
                    if (m.style.display === 'block') fillProfileMenu(uid, m);
                }
            };
        } else if (status === 'pending_received') {
            btn.textContent = '📩 Заявка получена';
            btn.className = 'friend-btn received';
            btn.onclick = function() { 
                var m = document.getElementById('profileMenu');
                if (m) {
                    m.style.display = m.style.display === 'block' ? 'none' : 'block';
                    if (m.style.display === 'block') fillProfileMenu(uid, m);
                }
            };
        } else if (status === 'self') {
            btn.style.display = 'none';
        } else {
            btn.textContent = '➕ Добавить в друзья';
            btn.className = 'friend-btn add';
            btn.onclick = function() { sendFriendRequest(uid); };
        }
    });
}

function getCachedFriendStatus(myUid, targetUid) {
    var status = 'none';
    var friendCheck = localStorage.getItem('fs_' + myUid + '_' + targetUid);
    if (friendCheck === 'friend') return 'friend';
    if (friendCheck === 'pending_sent') return 'pending_sent';
    if (friendCheck === 'pending_received') return 'pending_received';
    return 'none';
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
            db.ref('sites/' + SITE + '/users/' + k).once('value', function(usnap) {
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

function loadSubscribers(uid) {
    if (!uid) return;
    db.ref('sites/' + SITE + '/subscribers/' + uid).on('value', function(snap) {
        var data = snap.val() || {};
        var countEl = document.getElementById('subscribersCount');
        if (countEl) countEl.textContent = Object.keys(data).length;
    });
}

function loadSubscriptions(uid) {
    if (!uid) return;
    db.ref('sites/' + SITE + '/subscriptions/' + uid).on('value', function(snap) {
        var data = snap.val() || {};
        var countEl = document.getElementById('subscriptionsCount');
        if (countEl) countEl.textContent = Object.keys(data).length;
    });
}

window.viewUser = function(uid) {
    if (uid === USER_UID) { goToProfile(); return; }
    VIEWING_USER = uid;
    setActivePage('profile');
    loadProfile();
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
