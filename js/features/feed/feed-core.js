// ================================================================
// ЛЕНТА — ОСНОВНАЯ ЛОГИКА
// ================================================================

var commentStates = {};
var feedListener = null;
var fotoFeedListener = null;

function getPostPath(type) {
    if (type === 'foto') return 'foto_posts';
    if (type === 'group') return 'group_posts/' + currentGroup;
    if (type === 'profile') {
        var uid = VIEWING_USER || USER_UID;
        return 'user_posts/' + uid;
    }
    return 'feed_posts';
}

function getCommentState(postId) {
    if (!commentStates[postId]) {
        commentStates[postId] = {
            open: false,
            allComments: [],
            listener: null
        };
    }
    return commentStates[postId];
}

function showLoading(el) {
    if (!el) return;
    el.innerHTML = `
        <div class="loading-spinner" style="text-align:center;padding:30px 20px;">
            <div style="display:inline-block;width:40px;height:40px;border:3px solid var(--border-color);border-top:3px solid var(--link-color);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
            <div style="margin-top:12px;color:var(--muted-text);font-size:0.75rem;">Загрузка...</div>
            <div style="width:100%;max-width:200px;height:4px;background:var(--border-color);border-radius:4px;margin:8px auto 0;overflow:hidden;">
                <div style="width:0%;height:100%;background:var(--link-color);border-radius:4px;animation:progress 1.5s ease-in-out infinite;"></div>
            </div>
        </div>
        <style>
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            @keyframes progress { 0% { width: 0%; } 50% { width: 70%; } 100% { width: 100%; } }
        </style>
    `;
}

function removeLoading(el) {
    if (!el) return;
    var spinner = el.querySelector('.loading-spinner');
    if (spinner) spinner.remove();
}

function loadFeed() {
    var el = document.getElementById('feed');
    if (!el) return;
    if (!USER_UID) {
        el.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Войдите</div>';
        return;
    }
    if (!el.children.length) {
        showLoading(el);
    }
    if (feedListener) {
        db.ref('sites/' + SITE + '/feed_posts').off('value', feedListener);
        feedListener = null;
    }
    feedListener = function(snap) {
        var data = snap.val() || {};
        var keys = Object.keys(data).sort(function(a, b) {
            return (data[b].timestamp || 0) - (data[a].timestamp || 0);
        });
        removeLoading(el);
        if (!keys.length) {
            el.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Пока пусто</div>';
            return;
        }
        var existingIds = {};
        el.querySelectorAll('.post').forEach(function(post) {
            var id = post.dataset.id;
            if (id) existingIds[id] = post;
        });
        var newPosts = [];
        keys.forEach(function(k) {
            var p = data[k];
            p.id = k;
            if (p.deleted && p.deletedAt) {
                db.ref('sites/' + SITE + '/feed_posts/' + k).remove();
                if (p.authorUid) {
                    db.ref('sites/' + SITE + '/user_posts/' + p.authorUid + '/' + k).remove();
                }
                return;
            }
            if (existingIds[k]) {
                updatePostStats(k, p);
                delete existingIds[k];
            } else {
                newPosts.push(p);
            }
        });
        removeLoading(el);
        if (newPosts.length) {
            var fragment = document.createDocumentFragment();
            newPosts.reverse().forEach(function(p) {
                var postEl = renderPost(p, 'feed');
                fragment.insertBefore(postEl, fragment.firstChild);
            });
            el.insertBefore(fragment, el.firstChild);
        }
        Object.keys(existingIds).forEach(function(id) {
            var post = existingIds[id];
            if (post && post.parentNode) {
                post.parentNode.removeChild(post);
            }
        });
    };
    db.ref('sites/' + SITE + '/feed_posts').orderByChild('timestamp').on('value', feedListener);
}

function loadFotoFeed() {
    var el = document.getElementById('fotoFeed');
    if (!el) return;
    if (!USER || !USER_UID) {
        el.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Войдите, чтобы видеть ленту</div>';
        return;
    }
    if (!el.children.length) {
        showLoading(el);
    }
    if (fotoFeedListener) {
        db.ref('sites/' + SITE + '/foto_posts').off('value', fotoFeedListener);
        fotoFeedListener = null;
    }
    fotoFeedListener = function(snap) {
        var data = snap.val() || {};
        var keys = Object.keys(data).sort(function(a, b) {
            return (data[b].timestamp || 0) - (data[a].timestamp || 0);
        });
        removeLoading(el);
        el.innerHTML = '';
        if (!keys.length) {
            el.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Пока нет фото-постов. Будьте первым!</div>';
            return;
        }
        keys.forEach(function(k) {
            var p = data[k];
            p.id = k;
            var postEl = renderPost(p, 'foto');
            if (postEl) {
                el.appendChild(postEl);
            }
        });
    };
    db.ref('sites/' + SITE + '/foto_posts').orderByChild('timestamp').on('value', fotoFeedListener);
}

function updatePostStats(postId, data) {
    var likeCount = document.getElementById('likeCount_' + postId);
    var commentCount = document.getElementById('commentCount_' + postId);
    var repostCount = document.getElementById('repostCount_' + postId);
    if (likeCount) likeCount.textContent = data.likes || 0;
    if (commentCount) commentCount.textContent = data.commentCount || 0;
    if (repostCount) repostCount.textContent = data.reposts || 0;
}
