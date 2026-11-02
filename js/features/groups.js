// ================================================================
// СООБЩЕСТВА: ГРУППЫ И ИХ ОТДЕЛЬНЫЕ ЛЕНТЫ
// ================================================================

var groupsDirectoryRef = null;
var groupMembershipsRef = null;
var clanGrantRef = null;
var clanApplicationsRef = null;
var clanMemberBadgesRef = null;
var groupDetailMembershipRef = null;
var groupDetailPostsRef = null;
var groupsCache = {};
var groupMembershipsCache = {};
var selectedCommunityId = null;
var selectedGroupIsMember = false;
var groupCoverPreviewUrl = null;
var groupAvatarPreviewUrl = null;
var groupCoverRemoved = false;
var groupAvatarRemoved = false;
var pendingSharedGroupPostId = null;
var clanLeaderGrant = null;
var clanApplicationsCache = {};
var clanMemberBadgesCache = {};
var clanUsersCache = null;
var groupCreateMode = 'group';

function groupEscape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(char) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
}

function groupShareButton(kind, payload) {
    return '<button type="button" class="community-share-button" data-share-kind="' + groupEscape(kind) + '" data-feed-share="' + encodeURIComponent(JSON.stringify(payload)) + '">↗ Поделиться</button>';
}

function renderClanAccess() {
    var createButton = document.getElementById('createClanButton');
    var requestButton = document.getElementById('clanRequestButton');
    var description = document.getElementById('clanEntryDescription');
    var title = document.getElementById('clanEntryTitle');
    var ownRequest = USER_UID && clanApplicationsCache[USER_UID];
    var hasGrant = !!(clanLeaderGrant && clanLeaderGrant.active);
    if (createButton) createButton.hidden = !hasGrant;
    if (requestButton) {
        requestButton.hidden = hasGrant || !!(ownRequest && ownRequest.status === 'pending');
        requestButton.textContent = ownRequest && ownRequest.status === 'rejected' ? 'Подать снова' : 'Подать заявку';
    }
    if (title) title.textContent = hasGrant ? 'Ты можешь создать клан' : ownRequest && ownRequest.status === 'pending' ? 'Заявка отправлена' : 'Хочешь возглавить клан?';
    if (description) description.textContent = hasGrant
        ? 'Тебе выдан символ ' + (clanLeaderGrant.badge || '♟') + '. Создай клан и назначай этот значок его участникам.'
        : ownRequest && ownRequest.status === 'pending'
            ? 'Заявка ждёт рассмотрения администратора.'
            : ownRequest && ownRequest.status === 'rejected'
                ? 'Предыдущую заявку отклонили. Ты можешь отправить новую.'
                : 'Отправь заявку. После одобрения ты получишь символ клана и сможешь создать его и назначать значки участникам.';
    renderClanApplications();
}

function renderClanApplications() {
    var section = document.getElementById('clanAdminApplications');
    var list = document.getElementById('clanApplicationList');
    if (!section || !list) return;
    section.hidden = !isAdmin;
    if (!isAdmin) return;
    var pending = Object.keys(clanApplicationsCache).map(function(uid) {
        return Object.assign({ uid: uid }, clanApplicationsCache[uid] || {});
    }).filter(function(request) { return request.status === 'pending'; }).sort(function(a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
    if (!pending.length) {
        list.innerHTML = '<p class="clan-admin-empty">Новых заявок пока нет.</p>';
        return;
    }
    list.innerHTML = pending.map(function(request) {
        return '<article class="clan-application-card"><div><strong>' + groupEscape(request.clanName || 'Клан') + '</strong><p>' + groupEscape(request.about || 'Без описания') + '</p><small>' + groupEscape(request.userName || 'Участник') + ' · ' + groupEscape(request.uid) + '</small></div><label>Символ<input type="text" maxlength="8" value="♟" data-clan-grant-badge="' + groupEscape(request.uid) + '"></label><button type="button" onclick="approveClanApplication(\'' + groupEscape(request.uid) + '\')">Назначить лидером</button><button type="button" class="clan-reject-button" onclick="rejectClanApplication(\'' + groupEscape(request.uid) + '\')">Отклонить</button></article>';
    }).join('');
}

function stopGroupDetailListeners() {
    if (groupDetailMembershipRef) groupDetailMembershipRef.off();
    if (groupDetailPostsRef) groupDetailPostsRef.off();
    groupDetailMembershipRef = null;
    groupDetailPostsRef = null;
}

function renderGroupDirectory() {
    var list = document.getElementById('groupList');
    if (!list) return;
    var groups = Object.keys(groupsCache).map(function(id) {
        return Object.assign({ id: id }, groupsCache[id] || {});
    }).sort(function(a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    var search = (document.getElementById('groupsSearch') || {}).value || '';
    var query = search.trim().toLocaleLowerCase('ru');
    if (query) groups = groups.filter(function(group) {
        return ((group.name || '') + ' ' + (group.description || '')).toLocaleLowerCase('ru').indexOf(query) !== -1;
    });

    if (!groups.length) {
        list.innerHTML = query
            ? '<div class="groups-empty"><span>⌕</span><strong>Ничего не найдено</strong><p>Попробуй изменить запрос.</p></div>'
            : '<div class="groups-empty"><span>👥</span><strong>Пока нет групп</strong><p>Создай первую группу — и у неё появится собственная лента.</p><button type="button" onclick="openCreateGroup()">＋ Создать группу</button></div>';
        return;
    }

    list.innerHTML = groups.map(function(group) {
        var members = groupMembershipsCache[group.id] || {};
        var isMember = !!members[USER_UID];
        var memberCount = Object.keys(members).length;
        return '<article class="community-card">' +
            '<button type="button" class="community-card-main" data-open-group="' + groupEscape(group.id) + '">' +
            '<span class="community-card-icon">' + groupEscape(group.isClan ? (group.clanBadge || '♟') : (Array.from((group.name || 'Группа').trim())[0] || '👥')) + '</span><span class="community-card-copy"><strong>' + (group.isClan ? '<span class="clan-type-label">КЛАН · </span>' : '') + groupEscape(group.name || 'Группа') + '</strong>' +
                '<span>' + groupEscape(group.description || 'Группа сообщества') + '</span></span></button>' +
            '<div class="community-card-footer"><span>👤 ' + memberCount + ' участников</span>' +
            (isMember ? '<span class="community-member-label">Вы участник</span>' : '<button type="button" class="community-join-button" data-join-group="' + groupEscape(group.id) + '">Вступить</button>') + '</div></article>';
    }).join('');

    list.querySelectorAll('[data-open-group]').forEach(function(button) {
        button.addEventListener('click', function() { window.openGroup(button.getAttribute('data-open-group')); });
    });
    list.querySelectorAll('[data-join-group]').forEach(function(button) {
        button.addEventListener('click', function() { joinGroup(button.getAttribute('data-join-group')); });
    });
}

function renderGroupDetailHeader() {
    if (!selectedCommunityId) return;
    var group = groupsCache[selectedCommunityId];
    var header = document.getElementById('groupDetailHeader');
    if (!group || !header) return;
    var members = groupMembershipsCache[selectedCommunityId] || {};
    var created = group.createdAt ? new Date(group.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    var initial = Array.from((group.name || 'Группа').trim())[0] || '👥';
    header.innerHTML = '<div class="group-profile-cover' + (group.coverUrl ? ' has-cover' : '') + '"><span>СООБЩЕСТВО</span></div><div class="group-profile-main">' +
        '<div class="group-profile-avatar">' + (group.avatarUrl ? '' : groupEscape(group.isClan ? (group.clanBadge || '♟') : initial)) + '</div><div class="group-profile-identity"><h2>' + (group.isClan ? '<span class="clan-type-label">КЛАН · </span>' : '') + groupEscape(group.name || 'Группа') +
        '</h2><span>' + (group.isClan ? 'Клан · лидер ' + groupEscape(group.leaderName || group.ownerName || 'участник') : 'Группа') + ' · ' + Object.keys(members).length + ' участников' + (created ? ' · создана ' + groupEscape(created) : '') + '</span></div>' +
        groupShareButton('group', { id: selectedCommunityId, title: group.name || 'Группа', description: group.description || (group.isClan ? 'Клан CPM2 METAIMPERIYA' : 'Сообщество METAIMPERIYA'), image: group.avatarUrl || group.coverUrl || '', isClan: !!group.isClan, badge: group.clanBadge || '' }) +
        ((group.ownerUid === USER_UID || group.leaderUid === USER_UID) ? '<button type="button" class="group-settings-button" onclick="openEditGroup()">⚙ Настроить</button>' : '') + '</div>' +
        '<p class="group-profile-description">' + groupEscape(group.description || 'У этой группы пока нет описания.') + '</p>';
    if (group.coverUrl) {
        var cover = header.querySelector('.group-profile-cover');
        var coverImage = document.createElement('img');
        coverImage.src = group.coverUrl;
        coverImage.alt = 'Обложка группы';
        coverImage.loading = 'lazy';
        cover.insertBefore(coverImage, cover.firstChild);
    }
    if (group.avatarUrl) {
        var avatar = header.querySelector('.group-profile-avatar');
        var avatarImage = document.createElement('img');
        avatarImage.src = group.avatarUrl;
        avatarImage.alt = 'Аватар группы';
        avatarImage.loading = 'lazy';
        avatar.appendChild(avatarImage);
    }
    var about = document.getElementById('groupAboutPanel');
    if (about) about.innerHTML = '<h3>Информация о группе</h3><p>' + groupEscape(group.description || 'Описание пока не добавлено.') + '</p><dl>' +
        '<div><dt>Создатель</dt><dd>' + groupEscape(group.ownerName || 'Участник METAIMPERIYA') + '</dd></div>' +
        '<div><dt>Участников</dt><dd>' + Object.keys(members).length + '</dd></div>' +
        (created ? '<div><dt>Создана</dt><dd>' + groupEscape(created) + '</dd></div>' : '') + '</dl>';
    renderClanRoster();
}

function renderClanRoster() {
    var panel = document.getElementById('clanRosterManager');
    if (!panel || !selectedCommunityId) return;
    var group = groupsCache[selectedCommunityId] || {};
    var canManage = !!group.isClan && (group.leaderUid === USER_UID || group.ownerUid === USER_UID || isAdmin);
    panel.hidden = !canManage;
    if (!canManage) return;
    var members = groupMembershipsCache[selectedCommunityId] || {};
    var memberIds = Object.keys(members).filter(function(uid) { return members[uid] === true; });
    if (!clanUsersCache) {
        panel.innerHTML = '<h3>Состав клана</h3><p>Загружаю участников…</p>';
        db.ref('sites/' + SITE + '/all_users').once('value').then(function(snapshot) {
            clanUsersCache = snapshot.val() || {};
            renderClanRoster();
        }).catch(function(error) { panel.innerHTML = '<h3>Состав клана</h3><p>Не удалось загрузить участников: ' + groupEscape(error.message) + '</p>'; });
        return;
    }
    panel.innerHTML = '<div class="clan-roster-heading"><div><span>УПРАВЛЕНИЕ КЛАНОМ</span><h3>Состав и значки</h3></div><small>Символ клана: ' + groupEscape(group.clanBadge || '♟') + '</small></div>' +
        (memberIds.length ? '<div class="clan-roster-list">' + memberIds.map(function(uid) {
            var person = clanUsersCache[uid] || {};
            var badge = clanMemberBadgesCache[uid] || {};
            var assigned = badge.groupId === selectedCommunityId;
            return '<div class="clan-roster-row"><span class="clan-roster-person"><strong>' + groupEscape(person.name || uid) + '</strong><small>' + (uid === group.leaderUid ? 'Лидер клана' : assigned ? groupEscape(badge.role || 'Участник клана') : 'Участник группы') + '</small></span>' +
                (uid === group.leaderUid ? '<span class="clan-roster-leader">' + groupEscape(group.clanBadge || '♟') + ' Лидер</span>' : '<button type="button" data-clan-member-toggle="' + groupEscape(uid) + '">' + (assigned ? 'Снять значок' : 'Выдать значок') + '</button>') + '</div>';
        }).join('') + '</div>' : '<p>В клане пока никого нет.</p>');
    panel.querySelectorAll('[data-clan-member-toggle]').forEach(function(button) {
        button.addEventListener('click', function() { window.toggleClanMemberBadge(button.getAttribute('data-clan-member-toggle')); });
    });
}

window.openClanApplication = function() {
    if (!USER_UID) { if (window.openLoginModal) window.openLoginModal(); return; }
    if (clanLeaderGrant && clanLeaderGrant.active) return;
    var modal = document.getElementById('clanApplicationModal');
    var app = clanApplicationsCache[USER_UID] || {};
    var name = document.getElementById('clanApplicationName');
    var reason = document.getElementById('clanApplicationReason');
    var error = document.getElementById('clanApplicationError');
    if (name) name.value = app.status === 'rejected' ? app.clanName || '' : '';
    if (reason) reason.value = app.status === 'rejected' ? app.about || '' : '';
    if (error) error.textContent = '';
    if (modal) modal.classList.add('open');
};

window.closeClanApplication = function() {
    var modal = document.getElementById('clanApplicationModal');
    if (modal) modal.classList.remove('open');
};

window.submitClanApplication = function() {
    if (!USER_UID) return;
    var name = (document.getElementById('clanApplicationName') || {}).value || '';
    var about = (document.getElementById('clanApplicationReason') || {}).value || '';
    var error = document.getElementById('clanApplicationError');
    name = name.trim(); about = about.trim();
    if (name.length < 2) { if (error) error.textContent = 'Укажи название клана.'; return; }
    var existing = clanApplicationsCache[USER_UID];
    if (existing && existing.status === 'pending') { if (error) error.textContent = 'Заявка уже отправлена и ждёт рассмотрения.'; return; }
    var user = clanUsersCache && clanUsersCache[USER_UID] || {};
    db.ref('sites/' + SITE + '/clan_applications/' + USER_UID).set({
        uid: USER_UID, userName: user.name || USER || 'Участник', clanName: name.slice(0, 60), about: about.slice(0, 300), status: 'pending', createdAt: Date.now()
    }).then(function() {
        clanApplicationsCache[USER_UID] = { uid: USER_UID, userName: user.name || USER || 'Участник', clanName: name.slice(0, 60), about: about.slice(0, 300), status: 'pending', createdAt: Date.now() };
        window.closeClanApplication();
        renderClanAccess();
    }).catch(function(saveError) { if (error) error.textContent = 'Не удалось отправить заявку: ' + (saveError.message || 'ошибка доступа'); });
};

window.approveClanApplication = function(uid) {
    if (!isAdmin || !uid) return;
    var request = clanApplicationsCache[uid];
    var badgeInput = document.querySelector('[data-clan-grant-badge="' + uid + '"]');
    var badge = (badgeInput ? badgeInput.value : '♟').trim().slice(0, 8) || '♟';
    if (!request) return;
    var now = Date.now();
    var updates = {};
    updates['sites/' + SITE + '/clan_leaders/' + uid] = { active: true, badge: badge, clanName: request.clanName || '', grantedBy: USER_UID, grantedAt: now };
    updates['sites/' + SITE + '/clan_applications/' + uid + '/status'] = 'approved';
    updates['sites/' + SITE + '/clan_applications/' + uid + '/reviewedAt'] = now;
    db.ref().update(updates).catch(function(error) { alert('Не удалось одобрить заявку: ' + (error.message || 'ошибка доступа')); });
};

window.rejectClanApplication = function(uid) {
    if (!isAdmin || !uid || !clanApplicationsCache[uid]) return;
    db.ref('sites/' + SITE + '/clan_applications/' + uid).update({ status: 'rejected', reviewedAt: Date.now() })
        .catch(function(error) { alert('Не удалось отклонить заявку: ' + (error.message || 'ошибка доступа')); });
};

window.grantClanLeader = function(uid) {
    if (!isAdmin || !uid) return Promise.reject(new Error('Нет прав администратора.'));
    var badge = window.prompt('Символ клана для этого лидера:', '♟');
    if (badge === null) return Promise.resolve(false);
    badge = badge.trim().slice(0, 8) || '♟';
    var name = clanUsersCache && clanUsersCache[uid] && clanUsersCache[uid].name || '';
    return db.ref('sites/' + SITE + '/clan_leaders/' + uid).set({ active: true, badge: badge, grantedBy: USER_UID, grantedAt: Date.now() }).then(function() {
        alert('Права создателя клана выданы. Символ: ' + badge + (name ? ' · ' + name : ''));
        return true;
    });
};

window.toggleClanMemberBadge = function(uid) {
    var group = groupsCache[selectedCommunityId] || {};
    if (!group.isClan || (group.leaderUid !== USER_UID && group.ownerUid !== USER_UID && !isAdmin) || !uid || uid === group.leaderUid) return;
    var current = clanMemberBadgesCache[uid] || {};
    var path = 'sites/' + SITE + '/user_clan_badges/' + uid;
    if (current.groupId === selectedCommunityId) {
        db.ref(path).remove().then(function() {
            delete clanMemberBadgesCache[uid];
            if (window.clearClanBadgeCache) window.clearClanBadgeCache(uid);
            renderClanRoster();
        }).catch(function(error) { alert('Не удалось снять значок: ' + (error.message || 'ошибка доступа')); });
        return;
    }
    if (current.groupId && !confirm('У участника уже есть значок другого клана. Заменить его на значок этого клана?')) return;
    var badge = { groupId: selectedCommunityId, groupName: group.name || 'Клан', badge: group.clanBadge || '♟', role: 'Участник клана', assignedBy: USER_UID, assignedAt: Date.now() };
    db.ref(path).set(badge).then(function() {
        clanMemberBadgesCache[uid] = badge;
        if (window.clearClanBadgeCache) window.clearClanBadgeCache(uid);
        renderClanRoster();
    }).catch(function(error) { alert('Не удалось выдать значок: ' + (error.message || 'ошибка доступа')); });
};

function renderGroupMembership(isMember) {
    var controls = document.getElementById('groupMembership');
    var composer = document.getElementById('groupPostComposer');
    if (!controls || !selectedCommunityId) return;
    var group = groupsCache[selectedCommunityId] || {};
    var isOwner = group.ownerUid === USER_UID || group.leaderUid === USER_UID;
    selectedGroupIsMember = isMember;
    controls.innerHTML = isMember
        ? '<div class="group-member-state">' + (group.isClan && isOwner ? 'Ты лидер этого клана ' + groupEscape(group.clanBadge || '♟') : isOwner ? 'Ты создатель этой группы' : group.isClan ? 'Ты участник этого клана' : 'Ты участник этой группы') + '</div>' + (!isOwner ? '<button type="button" class="group-leave-button" onclick="leaveGroup()">Покинуть группу</button>' : '')
        : '<button type="button" class="community-join-button" onclick="joinGroup(\'' + groupEscape(selectedCommunityId) + '\')">Вступить в группу</button><span>Вступи, чтобы публиковать записи</span>';
    if (composer) composer.hidden = !isMember || document.querySelector('[data-group-tab="about"].active') !== null;
}

function renderGroupPosts(posts) {
    var feed = document.getElementById('groupFeed');
    if (!feed) return;
    var entries = Object.keys(posts || {}).map(function(id) {
        return Object.assign({ id: id }, posts[id] || {});
    }).sort(function(a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    if (!entries.length) {
        feed.innerHTML = '<div class="group-feed-empty">В группе пока нет записей. Будь первым!</div>';
        return;
    }
    feed.replaceChildren();
    entries.forEach(function(post) {
        var card = document.createElement('article');
        card.className = 'group-post';
        card.dataset.groupPostId = post.id;
        var author = document.createElement('button');
        author.type = 'button';
        author.className = 'group-post-author';
        author.textContent = post.authorName || 'Пользователь';
        author.addEventListener('click', function() {
            if (post.authorUid && typeof navigateToProfile === 'function') navigateToProfile(post.authorUid);
        });
        var date = document.createElement('time');
        date.className = 'group-post-date';
        date.dateTime = post.createdAt ? new Date(post.createdAt).toISOString() : '';
        date.textContent = post.createdAt ? new Date(post.createdAt).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }) : '';
        var text = document.createElement('div');
        text.className = 'group-post-text';
        text.textContent = post.text || '';
        card.appendChild(author);
        card.appendChild(date);
        card.appendChild(text);
        var shareHolder = document.createElement('div');
        shareHolder.innerHTML = groupShareButton('group_post', { id: post.id, parentId: selectedCommunityId, title: 'Запись в группе «' + ((groupsCache[selectedCommunityId] || {}).name || 'Группа') + '»', description: post.text || '', image: (groupsCache[selectedCommunityId] || {}).avatarUrl || '' });
        card.appendChild(shareHolder.firstChild);
        feed.appendChild(card);
    });
    if (pendingSharedGroupPostId) {
        var target = Array.from(feed.querySelectorAll('[data-group-post-id]')).find(function(card) { return card.dataset.groupPostId === pendingSharedGroupPostId; });
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('shared-post-highlight');
            setTimeout(function() { target.classList.remove('shared-post-highlight'); }, 2200);
            pendingSharedGroupPostId = null;
        }
    }
}

function loadSelectedGroupFeed() {
    if (!selectedCommunityId) return;
    if (groupDetailMembershipRef) groupDetailMembershipRef.off();
    if (groupDetailPostsRef) groupDetailPostsRef.off();
    groupDetailMembershipRef = db.ref('sites/' + SITE + '/group_members/' + selectedCommunityId + '/' + USER_UID);
    groupDetailMembershipRef.on('value', function(snapshot) {
        renderGroupMembership(snapshot.val() === true);
    });
    groupDetailPostsRef = db.ref('sites/' + SITE + '/group_posts/' + selectedCommunityId).orderByChild('createdAt').limitToLast(100);
    groupDetailPostsRef.on('value', function(snapshot) {
        renderGroupPosts(snapshot.val() || {});
    }, function(error) {
        var feed = document.getElementById('groupFeed');
        if (feed) feed.innerHTML = '<div class="group-feed-empty">Не удалось загрузить ленту: ' + groupEscape(error.message) + '</div>';
    });
}

function loadGroups() {
    var list = document.getElementById('groupList');
    if (!list) return;
    closeGroup();
    if (groupsDirectoryRef) groupsDirectoryRef.off();
    if (groupMembershipsRef) groupMembershipsRef.off();
    if (clanGrantRef) clanGrantRef.off();
    if (clanApplicationsRef) clanApplicationsRef.off();
    if (clanMemberBadgesRef) clanMemberBadgesRef.off();
    if (!USER_UID) {
        groupsCache = {};
        groupMembershipsCache = {};
        clanLeaderGrant = null;
        clanApplicationsCache = {};
        clanMemberBadgesCache = {};
        renderClanAccess();
        list.innerHTML = '<div class="groups-empty"><span>🔒</span><strong>Войди, чтобы посмотреть группы</strong></div>';
        return;
    }
    groupsDirectoryRef = db.ref('sites/' + SITE + '/groups');
    groupMembershipsRef = db.ref('sites/' + SITE + '/group_members');
    groupsDirectoryRef.on('value', function(snapshot) {
        groupsCache = snapshot.val() || {};
        renderGroupDirectory();
        renderGroupDetailHeader();
    }, function(error) {
        list.innerHTML = '<div class="groups-empty">Не удалось загрузить группы: ' + groupEscape(error.message) + '</div>';
    });
    groupMembershipsRef.on('value', function(snapshot) {
        groupMembershipsCache = snapshot.val() || {};
        renderGroupDirectory();
        renderGroupDetailHeader();
        renderClanRoster();
    }, function(error) { console.warn('Не удалось загрузить участников групп:', error); });
    clanGrantRef = db.ref('sites/' + SITE + '/clan_leaders/' + USER_UID);
    clanGrantRef.on('value', function(snapshot) {
        clanLeaderGrant = snapshot.val() || null;
        renderClanAccess();
        renderGroupDirectory();
    }, function(error) { console.warn('Не удалось проверить права создателя клана:', error); });
    clanApplicationsRef = db.ref('sites/' + SITE + '/clan_applications' + (isAdmin ? '' : '/' + USER_UID));
    clanApplicationsRef.on('value', function(snapshot) {
        if (isAdmin) clanApplicationsCache = snapshot.val() || {};
        else {
            clanApplicationsCache = {};
            if (snapshot.exists()) clanApplicationsCache[USER_UID] = snapshot.val();
        }
        renderClanAccess();
    }, function(error) { console.warn('Не удалось загрузить заявки на клан:', error); });
    clanMemberBadgesRef = db.ref('sites/' + SITE + '/user_clan_badges');
    clanMemberBadgesRef.on('value', function(snapshot) {
        clanMemberBadgesCache = snapshot.val() || {};
        renderClanRoster();
    }, function(error) { console.warn('Не удалось загрузить значки участников кланов:', error); });
}

window.openGroup = function(id) {
    if (!USER_UID) { alert('Войди, чтобы открыть группы.'); return; }
    if (!groupsCache[id]) { alert('Эта группа больше не существует.'); loadGroups(); return; }
    stopGroupDetailListeners();
    selectedCommunityId = id;
    var directory = document.getElementById('groupsDirectory');
    var detail = document.getElementById('groupDetail');
    if (directory) directory.hidden = true;
    if (detail) detail.hidden = false;
    renderGroupDetailHeader();
    window.showGroupTab('feed');
    loadSelectedGroupFeed();
};

window.closeGroup = function() {
    stopGroupDetailListeners();
    selectedCommunityId = null;
    selectedGroupIsMember = false;
    var directory = document.getElementById('groupsDirectory');
    var detail = document.getElementById('groupDetail');
    if (directory) directory.hidden = false;
    if (detail) detail.hidden = true;
};

window.showGroupTab = function(tab) {
    var feed = document.getElementById('groupFeed');
    var about = document.getElementById('groupAboutPanel');
    var composer = document.getElementById('groupPostComposer');
    document.querySelectorAll('[data-group-tab]').forEach(function(button) {
        button.classList.toggle('active', button.getAttribute('data-group-tab') === tab);
    });
    if (feed) feed.hidden = tab !== 'feed';
    if (about) about.hidden = tab !== 'about';
    if (composer) composer.hidden = tab !== 'feed' || !selectedGroupIsMember;
};

window.openEditGroup = function() {
    if (!selectedCommunityId) return;
    var group = groupsCache[selectedCommunityId];
    if (!group || (group.ownerUid !== USER_UID && group.leaderUid !== USER_UID)) return;
    document.getElementById('editGroupName').value = group.name || '';
    document.getElementById('editGroupDescription').value = group.description || '';
    document.getElementById('editGroupError').textContent = '';
    document.getElementById('editGroupAvatarInput').value = '';
    document.getElementById('editGroupAvatarUrl').value = group.avatarUrl && /^https?:\/\//i.test(group.avatarUrl) ? group.avatarUrl : '';
    groupAvatarRemoved = false;
    renderGroupAvatarPreview(group.avatarUrl || '');
    document.getElementById('editGroupCoverInput').value = '';
    document.getElementById('editGroupCoverUrl').value = group.coverUrl && /^https?:\/\//i.test(group.coverUrl) ? group.coverUrl : '';
    groupCoverRemoved = false;
    renderGroupCoverPreview(group.coverUrl || '');
    document.getElementById('editCommunityModal').classList.add('open');
};

function renderGroupCoverPreview(url) {
    var preview = document.getElementById('editGroupCoverPreview');
    if (!preview) return;
    preview.replaceChildren();
    if (url) {
        var image = document.createElement('img');
        image.src = url;
        image.alt = 'Предпросмотр обложки';
        preview.appendChild(image);
    } else {
        var label = document.createElement('span');
        label.textContent = 'Пока без обложки';
        preview.appendChild(label);
    }
}

function renderGroupAvatarPreview(url) {
    var preview = document.getElementById('editGroupAvatarPreview');
    if (!preview) return;
    preview.replaceChildren();
    if (url) {
        var image = document.createElement('img');
        image.src = url;
        image.alt = 'Предпросмотр аватарки';
        preview.appendChild(image);
    } else {
        var label = document.createElement('span');
        label.textContent = 'Пока без аватарки';
        preview.appendChild(label);
    }
}

window.closeEditGroup = function() {
    document.getElementById('editCommunityModal').classList.remove('open');
    if (groupCoverPreviewUrl) URL.revokeObjectURL(groupCoverPreviewUrl);
    if (groupAvatarPreviewUrl) URL.revokeObjectURL(groupAvatarPreviewUrl);
    groupCoverPreviewUrl = null;
    groupAvatarPreviewUrl = null;
};

window.clearGroupCover = function() {
    var fileInput = document.getElementById('editGroupCoverInput');
    var urlInput = document.getElementById('editGroupCoverUrl');
    if (fileInput) fileInput.value = '';
    if (urlInput) urlInput.value = '';
    if (groupCoverPreviewUrl) URL.revokeObjectURL(groupCoverPreviewUrl);
    groupCoverPreviewUrl = null;
    groupCoverRemoved = true;
    renderGroupCoverPreview('');
};

window.clearGroupAvatar = function() {
    var fileInput = document.getElementById('editGroupAvatarInput');
    var urlInput = document.getElementById('editGroupAvatarUrl');
    if (fileInput) fileInput.value = '';
    if (urlInput) urlInput.value = '';
    if (groupAvatarPreviewUrl) URL.revokeObjectURL(groupAvatarPreviewUrl);
    groupAvatarPreviewUrl = null;
    groupAvatarRemoved = true;
    renderGroupAvatarPreview('');
};

window.saveGroupDetails = function() {
    var group = groupsCache[selectedCommunityId];
    var error = document.getElementById('editGroupError');
    var button = document.getElementById('saveGroupButton');
    var coverInput = document.getElementById('editGroupCoverInput');
    var coverUrlInput = document.getElementById('editGroupCoverUrl');
    var avatarInput = document.getElementById('editGroupAvatarInput');
    var avatarUrlInput = document.getElementById('editGroupAvatarUrl');
    if (!group || group.ownerUid !== USER_UID) return;
    var name = document.getElementById('editGroupName').value.trim();
    var description = document.getElementById('editGroupDescription').value.trim().slice(0, 300);
    var coverFile = coverInput && coverInput.files ? coverInput.files[0] : null;
    var enteredCoverUrl = coverUrlInput ? coverUrlInput.value.trim() : '';
    var avatarFile = avatarInput && avatarInput.files ? avatarInput.files[0] : null;
    var enteredAvatarUrl = avatarUrlInput ? avatarUrlInput.value.trim() : '';
    if (name.length < 2) { error.textContent = 'Название должно содержать хотя бы 2 символа.'; return; }
    if (coverFile && !coverFile.type.match(/^image\//i)) { error.textContent = 'Выбери файл изображения.'; return; }
    if (coverFile && coverFile.size >= 5 * 1024 * 1024) { error.textContent = 'Размер обложки должен быть меньше 5 МБ.'; return; }
    if (avatarFile && !avatarFile.type.match(/^image\//i)) { error.textContent = 'Выбери файл изображения для аватарки.'; return; }
    if (avatarFile && avatarFile.size >= 5 * 1024 * 1024) { error.textContent = 'Размер аватарки должен быть меньше 5 МБ.'; return; }
    if (enteredCoverUrl) {
        try {
            var parsedCoverUrl = new URL(enteredCoverUrl);
            if (parsedCoverUrl.protocol !== 'http:' && parsedCoverUrl.protocol !== 'https:') throw new Error('Unsupported protocol');
        } catch (invalidCoverUrl) {
            error.textContent = 'Вставь полную ссылку на изображение, начинающуюся с https:// или http://.';
            return;
        }
    }
    if (enteredAvatarUrl) {
        try {
            var parsedAvatarUrl = new URL(enteredAvatarUrl);
            if (parsedAvatarUrl.protocol !== 'http:' && parsedAvatarUrl.protocol !== 'https:') throw new Error('Unsupported protocol');
        } catch (invalidAvatarUrl) {
            error.textContent = 'Вставь прямую ссылку на аватарку, начинающуюся с https:// или http://.';
            return;
        }
    }
    button.disabled = true;
    button.textContent = coverFile || avatarFile ? 'Подготавливаю изображения…' : 'Сохраняю…';
    var savedCoverUrl = group.coverUrl || null;
    var savedAvatarUrl = group.avatarUrl || null;
    function prepareGroupImage(file) {
        if (typeof datingCompressPhoto !== 'function' || typeof datingBlobToDataUrl !== 'function') {
            return Promise.reject(new Error('Не удалось подготовить изображение. Обнови страницу и попробуй ещё раз.'));
        }
        return datingCompressPhoto(file).then(datingBlobToDataUrl).then(function(dataUrl) {
            if (!/^data:image\/webp;base64,/.test(dataUrl) || dataUrl.length > 400000) {
                throw new Error('Изображение не поместилось после сжатия. Выбери фото поменьше.');
            }
            return dataUrl;
        });
    }
    var coverPromise = coverFile
        ? prepareGroupImage(coverFile)
        : Promise.resolve(enteredCoverUrl || (groupCoverRemoved ? null : group.coverUrl || null));
    var avatarPromise = avatarFile
        ? prepareGroupImage(avatarFile)
        : Promise.resolve(enteredAvatarUrl || (groupAvatarRemoved ? null : group.avatarUrl || null));
    Promise.all([coverPromise, avatarPromise]).then(function(imageUrls) {
        savedCoverUrl = imageUrls[0];
        savedAvatarUrl = imageUrls[1];
        return db.ref('sites/' + SITE + '/groups/' + selectedCommunityId).update({ name: name, description: description, coverUrl: savedCoverUrl, avatarUrl: savedAvatarUrl });
    }).then(function() {
        groupsCache[selectedCommunityId].name = name;
        groupsCache[selectedCommunityId].description = description;
        groupsCache[selectedCommunityId].coverUrl = savedCoverUrl;
        groupsCache[selectedCommunityId].avatarUrl = savedAvatarUrl;
        groupCoverRemoved = false;
        groupAvatarRemoved = false;
        renderGroupDetailHeader();
        renderGroupDirectory();
        window.closeEditGroup();
    }).catch(function(saveError) {
        console.error('Не удалось сохранить профиль группы:', saveError);
        error.textContent = saveError.code === 'PERMISSION_DENIED'
            ? 'Нет прав на изменение группы. Проверь, что ты владелец этой группы.'
            : saveError.message || 'Не удалось сохранить изменения. Проверь подключение и попробуй ещё раз.';
    }).finally(function() { button.disabled = false; button.textContent = 'Сохранить'; });
};

window.joinGroup = function(id) {
    if (!USER_UID) { alert('Войди, чтобы вступить в группу.'); return; }
    if (!groupsCache[id]) return;
    db.ref('sites/' + SITE + '/group_members/' + id + '/' + USER_UID).set(true).catch(function(error) {
        alert('Не удалось вступить в группу: ' + error.message);
    });
};

window.leaveGroup = function() {
    var group = groupsCache[selectedCommunityId] || {};
    if (!selectedCommunityId || !USER_UID || group.ownerUid === USER_UID || group.leaderUid === USER_UID) return;
    db.ref('sites/' + SITE + '/group_members/' + selectedCommunityId + '/' + USER_UID).remove().then(function() {
        var badge = clanMemberBadgesCache[USER_UID] || {};
        if (badge.groupId === selectedCommunityId) return db.ref('sites/' + SITE + '/user_clan_badges/' + USER_UID).remove().then(function() {
            delete clanMemberBadgesCache[USER_UID];
            if (window.clearClanBadgeCache) window.clearClanBadgeCache(USER_UID);
        });
    }).catch(function(error) {
        alert('Не удалось покинуть группу: ' + error.message);
    });
};

window.openCreateGroup = function() {
    if (!USER_UID) { alert('Войди, чтобы создать группу.'); return; }
    groupCreateMode = 'group';
    var title = document.getElementById('newCommunityTitle');
    var button = document.getElementById('createGroupButton');
    if (title) title.textContent = 'Создать группу';
    if (button) button.textContent = 'Создать группу';
    var modal = document.getElementById('createCommunityModal');
    var name = document.getElementById('newGroupName');
    var description = document.getElementById('newGroupDescription');
    var error = document.getElementById('newGroupError');
    if (name) name.value = '';
    if (description) description.value = '';
    if (error) error.textContent = '';
    if (modal) modal.classList.add('open');
    if (name) setTimeout(function() { name.focus(); }, 80);
};

window.openCreateClan = function() {
    if (!USER_UID) { if (window.openLoginModal) window.openLoginModal(); return; }
    if (!clanLeaderGrant || !clanLeaderGrant.active) { alert('Сначала получи разрешение создать клан.'); return; }
    groupCreateMode = 'clan';
    var title = document.getElementById('newCommunityTitle');
    var button = document.getElementById('createGroupButton');
    if (title) title.textContent = 'Создать клан';
    if (button) button.textContent = 'Создать клан';
    var name = document.getElementById('newGroupName');
    var description = document.getElementById('newGroupDescription');
    var error = document.getElementById('newGroupError');
    if (name) name.value = clanLeaderGrant.clanName || '';
    if (description) description.value = '';
    if (error) error.textContent = '';
    var modal = document.getElementById('createCommunityModal');
    if (modal) modal.classList.add('open');
    if (name) setTimeout(function() { name.focus(); }, 80);
};

window.closeCreateGroup = function() {
    var modal = document.getElementById('createCommunityModal');
    if (modal) modal.classList.remove('open');
    groupCreateMode = 'group';
    var title = document.getElementById('newCommunityTitle');
    var button = document.getElementById('createGroupButton');
    if (title) title.textContent = 'Создать группу';
    if (button) button.textContent = 'Создать';
};

window.createGroup = function() {
    var nameInput = document.getElementById('newGroupName');
    var descriptionInput = document.getElementById('newGroupDescription');
    var error = document.getElementById('newGroupError');
    var button = document.getElementById('createGroupButton');
    var name = nameInput ? nameInput.value.trim() : '';
    if (name.length < 2) { if (error) error.textContent = 'Название должно содержать хотя бы 2 символа.'; if (nameInput) nameInput.focus(); return; }
    if (name.length > 60) { if (error) error.textContent = 'Название слишком длинное.'; return; }
    if (!USER_UID) { if (error) error.textContent = 'Войди, чтобы создать группу.'; return; }

    var groupRef = db.ref('sites/' + SITE + '/groups').push();
    var id = groupRef.key;
    var isClan = groupCreateMode === 'clan';
    if (isClan && (!clanLeaderGrant || !clanLeaderGrant.active)) { if (error) error.textContent = 'Твои права создателя клана больше не активны.'; return; }
    var group = { name: name, description: descriptionInput ? descriptionInput.value.trim().slice(0, 300) : '', ownerUid: USER_UID, ownerName: USER || 'Пользователь', createdAt: Date.now() };
    if (isClan) {
        group.isClan = true;
        group.leaderUid = USER_UID;
        group.leaderName = USER || 'Пользователь';
        group.clanBadge = clanLeaderGrant.badge || '♟';
    }
    var updates = {};
    updates['sites/' + SITE + '/groups/' + id] = group;
    updates['sites/' + SITE + '/group_members/' + id + '/' + USER_UID] = true;
    var announcementId = db.ref('sites/' + SITE + '/feed_posts').push().key;
    var announcement = {
        author: USER || 'Пользователь', authorUid: USER_UID, authorAvatar: null,
        text: isClan ? 'Создал новый клан' : 'Создал новую группу', timestamp: group.createdAt, likes: 0, commentCount: 0, reposts: 0,
        hashtags: [], media: [], sharedEntity: { kind: 'group', id: id, title: group.name, description: group.description || (isClan ? 'Новый клан CPM2 METAIMPERIYA' : 'Новая группа METAIMPERIYA'), image: '', isClan: isClan, badge: group.clanBadge || '' },
        deleted: null, deletedAt: null
    };
    updates['sites/' + SITE + '/feed_posts/' + announcementId] = announcement;
    updates['sites/' + SITE + '/user_posts/' + USER_UID + '/' + announcementId] = announcement;
    if (error) error.textContent = '';
    if (button) { button.disabled = true; button.textContent = 'Создаю…'; }
    db.ref().update(updates).then(function() {
        if (!isClan) return null;
        var badge = { groupId: id, groupName: name, badge: group.clanBadge, role: 'Лидер клана', assignedBy: USER_UID, assignedAt: Date.now() };
        return db.ref('sites/' + SITE + '/user_clan_badges/' + USER_UID).set(badge).then(function() { clanMemberBadgesCache[USER_UID] = badge; });
    }).then(function() {
        groupsCache[id] = group;
        if (!groupMembershipsCache[id]) groupMembershipsCache[id] = {};
        groupMembershipsCache[id][USER_UID] = true;
        window.closeCreateGroup();
        loadGroups();
        if (typeof loadFeed === 'function') loadFeed();
        window.openGroup(id);
    }).catch(function(saveError) {
        console.error('Не удалось создать группу:', saveError);
        if (error) {
            error.textContent = saveError.code === 'PERMISSION_DENIED' || /permission_denied|permission denied/i.test(saveError.message || '')
                ? 'Firebase отклонил создание. Проверь, что обновлённые Database Rules опубликованы в проекте.'
                : 'Не удалось создать группу. Проверь подключение и попробуй ещё раз.';
        }
    }).finally(function() {
        if (button) { button.disabled = false; button.textContent = 'Создать'; }
    });
};

window.publishGroupPost = function() {
    if (!selectedCommunityId || !USER_UID) return;
    var input = document.getElementById('groupPostText');
    var status = document.getElementById('groupPostStatus');
    var button = document.querySelector('.group-composer-footer button');
    var text = input ? input.value.trim() : '';
    if (!text) { if (status) status.textContent = 'Напиши текст записи.'; return; }
    if (text.length > 3000) { if (status) status.textContent = 'Запись слишком длинная.'; return; }
    if (button) { button.disabled = true; button.textContent = 'Публикую…'; }
    if (status) status.textContent = '';
    var postRef = db.ref('sites/' + SITE + '/group_posts/' + selectedCommunityId).push();
    postRef.set({ authorUid: USER_UID, authorName: USER || 'Пользователь', text: text, createdAt: Date.now() }).then(function() {
        if (input) input.value = '';
        if (status) status.textContent = 'Запись опубликована.';
    }).catch(function(error) {
        console.error('Не удалось опубликовать запись в группе:', error);
        if (status) status.textContent = error.code === 'PERMISSION_DENIED' || /permission_denied|permission denied/i.test(error.message || '')
            ? 'Firebase отклонил запись. Опубликуй Database Rules для групп; деплой сайта их не обновляет.'
            : 'Не удалось опубликовать запись. Вступи в группу и попробуй ещё раз.';
    }).finally(function() {
        if (button) { button.disabled = false; button.textContent = 'Опубликовать'; }
    });
};

var groupsSearchInput = document.getElementById('groupsSearch');
if (groupsSearchInput) groupsSearchInput.addEventListener('input', renderGroupDirectory);
var editGroupCoverInput = document.getElementById('editGroupCoverInput');
if (editGroupCoverInput) editGroupCoverInput.addEventListener('change', function() {
    var file = editGroupCoverInput.files && editGroupCoverInput.files[0];
    var error = document.getElementById('editGroupError');
    if (!file) return;
    if (!file.type.match(/^image\//i) || file.size >= 5 * 1024 * 1024) {
        if (error) error.textContent = !file.type.match(/^image\//i) ? 'Выбери файл изображения.' : 'Размер обложки должен быть меньше 5 МБ.';
        editGroupCoverInput.value = '';
        return;
    }
    if (error) error.textContent = '';
    var urlInput = document.getElementById('editGroupCoverUrl');
    if (urlInput) urlInput.value = '';
    groupCoverRemoved = false;
    if (groupCoverPreviewUrl) URL.revokeObjectURL(groupCoverPreviewUrl);
    groupCoverPreviewUrl = URL.createObjectURL(file);
    renderGroupCoverPreview(groupCoverPreviewUrl);
});
var editGroupCoverUrl = document.getElementById('editGroupCoverUrl');
if (editGroupCoverUrl) editGroupCoverUrl.addEventListener('input', function() {
    var fileInput = document.getElementById('editGroupCoverInput');
    if (fileInput) fileInput.value = '';
    if (groupCoverPreviewUrl) URL.revokeObjectURL(groupCoverPreviewUrl);
    groupCoverPreviewUrl = null;
    groupCoverRemoved = !editGroupCoverUrl.value.trim();
    renderGroupCoverPreview(editGroupCoverUrl.value.trim());
});
var editGroupAvatarInput = document.getElementById('editGroupAvatarInput');
if (editGroupAvatarInput) editGroupAvatarInput.addEventListener('change', function() {
    var file = editGroupAvatarInput.files && editGroupAvatarInput.files[0];
    var error = document.getElementById('editGroupError');
    if (!file) return;
    if (!file.type.match(/^image\//i) || file.size >= 5 * 1024 * 1024) {
        if (error) error.textContent = !file.type.match(/^image\//i) ? 'Выбери файл изображения для аватарки.' : 'Размер аватарки должен быть меньше 5 МБ.';
        editGroupAvatarInput.value = '';
        return;
    }
    if (error) error.textContent = '';
    var urlInput = document.getElementById('editGroupAvatarUrl');
    if (urlInput) urlInput.value = '';
    groupAvatarRemoved = false;
    if (groupAvatarPreviewUrl) URL.revokeObjectURL(groupAvatarPreviewUrl);
    groupAvatarPreviewUrl = URL.createObjectURL(file);
    renderGroupAvatarPreview(groupAvatarPreviewUrl);
});
var editGroupAvatarUrl = document.getElementById('editGroupAvatarUrl');
if (editGroupAvatarUrl) editGroupAvatarUrl.addEventListener('input', function() {
    var fileInput = document.getElementById('editGroupAvatarInput');
    if (fileInput) fileInput.value = '';
    if (groupAvatarPreviewUrl) URL.revokeObjectURL(groupAvatarPreviewUrl);
    groupAvatarPreviewUrl = null;
    groupAvatarRemoved = !editGroupAvatarUrl.value.trim();
    renderGroupAvatarPreview(editGroupAvatarUrl.value.trim());
});

window.addEventListener('beforeunload', function() {
    if (groupsDirectoryRef) groupsDirectoryRef.off();
    if (groupMembershipsRef) groupMembershipsRef.off();
    stopGroupDetailListeners();
});
