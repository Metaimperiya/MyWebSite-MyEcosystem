// ================================================================
// РЕНДЕР ПОСТОВ — ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ
// ================================================================

function esc(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatPostTime(timestamp) {
    if (!timestamp) return '';
    var now = Date.now();
    var diff = now - timestamp;
    var date = new Date(timestamp);
    var today = new Date();
    var yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()) {
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return hours + ':' + (minutes < 10 ? '0' : '') + minutes + ' ' + ampm;
    }
    if (date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear()) {
        return 'Yesterday';
    }
    if (diff > 7 * 24 * 60 * 60 * 1000) {
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
    }
    var days = Math.floor(diff / (24 * 60 * 60 * 1000));
    var words = ['', 'yesterday', '2 days', '3 days', '4 days', '5 days', '6 days', '7 days'];
    return words[days] || days + ' days';
}

function renderPost(p, type) {
    var div = document.createElement('div');
    div.className = 'post';
    div.dataset.id = p.id;
    div.dataset.type = type;
    if (p.deleted) {
        div.innerHTML = `
            <div style="padding:10px;text-align:center;color:var(--muted-text);background:var(--input-bg);border-radius:8px;border:1px solid var(--border-color);">
                🗑 Post deleted 
                <button onclick="event.stopPropagation();window.restorePost('${p.id}', '${type}')" style="background:var(--link-color);color:#fff;border:none;border-radius:12px;padding:2px 12px;cursor:pointer;font-size:0.6rem;margin-left:6px;">↩️ Restore</button>
                <button onclick="event.stopPropagation();window.permanentDeletePost('${p.id}', '${type}')" style="background:var(--danger);color:#fff;border:none;border-radius:12px;padding:2px 12px;cursor:pointer;font-size:0.6rem;margin-left:4px;">✕ Delete permanently</button>
            </div>
        `;
        return div;
    }
    var isLiked = localStorage.getItem('lk_' + p.id + '_' + USER_UID) === '1';
    var letter = (p.author || '?').charAt(0).toUpperCase();
    var avatarHtml = '';
    if (p.authorAvatar) {
        avatarHtml = '<span class="avatar-wrap" id="post-avatar-' + p.id + '"><img src="' + p.authorAvatar + '" /></span>';
    } else {
        avatarHtml = '<span class="avatar-wrap" id="post-avatar-' + p.id + '"><span class="letter">' + letter + '</span></span>';
    }
    var marqueeHtml = p.marquee ? '<div class="marquee"><span>' + esc(p.marquee) + '</span></div>' : '';
    var textHtml = p.text || '';
    var imgHtml = p.img ? '<img src="' + p.img + '" class="post-img" onclick="event.stopPropagation();window.open(this.src)">' : '';
    var repostHtml = '';
    if (p.repost) {
        repostHtml = renderNestedRepost(p.repost, 1);
    }
    var buttonsHtml = '';
    if (p.buttons && p.buttons.length > 0) {
        buttonsHtml = '<div class="buttons-wrap">';
        p.buttons.forEach(function(btn) {
            if (btn.url) {
                buttonsHtml += '<a href="' + esc(btn.url) + '" target="_blank" class="btn-item" onclick="event.stopPropagation();">' + esc(btn.label || '🔗 Go') + '</a>';
            }
        });
        buttonsHtml += '</div>';
    }
    
    // ===== ФИКС: УБИРАЕМ ЖЁСТКУЮ ВЫСОТУ ИЗ IFRAME =====
    // Теперь у iframe НЕТ style="height:XXXpx" — только контейнер .link-preview
    var previewHtml = '';
    if (p.link) {
        var frameClass = p.frameSize === 'large' ? ' link-preview--large' : '';
        previewHtml = '<div class="link-preview' + frameClass + '" onclick="event.stopPropagation();"><iframe src="' + p.link + '" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe></div>';
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
    var menuHtml = '';
    if (canDelete) {
        menuHtml = '<div class="post-menu">' +
            '<button class="dots" onclick="event.stopPropagation();window.togglePostMenu(\'' + p.id + '\')">⋮</button>' +
            '<div class="dropdown" id="menu_' + p.id + '">' +
            '<button class="edit-btn" onclick="event.stopPropagation();window.openEdit(\'' + p.id + '\', \'' + type + '\')">✏️ Edit</button>' +
            '<button class="del-btn" onclick="event.stopPropagation();window.deletePost(\'' + p.id + '\', \'' + type + '\')">🗑 Delete</button>' +
            '</div>' +
            '</div>';
    }
    var actionsHtml = '<div class="stats" onclick="event.stopPropagation();">' +
        '<button class="' + (isLiked ? 'liked' : '') + '" onclick="event.stopPropagation();window.toggleLike(\'' + p.id + '\', \'' + type + '\')">👍 <span id="likeCount_' + p.id + '">' + (p.likes || 0) + '</span></button>' +
        '<button onclick="event.stopPropagation();window.toggleComments(\'' + p.id + '\', \'' + type + '\')">💬 <span id="commentCount_' + p.id + '">' + (p.commentCount || 0) + '</span></button>' +
        '<button onclick="event.stopPropagation();window.openRepost(\'' + p.id + '\', \'' + type + '\')">🔁 <span id="repostCount_' + p.id + '">' + (p.reposts || 0) + '</span></button>' +
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
            <input type="text" id="commentInput_${p.id}" placeholder="Write a comment...">
            <button onclick="event.stopPropagation();window.submitComment('${p.id}', '${type}')">→</button>
        </div>
    `;
    var contentHtml = textHtml + repostHtml + imgHtml + buttonsHtml + previewHtml + hashtagsHtml;
    var authorHtml = `
        <div class="author">
            ${avatarHtml}
            <span class="name" onclick="event.stopPropagation();viewUser('${p.authorUid || ''}')">${esc(p.author || 'Anonymous')}</span>
            <span class="time">${formatPostTime(p.timestamp)}</span>
            ${p.edited ? '<span style="font-size:0.4rem;color:var(--muted-text);">(edited)</span>' : ''}
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

function renderNestedRepost(repost, level) {
    if (!repost) return '';
    var maxLevel = 5;
    if (level > maxLevel) return '<div class="repost-nested" style="padding:6px;color:var(--muted-text);font-size:0.6rem;">📦 Repost too deep</div>';
    var textHtml = repost.text || '';
    var imgHtml = repost.img ? '<img src="' + repost.img + '" class="repost-img" onclick="window.open(this.src)">' : '';
    var marqueeHtml = repost.marquee ? '<div class="marquee"><span>' + esc(repost.marquee) + '</span></div>' : '';
    var buttonsHtml = '';
    if (repost.buttons && repost.buttons.length > 0) {
        buttonsHtml = '<div class="buttons-wrap">';
        repost.buttons.forEach(function(btn) {
            if (btn.url) {
                buttonsHtml += '<a href="' + esc(btn.url) + '" target="_blank" class="btn-item">' + esc(btn.label || '🔗 Go') + '</a>';
            }
        });
        buttonsHtml += '</div>';
    }
    
    // ===== ФИКС: И ДЛЯ ВЛОЖЕННЫХ РЕПОСТОВ УБИРАЕМ ЖЁСТКУЮ ВЫСОТУ =====
    var linkHtml = '';
    if (repost.link) {
        var repostFrameClass = repost.frameSize === 'large' ? ' link-preview--large' : '';
        linkHtml = '<div class="link-preview' + repostFrameClass + '"><iframe src="' + repost.link + '" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe></div>';
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
    var levelLabel = level === 1 ? '🔄 Repost' : 
                     level === 2 ? '🔄 Repost of repost' : 
                     level === 3 ? '🔄 Third repost' : 
                     '🔄 Repost #' + level;
    return '<div class="repost-nested" style="border-left:3px solid ' + borderColor + ';padding:8px 10px;margin-top:6px;background:var(--input-bg);border-radius:6px;">' +
        '<div class="repost-header">' + levelLabel + ' by <span class="repost-author" onclick="viewUser(\'' + (repost.authorUid || '') + '\')">' + esc(repost.author || 'Anonymous') + '</span>' +
        ' <span class="repost-time">' + (repost.time || '') + '</span></div>' +
        '<div class="repost-text">' + textHtml + '</div>' +
        marqueeHtml +
        imgHtml +
        linkHtml +
        buttonsHtml +
        hashtagsHtml +
        nestedHtml +
        '</div>';
}
