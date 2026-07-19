// ================================================================
// ЛЕНТА — ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
// ================================================================

var commentStates = {};
var feedListener = null;
var fotoFeedListener = null;
var POSTS_CACHE = {};

var FEED_CONFIG = {
    limit: 50,
    maxRepostDepth: 5,
    avatarCacheTTL: 300000
};

function esc(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatPostTime(timestamp) {
    if (!timestamp) return '';
    var diff = Date.now() - timestamp;
    var date = new Date(timestamp);
    var now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    
    var yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Вчера';
    }
    
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        var days = Math.floor(diff / (24 * 60 * 60 * 1000));
        return days + ' дн.';
    }
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

var repostCache = {};

function renderNestedRepost(repost, level) {
    if (!repost) return '';
    if (level > FEED_CONFIG.maxRepostDepth) {
        return '<div class="repost-nested" style="padding:6px;color:var(--muted-text);font-size:0.6rem;">📦 Слишком глубокий репост</div>';
    }
    
    var cacheKey = JSON.stringify(repost) + '_' + level;
    if (repostCache[cacheKey]) return repostCache[cacheKey];
    
    var textHtml = repost.text || '';
    var imgHtml = repost.img ? '<img src="' + repost.img + '" class="repost-img" onclick="window.open(this.src)">' : '';
    var marqueeHtml = repost.marquee ? '<div class="marquee"><span>' + esc(repost.marquee) + '</span></div>' : '';
    
    var buttonsHtml = '';
    if (repost.buttons && repost.buttons.length > 0) {
        buttonsHtml = '<div class="buttons-wrap">';
        repost.buttons.forEach(function(btn) {
            if (btn.url) {
                buttonsHtml += '<a href="' + esc(btn.url) + '" target="_blank" class="btn-item">' + esc(btn.label || '🔗 Перейти') + '</a>';
            }
        });
        buttonsHtml += '</div>';
    }
    
    var linkHtml = '';
    if (repost.link) {
        var frameSize = repost.frameSize || 'small';
        var frameClass = frameSize === 'large' ? 'large' : 'small';
        linkHtml = '<div class="video-container ' + frameClass + '">' +
            '<iframe src="' + repost.link + '" ' +
            'sandbox="allow-scripts allow-same-origin allow-popups allow-forms">' +
            '</iframe>' +
            '</div>';
    }
    
    var hashtagsHtml = '';
    if (repost.hashtags && repost.hashtags.length > 0) {
        hashtagsHtml = '<div class="hashtags">';
        repost.hashtags.forEach(function(tag) {
            hashtagsHtml += '<span class="tag" onclick="searchByTag(\'' + esc(tag) + '\')">' + esc(tag) + '</span>';
        });
        hashtagsHtml += '</div>';
    }
    
    var nestedHtml = '';
    if (repost.repost) {
        nestedHtml = renderNestedRepost(repost.repost, level + 1);
    }
    
    var borderColor = level === 1 ? 'var(--link-color)' : 
                      level === 2 ? 'var(--success)' : 
                      level === 3 ? 'var(--warning)' : 
                      'var(--muted-text)';
    
    var levelLabel = level === 1 ? '🔄 Репост' : 
                     level === 2 ? '🔄 Репост репоста' : 
                     level === 3 ? '🔄 Третий репост' : 
                     '🔄 Репост #' + level;
    
    var authorOnClick = "navigateToProfile('" + (repost.authorUid || '') + "')";
    
    var result = '<div class="repost-nested" style="border-left:3px solid ' + borderColor + ';padding:8px 10px;margin-top:6px;background:var(--input-bg);border-radius:6px;">' +
        '<div class="repost-header">' + levelLabel + ' от <span class="repost-author" onclick="' + authorOnClick + '" style="cursor:pointer;">' + esc(repost.author || 'Аноним') + '</span>' +
        ' <span class="repost-time">' + (repost.time || '') + '</span></div>' +
        '<div class="repost-text">' + textHtml + '</div>' +
        marqueeHtml +
        imgHtml +
        linkHtml +
        buttonsHtml +
        hashtagsHtml +
        nestedHtml +
        '</div>';
    
    repostCache[cacheKey] = result;
    setTimeout(function() { delete repostCache[cacheKey]; }, 10000);
    
    return result;
}

function renderPost(p, type) {
    var div = document.createElement('div');
    div.className = 'post';
    div.dataset.id = p.id;
    div.dataset.type = type;
    
    if (p.deleted) {
        div.innerHTML = `
            <div style="padding:10px;text-align:center;color:var(--muted-text);background:var(--input-bg);border-radius:8px;border:1px solid var(--border-color);">
                🗑 Пост удален 
                <button onclick="restorePost('${p.id}', '${type}')" style="background:var(--link-color);color:#fff;border:none;border-radius:12px;padding:2px 12px;cursor:pointer;font-size:0.6rem;margin-left:6px;">↩️ Восстановить</button>
                <button onclick="permanentDeletePost('${p.id}', '${type}')" style="background:var(--danger);color:#fff;border:none;border-radius:12px;padding:2px 12px;cursor:pointer;font-size:0.6rem;margin-left:4px;">✕ Удалить навсегда</button>
            </div>
        `;
        return div;
    }
    
    var isLiked = localStorage.getItem('lk_' + p.id + '_' + USER_UID) === '1';
    var letter = (p.author || '?').charAt(0).toUpperCase();
    
    var avatarOnClick = "navigateToProfile('" + (p.authorUid || '') + "')";
    var avatarHtml = p.authorAvatar 
        ? '<span class="avatar-wrap" id="post-avatar-' + p.id + '" style="cursor:pointer;" onclick="event.stopPropagation();' + avatarOnClick + '"><img src="' + p.authorAvatar + '" /></span>'
        : '<span class="avatar-wrap" id="post-avatar-' + p.id + '" style="cursor:pointer;" onclick="event.stopPropagation();' + avatarOnClick + '"><span class="letter">' + letter + '</span></span>';
    
    var nameOnClick = "navigateToProfile('" + (p.authorUid || '') + "')";
    
    var marqueeHtml = p.marquee ? '<div class="marquee"><span>' + esc(p.marquee) + '</span></div>' : '';
    var textHtml = p.text || '';
    var imgHtml = p.img ? '<img src="' + p.img + '" class="post-img" onclick="event.stopPropagation();window.open(this.src)">' : '';
    var repostHtml = p.repost ? renderNestedRepost(p.repost, 1) : '';
    
    var buttonsHtml = '';
    if (p.buttons && p.buttons.length > 0) {
        buttonsHtml = '<div class="buttons-wrap">';
        p.buttons.forEach(function(btn) {
            if (btn.url) {
                buttonsHtml += '<a href="' + esc(btn.url) + '" target="_blank" class="btn-item" onclick="event.stopPropagation();">' + esc(btn.label || '🔗 Перейти') + '</a>';
            }
        });
        buttonsHtml += '</div>';
    }
    
    var previewHtml = '';
    if (p.link) {
        var frameSize = p.frameSize || 'small';
        var frameClass = frameSize === 'large' ? 'large' : 'small';
        previewHtml = '<div class="video-container ' + frameClass + '">' +
            '<iframe src="' + p.link + '" ' +
            'sandbox="allow-scripts allow-same-origin allow-popups allow-forms">' +
            '</iframe>' +
            '</div>';
    }
    
    var hashtagsHtml = '';
    if (p.hashtags && p.hashtags.length > 0) {
        hashtagsHtml = '<div class="hashtags">';
        p.hashtags.forEach(function(tag) {
            hashtagsHtml += '<span class="tag" onclick="event.stopPropagation();searchByTag(\'' + esc(tag) + '\')">' + esc(tag) + '</span>';
        });
        hashtagsHtml += '</div>';
    }
    
    var isAuthor = (p.authorUid === USER_UID);
    var canDelete = isAuthor || isAdmin;
    var menuHtml = canDelete ? `
        <div class="post-menu">
            <button class="dots" onclick="event.stopPropagation();togglePostMenu('${p.id}')">⋮</button>
            <div class="dropdown" id="menu_${p.id}">
                <button class="edit-btn" onclick="event.stopPropagation();openEdit('${p.id}', '${type}')">✏️ Редактировать</button>
                <button class="del-btn" onclick="event.stopPropagation();deletePost('${p.id}', '${type}')">🗑 Удалить</button>
            </div>
        </div>
    ` : '';
    
    var actionsHtml = '<div class="stats" onclick="event.stopPropagation();">' +
        '<button class="' + (isLiked ? 'liked' : '') + '" onclick="event.stopPropagation();toggleLike(\'' + p.id + '\', \'' + type + '\')">👍 <span id="likeCount_' + p.id + '">' + (p.likes || 0) + '</span></button>' +
        '<button onclick="event.stopPropagation();toggleComments(\'' + p.id + '\', \'' + type + '\')">💬 <span id="commentCount_' + p.id + '">' + (p.commentCount || 0) + '</span></button>' +
        '<button onclick="event.stopPropagation();openRepost(\'' + p.id + '\', \'' + type + '\')">🔁 <span id="repostCount_' + p.id + '">' + (p.reposts || 0) + '</span></button>' +
        '</div>';
    
    var commentsHtml = `
        <div class="comments-wrapper" id="commentsWrapper_${p.id}" style="display:none;" onclick="event.stopPropagation();">
            <div class="comments" id="comments_${p.id}">
                <div class="comments-body" id="commentsBody_${p.id}">
                    <div class="comments-list" id="commentsList_${p.id}">
                        <div id="commentsContainer_${p.id}"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    var inputHtml = `
        <div class="comment-input-wrap" id="commentInputWrap_${p.id}" onclick="event.stopPropagation();">
            <input type="text" id="commentInput_${p.id}" placeholder="Написать комментарий...">
            <button onclick="event.stopPropagation();submitComment('${p.id}', '${type}')">→</button>
        </div>
    `;
    
    var contentHtml = textHtml + repostHtml + imgHtml + buttonsHtml + previewHtml + hashtagsHtml;
    
    var authorHtml = `
        <div class="author">
            ${avatarHtml}
            <span class="name" onclick="event.stopPropagation();${nameOnClick}" style="cursor:pointer;">${esc(p.author || 'Аноним')}</span>
            <span class="time">${formatPostTime(p.timestamp)}</span>
            ${p.edited ? '<span style="font-size:0.4rem;color:var(--muted-text);">(ред.)</span>' : ''}
            ${menuHtml}
        </div>
    `;
    
    div.innerHTML = marqueeHtml + authorHtml +
        '<div class="post-content" onclick="openPostPage(\'' + p.id + '\', \'' + type + '\')" style="cursor:pointer;">' + contentHtml + '</div>' +
        actionsHtml + commentsHtml + inputHtml;
    
    if (p.authorUid) {
        var avatarEl = document.getElementById('post-avatar-' + p.id);
        if (avatarEl && !p.authorAvatar) {
            renderAvatar(p.authorUid, avatarEl, letter);
        }
    }
    
    var state = getCommentState(p.id);
    if (state.open) {
        loadComments(p.id, type);
    } else {
        var countEl = document.getElementById('commentCount_' + p.id);
        if (countEl) countEl.textContent = p.commentCount || 0;
    }
    
    return div;
}

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
        
        if (keys.length > FEED_CONFIG.limit) {
            keys = keys.slice(0, FEED_CONFIG.limit);
        }
        
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
    
    db.ref('sites/' + SITE + '/feed_posts').orderByChild('timestamp').limitToLast(FEED_CONFIG.limit).on('value', feedListener);
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
        
        if (keys.length > FEED_CONFIG.limit) {
            keys = keys.slice(0, FEED_CONFIG.limit);
        }
        
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
    
    db.ref('sites/' + SITE + '/foto_posts').orderByChild('timestamp').limitToLast(FEED_CONFIG.limit).on('value', fotoFeedListener);
}

function updatePostStats(postId, data) {
    var likeCount = document.getElementById('likeCount_' + postId);
    var commentCount = document.getElementById('commentCount_' + postId);
    var repostCount = document.getElementById('repostCount_' + postId);
    if (likeCount) likeCount.textContent = data.likes || 0;
    if (commentCount) commentCount.textContent = data.commentCount || 0;
    if (repostCount) repostCount.textContent = data.reposts || 0;
}
