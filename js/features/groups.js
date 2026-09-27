// ================================================================
// СООБЩЕСТВА: ГРУППЫ И ИХ ОТДЕЛЬНЫЕ ЛЕНТЫ
// ================================================================

var groupsDirectoryRef = null;
var groupMembershipsRef = null;
var groupDetailMembershipRef = null;
var groupDetailPostsRef = null;
var groupsCache = {};
var groupMembershipsCache = {};
var selectedCommunityId = null;
var selectedGroupIsMember = false;

function groupEscape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(char) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
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
            '<span class="community-card-icon">' + groupEscape(Array.from((group.name || 'Группа').trim())[0] || '👥') + '</span><span class="community-card-copy"><strong>' + groupEscape(group.name || 'Группа') + '</strong>' +
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
    header.innerHTML = '<div class="group-profile-cover"><span>СООБЩЕСТВО</span></div><div class="group-profile-main">' +
        '<div class="group-profile-avatar">' + groupEscape(initial) + '</div><div class="group-profile-identity"><h2>' + groupEscape(group.name || 'Группа') +
        '</h2><span>Группа · ' + Object.keys(members).length + ' участников' + (created ? ' · создана ' + groupEscape(created) : '') + '</span></div>' +
        (group.ownerUid === USER_UID ? '<button type="button" class="group-settings-button" onclick="openEditGroup()">⚙ Настроить</button>' : '') + '</div>' +
        '<p class="group-profile-description">' + groupEscape(group.description || 'У этой группы пока нет описания.') + '</p>';
    var about = document.getElementById('groupAboutPanel');
    if (about) about.innerHTML = '<h3>Информация о группе</h3><p>' + groupEscape(group.description || 'Описание пока не добавлено.') + '</p><dl>' +
        '<div><dt>Создатель</dt><dd>' + groupEscape(group.ownerName || 'Участник METAIMPERIYA') + '</dd></div>' +
        '<div><dt>Участников</dt><dd>' + Object.keys(members).length + '</dd></div>' +
        (created ? '<div><dt>Создана</dt><dd>' + groupEscape(created) + '</dd></div>' : '') + '</dl>';
}

function renderGroupMembership(isMember) {
    var controls = document.getElementById('groupMembership');
    var composer = document.getElementById('groupPostComposer');
    if (!controls || !selectedCommunityId) return;
    var group = groupsCache[selectedCommunityId] || {};
    var isOwner = group.ownerUid === USER_UID;
    selectedGroupIsMember = isMember;
    controls.innerHTML = isMember
        ? '<div class="group-member-state">' + (isOwner ? 'Ты создатель этой группы' : 'Ты участник этой группы') + '</div>' + (!isOwner ? '<button type="button" class="group-leave-button" onclick="leaveGroup()">Покинуть группу</button>' : '')
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
        feed.appendChild(card);
    });
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
    if (!USER_UID) {
        groupsCache = {};
        groupMembershipsCache = {};
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
    }, function(error) { console.warn('Не удалось загрузить участников групп:', error); });
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
    if (!group || group.ownerUid !== USER_UID) return;
    document.getElementById('editGroupName').value = group.name || '';
    document.getElementById('editGroupDescription').value = group.description || '';
    document.getElementById('editGroupError').textContent = '';
    document.getElementById('editCommunityModal').classList.add('open');
};

window.closeEditGroup = function() {
    document.getElementById('editCommunityModal').classList.remove('open');
};

window.saveGroupDetails = function() {
    var group = groupsCache[selectedCommunityId];
    var error = document.getElementById('editGroupError');
    var button = document.getElementById('saveGroupButton');
    if (!group || group.ownerUid !== USER_UID) return;
    var name = document.getElementById('editGroupName').value.trim();
    var description = document.getElementById('editGroupDescription').value.trim().slice(0, 300);
    if (name.length < 2) { error.textContent = 'Название должно содержать хотя бы 2 символа.'; return; }
    button.disabled = true;
    button.textContent = 'Сохраняю…';
    db.ref('sites/' + SITE + '/groups/' + selectedCommunityId).update({ name: name, description: description }).then(function() {
        groupsCache[selectedCommunityId].name = name;
        groupsCache[selectedCommunityId].description = description;
        renderGroupDetailHeader();
        renderGroupDirectory();
        window.closeEditGroup();
    }).catch(function(saveError) {
        error.textContent = saveError.code === 'PERMISSION_DENIED' ? 'Нет прав на изменение группы.' : 'Не удалось сохранить изменения.';
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
    if (!selectedCommunityId || !USER_UID || (groupsCache[selectedCommunityId] || {}).ownerUid === USER_UID) return;
    db.ref('sites/' + SITE + '/group_members/' + selectedCommunityId + '/' + USER_UID).remove().catch(function(error) {
        alert('Не удалось покинуть группу: ' + error.message);
    });
};

window.openCreateGroup = function() {
    if (!USER_UID) { alert('Войди, чтобы создать группу.'); return; }
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

window.closeCreateGroup = function() {
    var modal = document.getElementById('createCommunityModal');
    if (modal) modal.classList.remove('open');
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
    var group = { name: name, description: descriptionInput ? descriptionInput.value.trim().slice(0, 300) : '', ownerUid: USER_UID, ownerName: USER || 'Пользователь', createdAt: Date.now() };
    var updates = {};
    updates['sites/' + SITE + '/groups/' + id] = group;
    updates['sites/' + SITE + '/group_members/' + id + '/' + USER_UID] = true;
    if (error) error.textContent = '';
    if (button) { button.disabled = true; button.textContent = 'Создаю…'; }
    db.ref().update(updates).then(function() {
        groupsCache[id] = group;
        if (!groupMembershipsCache[id]) groupMembershipsCache[id] = {};
        groupMembershipsCache[id][USER_UID] = true;
        window.closeCreateGroup();
        loadGroups();
        window.openGroup(id);
    }).catch(function(saveError) {
        console.error('Не удалось создать группу:', saveError);
        if (error) {
            error.textContent = saveError.code === 'PERMISSION_DENIED' || /permission_denied|permission denied/i.test(saveError.message || '')
                ? 'Firebase отклонил создание: опубликуй Database Rules из проекта (firebase deploy --only database --project myecosystem-e6414). Деплой сайта правила не обновляет.'
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

window.addEventListener('beforeunload', function() {
    if (groupsDirectoryRef) groupsDirectoryRef.off();
    if (groupMembershipsRef) groupMembershipsRef.off();
    stopGroupDetailListeners();
});
