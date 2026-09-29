// Per-user reactions, friend tags and unique post views.
(function() {
    'use strict';

    var rootPath = 'sites/' + SITE;
    var trackedViews = Object.create(null);
    var escHtml = function(value) {
        var node = document.createElement('span');
        node.textContent = String(value == null ? '' : value);
        return node.innerHTML;
    };

    function socialKey(postId, type, authorUid) {
        var bucket = type === 'foto' ? 'foto' : type && type.indexOf('datingprofile:') === 0 ? type : type === 'profile' ? 'profile_' + (authorUid || VIEWING_USER || USER_UID) : 'feed';
        return encodeURIComponent(bucket + '_' + postId).replace(/\./g, '%2E');
    }

    function postRef(branch, postId, type, authorUid) {
        return db.ref(rootPath + '/' + branch + '/' + socialKey(postId, type, authorUid));
    }

    function setCounts(card, values) {
        if (!card) return;
        Object.keys(values).forEach(function(key) {
            var target = card.querySelector('[data-count="' + key + '"]');
            if (target) target.textContent = values[key];
        });
        ['like', 'dislike'].forEach(function(kind) {
            var button = card.querySelector('[data-social-action="reaction"][data-kind="' + kind + '"]');
            if (button && Object.prototype.hasOwnProperty.call(values, 'mine')) button.classList.toggle('is-selected', values.mine === kind);
        });
    }

    function loadCounts(card, postId, type, authorUid, legacyLikes) {
        // A denied optional read (friend tags/views) must not suppress reaction counts.
        postRef('post_reactions', postId, type, authorUid).once('value').then(function(snap) {
            if (!card.isConnected) return;
            var reactions = snap.val() || {};
            var counts = { like: Number(legacyLikes || 0), dislike: 0, mine: reactions[USER_UID] || '' };
            Object.keys(reactions).forEach(function(uid) {
                if (reactions[uid] === 'like') counts.like++;
                if (reactions[uid] === 'dislike') counts.dislike++;
            });
            setCounts(card, counts);
        }).catch(function(error) { console.warn('Не удалось загрузить реакции публикации:', error); });

        postRef('post_mentions', postId, type, authorUid).once('value').then(function(snap) {
            if (!card.isConnected) return;
            var mentions = snap.val() || {};
            var tagged = Object.create(null);
            Object.keys(mentions).forEach(function(taggerUid) {
                Object.keys(mentions[taggerUid] || {}).forEach(function(targetUid) { tagged[targetUid] = true; });
            });
            setCounts(card, { mentions: Object.keys(tagged).length });
        }).catch(function(error) { console.warn('Не удалось загрузить отметки друзей:', error); });

        postRef('post_views', postId, type, authorUid).once('value').then(function(snap) {
            if (card.isConnected) setCounts(card, { views: Object.keys(snap.val() || {}).length });
        }).catch(function(error) { console.warn('Не удалось загрузить просмотры публикации:', error); });
    }

    function buildStatsMarkup(postId, type, authorUid, legacyLikes, comments, reposts) {
        var attrs = ' data-post-id="' + escHtml(postId) + '" data-post-type="' + escHtml(type) + '" data-author-uid="' + escHtml(authorUid || '') + '"';
        return '<button type="button" data-social-action="reaction" data-kind="like"' + attrs + ' aria-label="Нравится">👍 <span data-count="like">' + Number(legacyLikes || 0) + '</span></button>' +
            '<button type="button" data-social-action="reaction" data-kind="dislike"' + attrs + ' aria-label="Не нравится">👎 <span data-count="dislike">0</span></button>' +
            '<span class="post-social-mention-control"><button type="button" data-social-action="pick-friends"' + attrs + ' aria-label="Отметить друзей">👤</button><button type="button" data-social-action="show-mentions"' + attrs + ' aria-label="Посмотреть отмеченных"><span data-count="mentions">0</span></button></span>' +
            '<button type="button" data-social-action="comments"' + attrs + '>💬 <span id="commentCount_' + escHtml(postId) + '">' + Number(comments || 0) + '</span></button>' +
            '<button type="button" data-social-action="repost"' + attrs + '>🔁 <span id="repostCount_' + escHtml(postId) + '">' + Number(reposts || 0) + '</span></button>' +
            '<button type="button" data-social-action="show-views"' + attrs + ' aria-label="Кто посмотрел">👁 <span data-count="views">0</span></button>';
    }

    window.enhancePostSocialActions = function(card, post, type) {
        var stats = card.querySelector('.stats');
        if (!stats) return;
        stats.removeAttribute('onclick');
        card.dataset.legacyLikes = Number(post.likes || 0);
        stats.classList.add('post-social-stats');
        stats.innerHTML = buildStatsMarkup(post.id, type, post.authorUid, post.likes, post.commentCount, post.reposts);
        loadCounts(card, post.id, type, post.authorUid, post.likes);
        watchView(card, post.id, type, post.authorUid);
    };

    function watchView(card, postId, type, authorUid) {
        if (!USER_UID || USER_UID === authorUid || !window.IntersectionObserver) return;
        var key = socialKey(postId, type, authorUid);
        if (trackedViews[key]) return;
        var timer = null;
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
                    if (!timer && !trackedViews[key]) timer = setTimeout(recordView, 1800);
                } else if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
            });
        }, { threshold: [0, 0.6, 1] });
        observer.observe(card);
        function recordView() {
            timer = null;
            if (trackedViews[key]) return;
            trackedViews[key] = true;
            observer.disconnect();
            postRef('post_views', postId, type, authorUid).child(USER_UID).transaction(function(current) {
                return current || Date.now();
            }).then(function() { loadCounts(card, postId, type, authorUid, card.dataset.legacyLikes); })
                .catch(function(error) { delete trackedViews[key]; console.warn('Не удалось записать просмотр:', error); });
        }
    }

    function modal(title, body) {
        var host = document.getElementById('modalsContainer') || document.body;
        var old = document.getElementById('postSocialModal');
        if (old) old.remove();
        var wrap = document.createElement('div');
        wrap.id = 'postSocialModal';
        wrap.className = 'post-social-modal';
        wrap.innerHTML = '<div class="post-social-dialog" role="dialog" aria-modal="true"><header><strong>' + escHtml(title) + '</strong><button type="button" data-social-close aria-label="Закрыть">×</button></header><div class="post-social-dialog-body">' + body + '</div></div>';
        host.appendChild(wrap);
        wrap.addEventListener('click', function(event) { if (event.target === wrap || event.target.closest('[data-social-close]')) wrap.remove(); });
        return wrap;
    }

    function loadFriends() {
        return Promise.all([
            db.ref(rootPath + '/friends/' + USER_UID).once('value'),
            db.ref(rootPath + '/all_users').once('value')
        ]).then(function(snaps) {
            var friendship = snaps[0].val() || {};
            var users = snaps[1].val() || {};
            return Object.keys(friendship).filter(function(uid) { return friendship[uid] === true && users[uid]; }).map(function(uid) {
                return { uid: uid, name: users[uid].name || 'Пользователь' };
            }).sort(function(a, b) { return a.name.localeCompare(b.name, 'ru'); });
        });
    }

    window.openPostMentionPicker = function(postId, type, authorUid) {
        if (!USER_UID) { alert('Войдите, чтобы отметить друзей.'); return; }
        var view = modal('Отметить друзей', '<div class="post-social-state">Загружаем список друзей…</div>');
        Promise.all([loadFriends(), postRef('post_mentions', postId, type, authorUid).child(USER_UID).once('value')]).then(function(results) {
            var friends = results[0];
            var selected = results[1].val() || {};
            var body = (friends.length ? '<input type="search" class="post-social-search" data-friend-search placeholder="Найти друга…" autocomplete="off">' : '') + '<div class="post-social-friend-list">' + (friends.length ? friends.map(function(friend) {
                return '<label><input type="checkbox" value="' + escHtml(friend.uid) + '"' + (selected[friend.uid] ? ' checked' : '') + '><span>' + escHtml(friend.name) + '</span></label>';
            }).join('') : '<div class="post-social-state">Сначала добавь друзей в свой список.</div>') + '</div>' +
                (friends.length ? '<button type="button" class="post-social-submit" data-save-mentions>Сохранить отметки</button>' : '');
            view.querySelector('.post-social-dialog-body').innerHTML = body;
            var search = view.querySelector('[data-friend-search]');
            if (search) search.addEventListener('input', function() {
                var query = search.value.trim().toLocaleLowerCase();
                view.querySelectorAll('.post-social-friend-list label').forEach(function(row) {
                    row.hidden = query && !row.textContent.toLocaleLowerCase().includes(query);
                });
            });
            var save = view.querySelector('[data-save-mentions]');
            if (save) save.addEventListener('click', function() {
                var checked = Array.from(view.querySelectorAll('input[type="checkbox"]:checked')).map(function(input) { return input.value; });
                save.disabled = true;
                save.textContent = 'Сохраняем…';
                postRef('post_mentions', postId, type, authorUid).child(USER_UID).once('value').then(function(snap) {
                    var previous = snap.val() || {};
                    var updates = {};
                    Object.keys(previous).forEach(function(uid) { if (checked.indexOf(uid) === -1) updates[uid] = null; });
                    checked.forEach(function(uid) { if (!previous[uid]) updates[uid] = true; });
                    var rootUpdates = {};
                    Object.keys(updates).forEach(function(uid) {
                        rootUpdates[rootPath + '/post_mentions/' + socialKey(postId, type, authorUid) + '/' + USER_UID + '/' + uid] = updates[uid];
                    });
                    return (Object.keys(rootUpdates).length ? db.ref().update(rootUpdates) : Promise.resolve()).then(function() {
                        checked.forEach(function(uid) {
                            if (!previous[uid] && typeof window.sendNotification === 'function') window.sendNotification(uid, {
                                type: 'post_mention', fromUid: USER_UID, from: USER, text: USER + ' отметил(а) вас в публикации', postId: postId, postType: type, timestamp: Date.now()
                            });
                        });
                    });
                }).then(function() {
                    view.remove();
                    document.querySelectorAll('.post[data-id="' + postId + '"]').forEach(function(card) { loadCounts(card, postId, type, authorUid, card.dataset.legacyLikes); });
                }).catch(function(error) { save.disabled = false; save.textContent = 'Сохранить отметки'; alert('Не получилось сохранить отметки: ' + (error.message || 'ошибка доступа')); });
            });
        }).catch(function(error) { view.querySelector('.post-social-dialog-body').innerHTML = '<div class="post-social-state">Не удалось загрузить друзей: ' + escHtml(error.message || 'проверь подключение') + '</div>'; });
    };

    function showTaggedPeople(postId, type, authorUid) {
        var view = modal('Отмеченные друзья', '<div class="post-social-state">Загрузка…</div>');
        Promise.all([
            postRef('post_mentions', postId, type, authorUid).once('value'),
            db.ref(rootPath + '/all_users').once('value')
        ]).then(function(snaps) {
            var mentions = snaps[0].val() || {};
            var users = snaps[1].val() || {};
            var rows = [];
            Object.keys(mentions).forEach(function(taggerUid) {
                Object.keys(mentions[taggerUid] || {}).forEach(function(uid) {
                    rows.push({ uid: uid, name: users[uid] && users[uid].name || 'Пользователь', tagger: users[taggerUid] && users[taggerUid].name || 'Пользователь' });
                });
            });
            rows.sort(function(a, b) { return a.name.localeCompare(b.name, 'ru'); });
            view.querySelector('.post-social-dialog-body').innerHTML = rows.length
                ? '<div class="post-social-person-list">' + rows.map(function(row) { return '<div><button type="button" data-social-user="' + escHtml(row.uid) + '"><strong>' + escHtml(row.name) + '</strong></button><span>отметил(а): ' + escHtml(row.tagger) + '</span></div>'; }).join('') + '</div>'
                : '<div class="post-social-state">Пока никого не отметили.</div>';
        }).catch(function(error) { view.querySelector('.post-social-dialog-body').innerHTML = '<div class="post-social-state">Не удалось загрузить список: ' + escHtml(error.message || '') + '</div>'; });
    }

    window.openPostMentionList = showTaggedPeople;

    window.openPostViews = function(postId, type, authorUid) {
        var view = modal('Просмотры публикации', '<div class="post-social-state">Загрузка…</div>');
        Promise.all([
            postRef('post_views', postId, type, authorUid).once('value'),
            db.ref(rootPath + '/all_users').once('value')
        ]).then(function(snaps) {
            var views = snaps[0].val() || {};
            var users = snaps[1].val() || {};
            var viewers = Object.keys(views).sort(function(a, b) { return Number(views[b] || 0) - Number(views[a] || 0); });
            view.querySelector('.post-social-dialog-body').innerHTML = viewers.length
                ? '<div class="post-social-person-list">' + viewers.map(function(uid) { return '<div><button type="button" data-social-user="' + escHtml(uid) + '"><strong>' + escHtml(users[uid] && users[uid].name || 'Пользователь') + '</strong></button><span>' + new Date(Number(views[uid]) || 0).toLocaleString('ru-RU') + '</span></div>'; }).join('') + '</div>'
                : '<div class="post-social-state">Просмотров пока нет.</div>';
        }).catch(function(error) { view.querySelector('.post-social-dialog-body').innerHTML = '<div class="post-social-state">Не удалось загрузить просмотры: ' + escHtml(error.message || '') + '</div>'; });
    };

    document.addEventListener('click', function(event) {
        var userButton = event.target.closest('[data-social-user]');
        if (userButton) { viewUser(userButton.getAttribute('data-social-user')); return; }
        var button = event.target.closest('[data-social-action]');
        if (!button) return;
        var postId = button.dataset.postId;
        var type = button.dataset.postType;
        var authorUid = button.dataset.authorUid || '';
        var card = button.closest('.post');
        if (button.dataset.socialAction === 'reaction') {
            if (!USER_UID) { alert('Войдите, чтобы оценить публикацию.'); return; }
            var ref = postRef('post_reactions', postId, type, authorUid).child(USER_UID);
            var kind = button.dataset.kind;
            button.disabled = true;
            ref.transaction(function(current) { return current === kind ? null : kind; }).then(function() {
                if (card) loadCounts(card, postId, type, authorUid, card.dataset.legacyLikes);
            }).catch(function(error) { alert('Не удалось сохранить реакцию: ' + (error.message || 'ошибка доступа')); })
                .finally(function() { button.disabled = false; });
        } else if (button.dataset.socialAction === 'pick-friends') window.openPostMentionPicker(postId, type, authorUid);
        else if (button.dataset.socialAction === 'show-mentions') showTaggedPeople(postId, type, authorUid);
        else if (button.dataset.socialAction === 'show-views') window.openPostViews(postId, type, authorUid);
        else if (button.dataset.socialAction === 'comments') window.toggleComments(postId, type);
        else if (button.dataset.socialAction === 'repost') window.openRepost(postId, type);
    });
})();
