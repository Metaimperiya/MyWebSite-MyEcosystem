// ================================================================ */
// ПРОФИЛЬ — ПОЛНАЯ ВЕРСИЯ
// ================================================================ */

var PROFILE_SOCIAL_SERVICES = [
    { key: 'instagram', label: 'Instagram', glyph: '◎', className: 'instagram' },
    { key: 'telegram', label: 'Telegram', glyph: '➤', className: 'telegram' },
    { key: 'viber', label: 'Viber', glyph: '☎', className: 'viber' },
    { key: 'whatsapp', label: 'WhatsApp', glyph: '◔', className: 'whatsapp' },
    { key: 'facebook', label: 'Facebook', glyph: 'f', className: 'facebook' },
    { key: 'threads', label: 'Threads', glyph: '@', className: 'threads' },
    { key: 'x', label: 'X', glyph: '𝕏', className: 'x-social' },
    { key: 'youtube', label: 'YouTube', glyph: '▶', className: 'youtube' },
    { key: 'tiktok', label: 'TikTok', glyph: '♪', className: 'tiktok' },
    { key: 'likee', label: 'Likee', glyph: '♥', className: 'likee' },
    { key: 'google', label: 'Google', glyph: 'G', className: 'google-social' }
];

function profileSocialHref(key, value) {
    var input = String(value || '').trim();
    if (!input) return '';
    if (/^(?:https?:\/\/|www\.|(?:instagram\.com|t\.me|telegram\.me|facebook\.com|threads\.net|x\.com|twitter\.com|youtube\.com|youtu\.be|tiktok\.com|likee\.video|wa\.me|viber\.com)(?:\/|$))/i.test(input)) {
        try {
            var parsed = new URL(/^https?:\/\//i.test(input) ? input : 'https://' + input);
            return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? parsed.href : '';
        } catch (ignore) { return ''; }
    }
    if (key === 'viber' && /^viber:\/\//i.test(input)) return input;
    if (key === 'whatsapp' && /^whatsapp:\/\//i.test(input)) return input;
    if (/^[a-z][a-z0-9+.-]*:/i.test(input)) return '';
    var username = input.replace(/^@/, '').replace(/^\/+|\/+$/g, '');
    var encoded = encodeURIComponent(username);
    if (key === 'instagram') return 'https://www.instagram.com/' + encoded + '/';
    if (key === 'telegram') return 'https://t.me/' + encoded;
    if (key === 'facebook') return 'https://www.facebook.com/' + encoded;
    if (key === 'threads') return 'https://www.threads.net/@' + encoded;
    if (key === 'x') return 'https://x.com/' + encoded;
    if (key === 'youtube') return 'https://www.youtube.com/@' + encoded;
    if (key === 'tiktok') return 'https://www.tiktok.com/@' + encoded;
    if (key === 'likee') return 'https://likee.video/@' + encoded;
    if (key === 'whatsapp' || key === 'viber') {
        var digits = input.replace(/[^\d+]/g, '').replace(/^\+/, '');
        if (!digits) return '';
        return key === 'whatsapp' ? 'https://wa.me/' + digits : 'viber://chat?number=%2B' + digits;
    }
    return '';
}

function renderProfileContacts(user) {
    var emailRow = document.getElementById('profileEmailRow');
    var phoneRow = document.getElementById('profilePhoneRow');
    var emailLink = document.getElementById('profileEmail');
    var phoneActions = document.getElementById('profilePhoneActions');
    var phoneNumber = document.getElementById('profilePhoneNumber');
    var callLink = document.getElementById('profileCallButton');
    var socialContainer = document.getElementById('profileSocialLinks');
    var email = String(user.email || '').trim();
    var phone = user.phone_public ? String(user.phone || '').trim() : '';

    if (emailLink) {
        emailLink.hidden = !email;
        emailLink.textContent = email ? '✉ ' + email : '';
        emailLink.href = email ? 'mailto:' + encodeURIComponent(email) : '';
    }
    if (callLink) {
        callLink.hidden = !phone;
        callLink.href = phone ? 'tel:' + phone.replace(/[^+\d,;*#]/g, '') : '';
    }
    if (phoneNumber) {
        phoneNumber.hidden = !phone;
        phoneNumber.textContent = phone;
    }
    if (phoneActions) phoneActions.hidden = !phone;
    if (emailRow) emailRow.hidden = !email;
    if (phoneRow) phoneRow.hidden = !phone;
    if (!socialContainer) return;
    socialContainer.replaceChildren();
    var links = user.social_links || {};
    var socialCount = 0;
    PROFILE_SOCIAL_SERVICES.forEach(function(service) {
        var value = String(links[service.key] || '').trim();
        var href = profileSocialHref(service.key, value);
        if (!value || !href) return;
        var link = document.createElement('a');
        link.className = 'profile-social-link ' + service.className;
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.title = service.label;
        link.setAttribute('aria-label', service.label);
        link.textContent = service.glyph;
        socialContainer.appendChild(link);
        socialCount++;
    });
    if (socialCount) {
        var heading = document.createElement('span');
        heading.className = 'profile-social-heading';
        heading.textContent = 'Социальные сети';
        socialContainer.insertBefore(heading, socialContainer.firstChild);
    }
    socialContainer.hidden = !socialCount;
}

function setProfileHeaderCollapsed(collapsed, persist) {
    var header = document.querySelector('.profile-header');
    var toggle = document.getElementById('profileHeaderToggle');
    if (!header || !toggle) return;
    header.classList.toggle('is-collapsed', collapsed);
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    toggle.setAttribute('aria-label', collapsed ? 'Показать описание и дополнительные действия' : 'Скрыть описание и дополнительные действия');
    var label = toggle.querySelector('.profile-header-toggle-label');
    if (label) label.textContent = collapsed ? 'Показать описание' : 'Скрыть описание';
    if (persist !== false) {
        try { localStorage.setItem('profileHeaderCollapsedV2', collapsed ? '1' : '0'); } catch (ignore) {}
    }
}

document.addEventListener('DOMContentLoaded', function() {
    var toggle = document.getElementById('profileHeaderToggle');
    if (!toggle) return;
    var startY = null;
    var swipeFinishedAt = 0;
    toggle.addEventListener('pointerdown', function(event) {
        startY = event.clientY;
    });
    toggle.addEventListener('pointerup', function(event) {
        if (startY === null) return;
        var delta = event.clientY - startY;
        startY = null;
        if (Math.abs(delta) < 18) return;
        swipeFinishedAt = Date.now();
        setProfileHeaderCollapsed(delta < 0);
    });
    toggle.addEventListener('pointercancel', function() { startY = null; });
    toggle.addEventListener('click', function() {
        if (Date.now() - swipeFinishedAt < 350) return;
        setProfileHeaderCollapsed(!document.querySelector('.profile-header').classList.contains('is-collapsed'));
    });
    try { setProfileHeaderCollapsed(localStorage.getItem('profileHeaderCollapsedV2') !== '0', false); }
    catch (ignore) { setProfileHeaderCollapsed(false); }

    var reputationToggle = document.getElementById('profileReputationToggle');
    var reputationPanel = document.getElementById('profileReputation');
    if (reputationToggle && reputationPanel) {
        reputationToggle.addEventListener('click', function() {
            var expanded = reputationToggle.getAttribute('aria-expanded') === 'true';
            reputationToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
            reputationPanel.hidden = expanded;
            var chevron = reputationToggle.querySelector('span');
            if (chevron) chevron.textContent = expanded ? '⌄' : '⌃';
        });
    }
});

function validateSocialLinksWithoutBlockingSave() {
    var invalidCount = 0;
    PROFILE_SOCIAL_SERVICES.forEach(function(service) {
        var id = 'editSocial' + service.key.charAt(0).toUpperCase() + service.key.slice(1);
        if (service.key === 'x') id = 'editSocialX';
        if (service.key === 'youtube') id = 'editSocialYoutube';
        var field = document.getElementById(id);
        if (!field) return;
        var value = field.value.trim();
        var looksLikeLink = /^(?:https?:\/\/|www\.|(?:[\w-]+\.)+[a-z]{2,}(?:\/|$))/i.test(value);
        var validLink = true;
        if (looksLikeLink) {
            try { validLink = /^(https?:\/\/|www\.|[\w-]+\.)/i.test(value) && !!new URL(/^https?:\/\//i.test(value) ? value : 'https://' + value).hostname; }
            catch (ignore) { validLink = false; }
        }
        field.setAttribute('aria-invalid', !validLink ? 'true' : 'false');
        field.title = !validLink ? 'Похоже, ссылка указана с ошибкой. Её можно сохранить и исправить позже.' : '';
        if (!validLink) invalidCount++;
    });
    var note = document.getElementById('socialLinkValidation');
    if (note) note.textContent = invalidCount ? 'Некоторые ссылки выглядят необычно. Они всё равно будут сохранены, их можно поправить позже.' : '';
}

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
        renderProfileContacts({});
        if (typeof window.loadAmbassadorProfileBalance === 'function') window.loadAmbassadorProfileBalance(null);

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
            var badgesEl = document.getElementById('profileBadges');
            if (badgesEl) badgesEl.innerHTML = '';
            renderProfileContacts({});
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
        renderProfileContacts(u);
        if (typeof window.loadAmbassadorProfileBalance === 'function') window.loadAmbassadorProfileBalance(uid);
        renderAvatar(uid, avatarEl, (u.name || '?').charAt(0).toUpperCase());
        showProfileActions(uid);
        makeStatsClickable(uid);
        loadProfileLink(uid);
        if (typeof loadProfileReputation === 'function') loadProfileReputation(uid);
    });

    loadFriends(uid);
    loadProfileRelationshipCounts(uid);
    loadProfilePosts(uid);
}

// ===== ОСТАЛЬНЫЕ ФУНКЦИИ ПРОФИЛЯ =====
var profilePostsUserRef = null;
var profilePostsFeedRef = null;

function loadProfilePosts(uid) {
    var container = document.getElementById('profilePosts');
    if (!container) return;

    if (profilePostsUserRef) profilePostsUserRef.off('value');
    if (profilePostsFeedRef) profilePostsFeedRef.off('value');
    container.innerHTML = '<div style="color:#bbb;text-align:center;padding:6px;font-size:0.65rem;">⏳ Загрузка...</div>';

    var profileData = null;
    var feedData = null;

    function fingerprint(post) {
        return [post.authorUid || '', post.timestamp || '', post.text || '', post.img || '', post.repost ? JSON.stringify(post.repost) : ''].join('|');
    }

    function render() {
        if (profileData === null && feedData === null) return;
        var posts = [];
        var known = {};
        Object.keys(profileData || {}).forEach(function(id) {
            var post = profileData[id];
            if (!post) return;
            known[fingerprint(post)] = true;
            post.id = id;
            post._profileSource = true;
            posts.push(post);
        });

        Object.keys(feedData || {}).forEach(function(id) {
            var post = feedData[id];
            if (!post || post.authorUid !== uid || known[fingerprint(post)]) return;
            post.id = id;
            post._profileSource = false;
            posts.push(post);
        });

        posts.sort(function(a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
        container.innerHTML = '';
        if (!posts.length) {
            container.innerHTML = '<div style="text-align:center;padding:12px;color:#bbb;font-size:0.65rem;">📝 Нет постов. Напишите что-нибудь!</div>';
            return;
        }
        posts.forEach(function(post) {
            var postEl = renderPost(post, post._profileSource ? 'profile' : 'feed');
            if (postEl) container.appendChild(postEl);
        });
    }

    profilePostsUserRef = db.ref('sites/' + SITE + '/user_posts/' + uid);
    profilePostsFeedRef = db.ref('sites/' + SITE + '/feed_posts').orderByChild('authorUid').equalTo(uid);
    profilePostsUserRef.on('value', function(snap) { profileData = snap.val() || {}; render(); }, function(error) {
        console.error('❌ Ошибка загрузки постов профиля:', error);
        profileData = {};
        render();
    });
    profilePostsFeedRef.on('value', function(snap) { feedData = snap.val() || {}; render(); }, function(error) {
        console.error('❌ Ошибка загрузки общей ленты профиля:', error);
        feedData = {};
        render();
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

        // ===== DOSS OS: точка входа из своего профиля =====
        var dossBtn = document.createElement('a');
        dossBtn.href = '/doss/';
        dossBtn.textContent = '🧠 DOSS OS';
        dossBtn.style.cssText =
            'display:inline-block;margin:8px auto 0;padding:6px 14px;' +
            'border-radius:20px;background:var(--link-color);color:#fff;' +
            'font-size:0.7rem;font-weight:600;text-decoration:none;' +
            'position:relative;z-index:9;';
        actions.appendChild(dossBtn);

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
}

window.viewUser = function(uid) {
    navigateToProfile(uid);
};

window.openEditProfile = function() {
    var modal = document.getElementById('editProfileModal');
    var error = document.getElementById('editProfileError');
    if (error) error.textContent = '';
    if (!USER_UID) return;
    db.ref('sites/' + SITE + '/users/' + USER_UID).once('value').then(function(snapshot) {
        var user = snapshot.val() || {};
        var details = user.profileDetails || {};
        var values = {
            editName: user.name || USER || '', editBio: user.bio || '',
            editEmail: user.email || '',
            editGender: details.gender || '', editCountry: details.country || '',
            editRegion: details.region || '', editCity: details.city || '',
            editProfession: details.profession || '', editSpecialization: details.specialization || '',
            editInterests: Array.isArray(details.interests) ? details.interests.join(', ') : '',
            editWorkStatus: details.workStatus || '', editWorkFormat: details.workFormat || '',
            editPhone: user.phone || details.phone || ''
        };
        Object.keys(values).forEach(function(id) {
            var input = document.getElementById(id);
            if (input) input.value = values[id];
        });
        var phonePublic = document.getElementById('editPhonePublic');
        if (phonePublic) phonePublic.checked = user.phone_public === true || (!Object.prototype.hasOwnProperty.call(user, 'phone_public') && details.phoneVisibility === 'public');
        var socialLinks = user.social_links || {};
        PROFILE_SOCIAL_SERVICES.forEach(function(service) {
            var input = document.getElementById('editSocial' + service.key.charAt(0).toUpperCase() + service.key.slice(1));
            if (service.key === 'x') input = document.getElementById('editSocialX');
            if (service.key === 'youtube') input = document.getElementById('editSocialYoutube');
            if (input) input.value = socialLinks[service.key] || '';
        });
        validateSocialLinksWithoutBlockingSave();
        if (modal) modal.classList.add('open');
    }).catch(function(err) {
        console.error('Не удалось загрузить профиль для редактирования:', err);
        if (error) error.textContent = 'Не удалось загрузить профиль. Попробуйте ещё раз.';
        if (modal) modal.classList.add('open');
    });
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
    var error = document.getElementById('editProfileError');
    var saveButton = document.getElementById('saveProfileButton');
    if (!name) { if (error) error.textContent = 'Введите имя.'; editName.focus(); return; }
    if (!USER_UID) { if (error) error.textContent = 'Войдите в аккаунт, чтобы сохранить профиль.'; return; }

    var interests = (document.getElementById('editInterests').value || '').split(',').map(function(value) { return value.trim(); }).filter(Boolean).slice(0, 20);
    var socialLinks = {};
    PROFILE_SOCIAL_SERVICES.forEach(function(service) {
        var inputId = 'editSocial' + service.key.charAt(0).toUpperCase() + service.key.slice(1);
        if (service.key === 'x') inputId = 'editSocialX';
        if (service.key === 'youtube') inputId = 'editSocialYoutube';
        var input = document.getElementById(inputId);
        socialLinks[service.key] = input ? input.value.trim() : '';
    });
    var phonePublic = document.getElementById('editPhonePublic').checked;
    var email = document.getElementById('editEmail').value.trim();
    var phone = document.getElementById('editPhone').value.trim();
    validateSocialLinksWithoutBlockingSave();
    var details = {
        gender: document.getElementById('editGender').value,
        country: document.getElementById('editCountry').value.trim(),
        region: document.getElementById('editRegion').value.trim(),
        city: document.getElementById('editCity').value.trim(),
        profession: document.getElementById('editProfession').value.trim(),
        specialization: document.getElementById('editSpecialization').value.trim(),
        interests: interests,
        workStatus: document.getElementById('editWorkStatus').value,
        workFormat: document.getElementById('editWorkFormat').value,
        phone: phone,
        phoneVisibility: phonePublic ? 'public' : 'private'
    };
    var publicDetails = Object.assign({}, details);
    publicDetails.phone = phonePublic ? phone : '';
    var update = { name: name, bio: bio, email: email, phone: phone, phone_public: phonePublic, social_links: socialLinks, profileDetails: details };
    var publicUpdate = { name: name, bio: bio, email: email, phone: phonePublic ? phone : null, phone_public: phonePublic, social_links: socialLinks, profileDetails: publicDetails };
    if (error) error.textContent = '';
    if (saveButton) { saveButton.disabled = true; saveButton.textContent = 'Сохраняю…'; }
    Promise.all([
        db.ref('sites/' + SITE + '/users/' + USER_UID).update(update),
        db.ref('sites/' + SITE + '/all_users/' + USER_UID).update(publicUpdate)
    ]).then(function() {
        USER = name;
        localStorage.setItem('dc_u_' + SITE, USER);
        updateUI();
        closeEditProfile();
        loadProfile();
        loadFeed();
    }).catch(function(err) {
        console.error('Не удалось сохранить профиль:', err);
        if (error) error.textContent = 'Не удалось сохранить изменения. Проверьте соединение и попробуйте ещё раз.';
    }).finally(function() {
        if (saveButton) { saveButton.disabled = false; saveButton.textContent = 'Сохранить'; }
    });
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
