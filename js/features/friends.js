// ================================================================ */
// СИСТЕМА ДРУЗЕЙ — ПОЛНАЯ ВЕРСИЯ С РЕАЛЬНЫМ ВРЕМЕНЕМ
// ================================================================ */

// ================================================================ */
// 1. ПОЛУЧЕНИЕ СТАТУСА ДРУЖБЫ В РЕАЛЬНОМ ВРЕМЕНИ
// ================================================================ */

function getFriendStatusRealtime(myUid, targetUid, callback) {
    if (!myUid || !targetUid) { callback('none'); return; }
    if (myUid === targetUid) { callback('self'); return; }

    // Проверяем, друзья ли уже
    db.ref('sites/' + SITE + '/friends/' + myUid + '/' + targetUid).on('value', function(snap) {
        if (snap.val() === true) {
            localStorage.setItem('fs_' + myUid + '_' + targetUid, 'friend');
            callback('friend');
            return;
        }

        // Проверяем, есть ли входящая заявка
        db.ref('sites/' + SITE + '/friend_requests/' + myUid + '/' + targetUid).once('value', function(reqSnap) {
            var req = reqSnap.val();
            if (req && req.from === targetUid && req.status === 'pending') {
                localStorage.setItem('fs_' + myUid + '_' + targetUid, 'pending_received');
                callback('pending_received');
                return;
            }

            // Проверяем, есть ли исходящая заявка
            db.ref('sites/' + SITE + '/friend_requests/' + targetUid + '/' + myUid).once('value', function(reqSnap2) {
                var req2 = reqSnap2.val();
                if (req2 && req2.from === myUid && req2.status === 'pending') {
                    localStorage.setItem('fs_' + myUid + '_' + targetUid, 'pending_sent');
                    callback('pending_sent');
                    return;
                }

                localStorage.removeItem('fs_' + myUid + '_' + targetUid);
                callback('none');
            });
        });
    });
}

// ================================================================ */
// 2. ОТОБРАЖЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
// ================================================================ */

function friendActionHtml(status, targetUid) {
    if (status === 'friend') {
        return '<button class="people-action secondary" onclick="event.stopPropagation();removeFriend(\'' + targetUid + '\')">В друзьях</button>';
    }
    if (status === 'pending_sent') {
        return '<button class="people-action secondary" onclick="event.stopPropagation();cancelFriendRequest(\'' + targetUid + '\')">Заявка отправлена</button>';
    }
    if (status === 'pending_received') {
        return '<button class="people-action" onclick="event.stopPropagation();acceptFriendRequest(\'' + targetUid + '\')">Принять</button>' +
            '<button class="people-action secondary" onclick="event.stopPropagation();declineFriendRequest(\'' + targetUid + '\')">Отклонить</button>';
    }
    return '<button class="people-action" onclick="event.stopPropagation();sendFriendRequest(\'' + targetUid + '\')">＋ Добавить</button>';
}

function canInteractWithUser(targetUid, callback) {
    if (!USER_UID || !targetUid || targetUid === USER_UID) return callback(false);
    db.ref('sites/' + SITE + '/blocks/' + USER_UID + '/' + targetUid).once('value', function(snap) {
        callback(!snap.exists());
    }, function() { callback(false); });
}

function setProfileFriendAction(button, status, targetUid) {
    if (!button) return;
    button.className = 'friend-btn';
    button.disabled = false;
    button.onclick = null;
    if (status === 'friend') {
        button.classList.add('friend'); button.textContent = '🤝 Friends'; button.onclick = function() { removeFriend(targetUid); };
    } else if (status === 'pending_sent') {
        button.classList.add('pending'); button.textContent = '⏳ Request sent'; button.onclick = function() { cancelFriendRequest(targetUid); };
    } else if (status === 'pending_received') {
        button.classList.add('received'); button.textContent = '📩 Accept request'; button.onclick = function() { acceptFriendRequest(targetUid); };
    } else {
        button.classList.add('add'); button.textContent = '➕ Add friend'; button.onclick = function() { sendFriendRequest(targetUid); };
    }
}

var peopleDirectoryUsers = [];
var peopleLoadRequest = 0;
var peopleFilterTimer = null;
var peopleCursor = null;
var peopleHasMore = false;
var peoplePageBusy = false;
var peopleStatusCache = {};

function peopleNormalize(value) { return String(value || '').trim().toLocaleLowerCase('ru'); }

function peopleProfileDetails(user) { return user && user.profileDetails || {}; }

function updatePeopleFilterOptions() {
    var countries = {};
    var cities = {};
    peopleDirectoryUsers.forEach(function(user) {
        var details = peopleProfileDetails(user);
        if (details.country) countries[details.country] = true;
        if (details.city) cities[details.city] = true;
    });
    var countryList = document.getElementById('peopleCountryOptions');
    var cityList = document.getElementById('peopleCityOptions');
    if (countryList) countryList.innerHTML = Object.keys(countries).sort(function(a,b) { return a.localeCompare(b, 'ru'); }).map(function(value) { return '<option value="' + esc(value) + '"></option>'; }).join('');
    if (cityList) cityList.innerHTML = Object.keys(cities).sort(function(a,b) { return a.localeCompare(b, 'ru'); }).map(function(value) { return '<option value="' + esc(value) + '"></option>'; }).join('');
}

function getFilteredPeople() {
    return peopleDirectoryUsers;
}

function renderPeopleDirectory() {
    var container = document.getElementById('peopleList');
    if (!container) return;
    var filtered = getFilteredPeople();
    var page = filtered;
    var count = document.getElementById('peopleResultsCount');
    var moreButton = document.getElementById('peopleLoadMore');
    if (count) count.textContent = 'Показано: ' + filtered.length;
    if (moreButton) { moreButton.hidden = !peopleHasMore; moreButton.disabled = peoplePageBusy; moreButton.textContent = peoplePageBusy ? 'Загружаю…' : 'Показать ещё'; }
    if (!filtered.length) {
        container.innerHTML = '<div class="people-directory-empty"><strong>Никого не нашли</strong><span>Попробуй изменить имя, страну или город.</span></div>';
        return;
    }
    container.innerHTML = page.map(function(person) {
        var id = person.uid;
        var user = person.user;
        var name = user.name || 'Участник';
        var details = peopleProfileDetails(user);
        var location = [details.city || user.city, details.country || user.country].filter(Boolean).join(', ');
        return '<article class="people-item" data-people-id="' + esc(id) + '"><button type="button" class="people-item-main" onclick="viewUser(\'' + esc(id) + '\')"><span class="avatar-wrap" id="pava-' + esc(id) + '"><span class="letter">' + esc(Array.from(name)[0] || '?') + '</span></span><span class="info"><strong class="name">' + esc(name) + '</strong>' + (location ? '<span class="people-location">⌖ ' + esc(location) + '</span>' : '') + '<span class="status" id="pstatus-' + esc(id) + '">Проверяем связь…</span></span></button><div class="people-actions" id="paction-' + esc(id) + '"></div></article>';
    }).join('');
    page.forEach(function(person) {
        var id = person.uid;
        var avatar = document.getElementById('pava-' + id);
        if (avatar) renderAvatar(id, avatar, (person.user.name || '?').charAt(0));
        var cached = peopleStatusCache[id];
        if (cached) {
            var statusEl = document.getElementById('pstatus-' + id);
            var actionEl = document.getElementById('paction-' + id);
            var labels = { friend: '🤝 Уже друзья', pending_sent: '⏳ Заявка отправлена', pending_received: '📩 Заявка тебе', none: 'Новый участник' };
            if (statusEl) statusEl.textContent = labels[cached] || '';
            if (actionEl) actionEl.innerHTML = friendActionHtml(cached, id);
        }
    });

    var unresolved = page.filter(function(person) { return !peopleStatusCache[person.uid]; });
    if (!unresolved.length) return;
    Promise.all([
        db.ref('sites/' + SITE + '/friends/' + USER_UID).once('value'),
        db.ref('sites/' + SITE + '/friend_requests/' + USER_UID).once('value')
    ]).then(function(snapshots) {
        var friends = snapshots[0].val() || {};
        var incoming = snapshots[1].val() || {};
        return Promise.all(unresolved.map(function(person) {
            var id = person.uid;
            if (friends[id] === true) return Promise.resolve({ uid: id, status: 'friend' });
            var incomingRequest = incoming[id];
            if (incomingRequest && incomingRequest.from === id && incomingRequest.status === 'pending') return Promise.resolve({ uid: id, status: 'pending_received' });
            return db.ref('sites/' + SITE + '/friend_requests/' + id + '/' + USER_UID).once('value').then(function(snapshot) {
                var outgoing = snapshot.val();
                return { uid: id, status: outgoing && outgoing.from === USER_UID && outgoing.status === 'pending' ? 'pending_sent' : 'none' };
            }).catch(function() { return { uid: id, status: 'none' }; });
        }));
    }).then(function(statuses) {
        if (!statuses) return;
        statuses.forEach(function(entry) {
            peopleStatusCache[entry.uid] = entry.status;
            var statusEl = document.getElementById('pstatus-' + entry.uid);
            var actionEl = document.getElementById('paction-' + entry.uid);
            var labels = { friend: '🤝 Уже друзья', pending_sent: '⏳ Заявка отправлена', pending_received: '📩 Заявка тебе', none: 'Новый участник' };
            if (statusEl) statusEl.textContent = labels[entry.status] || '';
            if (actionEl) actionEl.innerHTML = friendActionHtml(entry.status, entry.uid);
        });
    }).catch(function(error) { console.warn('Не удалось обновить статусы участников:', error); });
}

function loadMorePeople() {
    if (peoplePageBusy || !peopleHasMore) return;
    fetchPeoplePage(false);
}

function fetchPeoplePage(reset) {
    if (!USER_UID) {
        document.getElementById('peopleList').innerHTML = '<div class="people-directory-empty">Войди, чтобы находить участников.</div>';
        return;
    }
    var searchInput = document.getElementById('peopleSearch');
    var countryInput = document.getElementById('peopleCountryFilter');
    var cityInput = document.getElementById('peopleCityFilter');
    var sortInput = document.getElementById('peopleSort');
    var filters = {
        query: searchInput ? searchInput.value.trim() : '',
        country: countryInput ? countryInput.value.trim() : '',
        city: cityInput ? cityInput.value.trim() : '',
        sort: sortInput ? sortInput.value : 'recent'
    };
    var filterKey = JSON.stringify(filters);
    if (reset || filterKey !== peopleFilterKey) {
        peopleFilterKey = filterKey;
        peopleDirectoryUsers = [];
        peopleCursor = null;
        peopleHasMore = false;
        peopleStatusCache = {};
        var list = document.getElementById('peopleList');
        if (list) list.innerHTML = '<div class="people-directory-empty">Ищем участников…</div>';
    }
    var requestId = ++peopleLoadRequest;
    peoplePageBusy = true;
    renderPeopleDirectory();
    var button = document.getElementById('peopleLoadMore');
    if (button) { button.hidden = false; button.disabled = true; button.textContent = 'Загружаю…'; }
    firebase.functions().httpsCallable('searchPeople')({ site: SITE, query: filters.query, country: filters.country, city: filters.city, sort: filters.sort, cursor: peopleCursor }).then(function(result) {
        if (requestId !== peopleLoadRequest) return;
        var data = result.data || {};
        peopleDirectoryUsers = peopleDirectoryUsers.concat(data.people || []);
        peopleCursor = data.cursor || null;
        peopleHasMore = !!data.hasMore;
        peoplePageBusy = false;
        updatePeopleFilterOptions();
        renderPeopleDirectory();
        if (!peopleDirectoryUsers.length && peopleHasMore) {
            var more = document.getElementById('peopleLoadMore');
            if (more) more.textContent = 'Искать дальше';
        }
    }).catch(function(error) {
        if (requestId !== peopleLoadRequest) return;
        peoplePageBusy = false;
        var list = document.getElementById('peopleList');
        if (list) list.innerHTML = '<div class="people-directory-empty"><strong>Не удалось загрузить список</strong><span>Проверь подключение и публикацию Cloud Functions.</span></div>';
        if (button) { button.hidden = true; }
        console.error('Не удалось загрузить каталог участников:', error);
    });
}

var peopleFilterKey = '';
function loadPeople() { fetchPeoplePage(true); }

window.loadMorePeople = loadMorePeople;
window.loadPeople = loadPeople;

document.addEventListener('DOMContentLoaded', function() {
    ['peopleSearch', 'peopleCountryFilter', 'peopleCityFilter'].forEach(function(id) {
        var input = document.getElementById(id);
        if (input) input.addEventListener('input', function() {
            clearTimeout(peopleFilterTimer);
            peopleFilterTimer = setTimeout(function() { loadPeople(); }, 250);
        });
    });
    var sort = document.getElementById('peopleSort');
    if (sort) sort.addEventListener('change', function() { loadPeople(); });
});

// ================================================================ */
// 3. ОТПРАВКА ЗАЯВКИ
// ================================================================ */

function sendFriendRequest(targetUid) {
    if (!USER_UID || targetUid === USER_UID) {
        alert('Нельзя добавить себя');
        return;
    }

    canInteractWithUser(targetUid, function(allowed) {
        if (!allowed) {
            alert('Сначала снимите блокировку с этого пользователя.');
            return;
        }
    db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + targetUid).once('value', function(friendSnap) {
        if (friendSnap.val() === true) {
            alert('✅ Вы уже друзья!');
            return;
        }

        db.ref('sites/' + SITE + '/friend_requests/' + USER_UID + '/' + targetUid).once('value', function(reqSnap) {
            if (reqSnap.val()) {
                alert('⏳ Запрос уже отправлен');
                return;
            }

            var requestData = {
                from: USER_UID,
                fromName: USER,
                to: targetUid,
                timestamp: Date.now(),
                status: 'pending'
            };

            var updates = {};
            updates['sites/' + SITE + '/friend_requests/' + USER_UID + '/' + targetUid] = requestData;
            updates['sites/' + SITE + '/friend_requests/' + targetUid + '/' + USER_UID] = requestData;

            db.ref().update(updates).then(function() {
                localStorage.setItem('fs_' + USER_UID + '_' + targetUid, 'pending_sent');

                sendNotification(targetUid, {
                    type: 'friend_request',
                    from: USER_UID,
                    fromName: USER,
                    text: USER + ' отправил(а) вам заявку в друзья',
                    timestamp: Date.now()
                });

                alert('✅ Заявка отправлена!');
                if (VIEWING_USER) loadProfile();
                loadPeople();
            });
        });
    });
    });
}

// ================================================================ */
// 4. ОТМЕНА ЗАЯВКИ
// ================================================================ */

function cancelFriendRequest(targetUid) {
    if (!USER_UID) return;
    if (!confirm('Отменить заявку в друзья?')) return;

    var updates = {};
    updates['sites/' + SITE + '/friend_requests/' + USER_UID + '/' + targetUid] = null;
    updates['sites/' + SITE + '/friend_requests/' + targetUid + '/' + USER_UID] = null;

    db.ref().update(updates).then(function() {
        localStorage.removeItem('fs_' + USER_UID + '_' + targetUid);
        alert('✅ Заявка отменена');
        if (VIEWING_USER) loadProfile();
        loadPeople();
    });
}

// ================================================================ */
// 5. ПРИНЯТИЕ ЗАЯВКИ — С ОБНОВЛЕНИЕМ СТАТУСА
// ================================================================ */

function acceptFriendRequest(fromUid) {
    if (!USER_UID) return;
    if (!confirm('Принять заявку в друзья?')) return;

    var updates = {};
    updates['sites/' + SITE + '/friends/' + USER_UID + '/' + fromUid] = true;
    updates['sites/' + SITE + '/friends/' + fromUid + '/' + USER_UID] = true;
    updates['sites/' + SITE + '/friend_requests/' + USER_UID + '/' + fromUid] = null;
    updates['sites/' + SITE + '/friend_requests/' + fromUid + '/' + USER_UID] = null;

    db.ref().update(updates).then(function() {
        // 👇 ОБНОВЛЯЕМ СТАТУС В ЛОКАЛЬНОМ ХРАНИЛИЩЕ
        localStorage.setItem('fs_' + USER_UID + '_' + fromUid, 'friend');
        localStorage.setItem('fs_' + fromUid + '_' + USER_UID, 'friend');

        sendNotification(fromUid, {
            type: 'friend_accepted',
            from: USER_UID,
            fromName: USER,
            text: USER + ' принял(а) вашу заявку в друзья!',
            timestamp: Date.now()
        });

        alert('✅ Теперь вы друзья!');
        if (VIEWING_USER) loadProfile();
        loadPeople();
        loadFriends(USER_UID);
        // 👇 ПЕРЕЗАГРУЖАЕМ УВЕДОМЛЕНИЯ
        if (document.getElementById('notificationsModal') && document.getElementById('notificationsModal').classList.contains('open')) {
            openNotifications();
        }
    });
}

// ================================================================ */
// 6. ОТКЛОНЕНИЕ ЗАЯВКИ
// ================================================================ */

function declineFriendRequest(fromUid) {
    if (!USER_UID) return;
    if (!confirm('Отклонить заявку в друзья?')) return;

    var updates = {};
    updates['sites/' + SITE + '/friend_requests/' + USER_UID + '/' + fromUid] = null;
    updates['sites/' + SITE + '/friend_requests/' + fromUid + '/' + USER_UID] = null;

    db.ref().update(updates).then(function() {
        localStorage.removeItem('fs_' + USER_UID + '_' + fromUid);
        alert('✅ Заявка отклонена');
        if (VIEWING_USER) loadProfile();
        loadPeople();
        closeNotifications();
    });
}

// ================================================================ */
// 7. УДАЛЕНИЕ ИЗ ДРУЗЕЙ
// ================================================================ */

function removeFriend(targetUid) {
    if (!USER_UID) return;
    if (!confirm('Удалить из друзей?')) return;

    var updates = {};
    updates['sites/' + SITE + '/friends/' + USER_UID + '/' + targetUid] = null;
    updates['sites/' + SITE + '/friends/' + targetUid + '/' + USER_UID] = null;

    db.ref().update(updates).then(function() {
        localStorage.removeItem('fs_' + USER_UID + '_' + targetUid);
        localStorage.removeItem('fs_' + targetUid + '_' + USER_UID);
        alert('✅ Пользователь удалён из друзей');
        if (VIEWING_USER) loadProfile();
        loadPeople();
        loadFriends(USER_UID);
    });
}

// ================================================================ */
// 8. ЗАГРУЗКА ДРУЗЕЙ
// ================================================================ */

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

// ================================================================ */
// 9. ЗАГРУЗКА ЗАЯВОК
// ================================================================ */

function loadFriendRequests() {
    if (!USER_UID) return;

    db.ref('sites/' + SITE + '/friend_requests/' + USER_UID).on('value', function(snap) {
        var requests = snap.val() || {};
        var keys = Object.keys(requests);
        var incoming = keys.filter(function(k) {
            return requests[k] && requests[k].from === k && requests[k].status === 'pending';
        });

        var badge = document.getElementById('notifBadge');
        if (badge) {
            if (incoming.length > 0) {
                badge.style.display = 'inline';
                badge.textContent = incoming.length;
            } else {
                badge.style.display = 'none';
            }
        }
    });
}
