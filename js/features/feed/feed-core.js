// ================================================================
// ЛЕНТА — ОПТИМИЗИРОВАННАЯ ВЕРСИЯ С ПРАВИЛЬНЫМИ onclick
// ================================================================

var commentStates = {};
var feedListener = null;
var fotoFeedListener = null;
var POSTS_CACHE = {};

// ===== КОНФИГУРАЦИЯ =====
var FEED_CONFIG = {
    limit: 50,
    maxRepostDepth: 5,
    avatarCacheTTL: 300000
};

var proShowcaseUsers = [];
var proShowcaseStartTimer = null;

function renderProShowcase() {
    var section = document.getElementById('proShowcase');
    var grid = document.getElementById('proShowcaseGrid');
    if (!section || !grid) return;
    if (!proShowcaseUsers.length) {
        section.hidden = true;
        return;
    }
    section.hidden = false;
    clearTimeout(proShowcaseStartTimer);
    // Даже одного автора повторяем в ленте, чтобы движение оставалось непрерывным.
    var displayUsers = proShowcaseUsers.length === 1 ? Array(8).fill(proShowcaseUsers[0]) : proShowcaseUsers;
    var cardsHtml = displayUsers.map(function(user) {
        var name = user.name || 'Пользователь';
        var avatar = user.avatarUrl
            ? '<img src="' + esc(user.avatarUrl).replace(/"/g, '&quot;') + '" alt="" loading="lazy">'
            : '<span class="pro-showcase-initial">' + esc(name.charAt(0).toUpperCase()) + '</span>';
        return '<button type="button" class="pro-showcase-card" data-profile-uid="' + esc(user.uid).replace(/"/g, '&quot;') + '" aria-label="Открыть профиль ' + esc(name).replace(/"/g, '&quot;') + '">' +
            '<span class="pro-showcase-avatar">' + avatar + '<span class="pro-showcase-pro">PRO</span></span>' +
            '<span class="pro-showcase-name">' + esc(name) + '</span></button>';
    }).join('');
    var duplicateHtml = displayUsers.length
        ? displayUsers.map(function(user) {
            var name = user.name || 'Пользователь';
            var avatar = user.avatarUrl
                ? '<img src="' + esc(user.avatarUrl).replace(/"/g, '&quot;') + '" alt="" loading="lazy">'
                : '<span class="pro-showcase-initial">' + esc(name.charAt(0).toUpperCase()) + '</span>';
            return '<button type="button" class="pro-showcase-card" data-profile-uid="' + esc(user.uid).replace(/"/g, '&quot;') + '" aria-label="Открыть профиль ' + esc(name).replace(/"/g, '&quot;') + '" tabindex="-1">' +
                '<span class="pro-showcase-avatar">' + avatar + '<span class="pro-showcase-pro">PRO</span></span>' +
                '<span class="pro-showcase-name">' + esc(name) + '</span></button>';
        }).join('')
        : '';
    grid.innerHTML = '<div class="pro-showcase-track' + (duplicateHtml ? ' is-looping' : '') + '"><div class="pro-showcase-set">' + cardsHtml + '</div>' +
        (duplicateHtml ? '<div class="pro-showcase-set" aria-hidden="true">' + duplicateHtml + '</div>' : '') + '</div>';
    grid.querySelectorAll('[data-profile-uid]').forEach(function(card) {
        card.addEventListener('click', function() { viewUser(card.dataset.profileUid); });
    });
    var track = grid.querySelector('.pro-showcase-track.is-looping');
    if (track) {
        proShowcaseStartTimer = setTimeout(function() {
            if (!track.isConnected) return;
            var firstCard = track.querySelector('.pro-showcase-set .pro-showcase-card');
            var set = track.querySelector('.pro-showcase-set');
            var gap = set ? parseFloat(getComputedStyle(set).gap) || 0 : 0;
            var offset = firstCard ? firstCard.getBoundingClientRect().width + gap : 105;
            track.style.setProperty('--pro-showcase-first-shift', '-' + offset + 'px');
            track.classList.add('is-intro');
            var introFallback = setTimeout(finishIntro, 1800);
            function finishIntro(event) {
                if (event && event.animationName !== 'pro-showcase-intro') return;
                clearTimeout(introFallback);
                track.removeEventListener('animationend', onIntroEnd);
                track.style.setProperty('--pro-showcase-offset', '-' + offset + 'px');
                track.classList.remove('is-intro');
                track.classList.add('is-looping-ready');
            }
            function onIntroEnd(event) { finishIntro(event); }
            track.addEventListener('animationend', onIntroEnd);
        }, 5000);
    }
}

window.loadProShowcase = function() {
    var section = document.getElementById('proShowcase');
    if (!section || !USER_UID) { if (section) section.hidden = true; return; }
    Promise.all([
        db.ref('sites/' + SITE + '/all_users').once('value'),
        db.ref('sites/' + SITE + '/profile_status').once('value')
    ]).then(function(snaps) {
        var users = snaps[0].val() || {};
        var statuses = snaps[1].val() || {};
        var now = Date.now();
        var eligibleUsers = Object.keys(statuses).filter(function(uid) {
            var status = statuses[uid] || {};
            return !!status.pro && (!status.proExpiresAt || status.proExpiresAt > now) && !!users[uid] && users[uid].name;
        }).map(function(uid) {
            return { uid: uid, name: users[uid].name, avatarUrl: users[uid].avatarUrl || '', spotlight: !!(statuses[uid] && statuses[uid].spotlight) };
        });
        for (var i = eligibleUsers.length - 1; i > 0; i--) {
            var swapIndex = Math.floor(Math.random() * (i + 1));
            var temp = eligibleUsers[i];
            eligibleUsers[i] = eligibleUsers[swapIndex];
            eligibleUsers[swapIndex] = temp;
        }
        proShowcaseUsers = eligibleUsers.slice(0, 10);
        renderProShowcase();
    }).catch(function(error) { console.warn('Не удалось загрузить авторов PRO:', error); });
};

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
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

// ===== РЕНДЕР ВЛОЖЕННОГО РЕПОСТА =====
var repostCache = {};

function renderNestedRepost(repost, level) {
    if (!repost) return '';
    if (level > FEED_CONFIG.maxRepostDepth) {
        return '<div class="repost-nested" style="padding:6px;color:var(--muted-text);font-size:0.6rem;">📦 Слишком глубокий репост</div>';
    }
    
    var cacheKey = JSON.stringify(repost) + '_' + level;
    if (repostCache[cacheKey]) return repostCache[cacheKey];
    
    var textHtml = window.sanitizePostHtml ? window.sanitizePostHtml(repost.text || '') : (repost.text || '');
    var repostSlides = Array.isArray(repost.media) ? repost.media : [];
    if (!repostSlides.length) {
        if (repost.img) repostSlides.push({ type: 'image', url: repost.img });
        if (repost.link) repostSlides.push({ type: 'frame', url: repost.link, frameSize: repost.frameSize });
    }
    var repostMediaHtml = renderPostMedia(repostSlides, 'repost-' + level);
    var marqueeHtml = repost.marquee ? '<div class="marquee"><span>' + esc(repost.marquee) + '</span></div>' : '';
    
    var buttonsHtml = '';
    if (repost.buttons && repost.buttons.length > 0) {
        buttonsHtml = '<div class="buttons-wrap">';
        repost.buttons.forEach(function(btn) {
            if (btn.url) {
                buttonsHtml += '<a href="' + esc(btn.url) + '" target="_blank" class="btn-item" onclick="event.stopPropagation();">' + esc(btn.label || '🔗 Перейти') + '</a>';
            }
        });
        buttonsHtml += '</div>';
    }
    
    // ===== ФИКС: УБРАЛ ЖЁСТКУЮ ВЫСОТУ =====
    var linkHtml = '';
    if (repost.link && !repostSlides.some(function(item) { return item.type === 'frame'; })) {
        var repostFrameClass = repost.frameSize === 'large' ? ' link-preview--large' : '';
        linkHtml = '<div class="link-preview' + repostFrameClass + '" onclick="event.stopPropagation();"><iframe src="' + repost.link + '" style="width:100%;border:none;border-radius:8px;background:#fff;" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe></div>';
    }
    
    var hashtagsHtml = '';
    if (repost.hashtags && repost.hashtags.length > 0) {
        hashtagsHtml = '<div class="hashtags">';
        repost.hashtags.forEach(function(tag) {
            hashtagsHtml += '<span class="tag" onclick="event.stopPropagation();searchByTag(\'' + esc(tag) + '\')">' + esc(tag) + '</span>';
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
        repostMediaHtml +
        linkHtml +
        buttonsHtml +
        hashtagsHtml +
        nestedHtml +
        '</div>';
    
    repostCache[cacheKey] = result;
    setTimeout(function() { delete repostCache[cacheKey]; }, 10000);
    
    return result;
}

// ===== РЕНДЕР ПОСТА — С ПРАВИЛЬНЫМИ КАВЫЧКАМИ =====
function renderPost(p, type) {
    var div = document.createElement('div');
    div.className = 'post';
    div.dataset.id = p.id;
    div.dataset.type = type;
    
    if (p.deleted) {
        div.innerHTML = `
            <div style="padding:10px;text-align:center;color:var(--muted-text);background:var(--input-bg);border-radius:8px;border:1px solid var(--border-color);">
                🗑 Пост удален 
                <button onclick="event.stopPropagation();window.restorePost('${p.id}', '${type}')" style="background:var(--link-color);color:#fff;border:none;border-radius:12px;padding:2px 12px;cursor:pointer;font-size:0.6rem;margin-left:6px;">↩️ Восстановить</button>
                <button onclick="event.stopPropagation();window.permanentDeletePost('${p.id}', '${type}')" style="background:var(--danger);color:#fff;border:none;border-radius:12px;padding:2px 12px;cursor:pointer;font-size:0.6rem;margin-left:4px;">✕ Удалить навсегда</button>
            </div>
        `;
        return div;
    }
    
    var isLiked = localStorage.getItem('lk_' + p.id + '_' + USER_UID) === '1';
    var letter = (p.author || '?').charAt(0).toUpperCase();
    
    var avatarOnClick = "navigateToProfile('" + (p.authorUid || '') + "')";
    var avatarOnlyHtml = p.authorAvatar
        ? '<span class="avatar-wrap" id="post-avatar-' + p.id + '" style="cursor:pointer;" onclick="event.stopPropagation();' + avatarOnClick + '"><img src="' + p.authorAvatar + '" /></span>'
        : '<span class="avatar-wrap" id="post-avatar-' + p.id + '" style="cursor:pointer;" onclick="event.stopPropagation();' + avatarOnClick + '"><span class="letter">' + letter + '</span></span>';
    var avatarHtml = '<span class="post-author-avatar">' + avatarOnlyHtml +
        '<span class="inline-profile-rating" data-profile-rating="' + esc(p.authorUid || '') + '">☆☆☆☆☆</span>' +
        '<span class="inline-profile-status" data-profile-status="' + esc(p.authorUid || '') + '"></span></span>';
    
    var nameOnClick = "navigateToProfile('" + (p.authorUid || '') + "')";
    
    var marqueeHtml = p.marquee ? '<div class="marquee"><span>' + esc(p.marquee) + '</span></div>' : '';
    var textHtml = window.sanitizePostHtml ? window.sanitizePostHtml(p.text || '') : (p.text || '');
    var mediaSlides = Array.isArray(p.media) ? p.media.filter(function(item) { return item && (item.type === 'image' ? item.url : item.url); }) : [];
    if (!mediaSlides.length) {
        if (p.img) mediaSlides.push({ type: 'image', url: p.img });
        if (!p.articleUrl && p.link) mediaSlides.push({ type: 'frame', url: p.link, frameSize: p.frameSize });
    }
    var mediaHtml = renderPostMedia(mediaSlides, p.id);
    var repostHtml = p.repost ? renderNestedRepost(p.repost, 1) : '';
    var sharedHtml = '';
    if (p.sharedEntity) {
        var entity = p.sharedEntity;
        var labels = { group: 'ГРУППА', group_post: 'ЗАПИСЬ В ГРУППЕ', vacancy: 'ВАКАНСИЯ', resume: 'РЕЗЮМЕ', dating: 'АНКЕТА' };
        var openData = encodeURIComponent(JSON.stringify({ kind: entity.kind, id: entity.id || '', parentId: entity.parentId || '' }));
        var entityImage = entity.image && (/^https?:\/\//i.test(entity.image) || (entity.image.length <= 400000 && /^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(entity.image))) ? entity.image : '';
        var image = entityImage ? '<img class="shared-entity-image" src="' + esc(entityImage) + '" alt="" loading="lazy">' : '';
        if (entity.kind === 'group') {
            var groupOpenData = encodeURIComponent(JSON.stringify({ kind: 'group', id: entity.id || '' }));
            sharedHtml = '<div class="shared-entity-wrap shared-group-wrap"><button type="button" class="shared-entity-card" data-open-shared="' + groupOpenData + '">' + image + '<span class="shared-entity-copy"><small>' + esc(labels.group) + '</small><strong>' + esc(entity.title || 'Группа') + '</strong><span>' + esc(entity.description || 'Посмотри обложку и описание группы.') + '</span><em>Перейти в группу <span aria-hidden="true">→</span></em></span></button></div>';
        } else {
            if (entity.kind === 'dating') {
                var datingActions = typeof window.renderDatingActionPanel === 'function'
                    ? window.renderDatingActionPanel(entity.id || '', entity.id === USER_UID)
                    : '<div class="shared-dating-actions"><button type="button" class="shared-dating-action" data-dating-open-profile="' + esc(entity.id || '') + '">Открыть профиль</button></div>';
                sharedHtml = '<div class="shared-entity-wrap shared-dating-wrap"><div class="shared-entity-card shared-dating-card-content"><div class="shared-dating-card-head">' + image + '<span class="shared-entity-copy"><small>' + esc(labels[entity.kind]) + '</small><strong>' + esc(entity.title || 'Анкета') + '</strong><span>' + esc(entity.description || '') + '</span></span></div>' + datingActions + '</div></div>';
            } else {
                sharedHtml = '<button type="button" class="shared-entity-card" data-open-shared="' + openData + '">' + image + '<span class="shared-entity-copy"><small>' + esc(labels[entity.kind] || 'ПУБЛИКАЦИЯ') + '</small><strong>' + esc(entity.title || 'Открыть публикацию') + '</strong><span>' + esc(entity.description || '') + '</span><em>Открыть →</em></span></button>';
            }
        }
    }
    var adHtml = '';
    if (p.ad && p.ad.enabled) {
        var adUrl = p.ad.url && /^https?:\/\//i.test(p.ad.url) ? p.ad.url : '';
        adHtml = '<div class="feed-ad-label">РЕКЛАМА</div><div class="feed-ad-card"><strong>' + esc(p.ad.title || 'Объявление') + '</strong>' + (adUrl ? '<a href="' + esc(adUrl) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();">' + esc(p.ad.button || 'Подробнее') + ' →</a>' : '') + '</div>';
    }
    
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
    
    // ===== ФИКС: УБРАЛ ЖЁСТКУЮ ВЫСОТУ =====
    var previewHtml = '';
    if (p.articleUrl) {
        previewHtml = '<a href="' + esc(p.articleUrl) + '" class="article-feed-card" onclick="event.stopPropagation();" style="display:block;margin-top:8px;padding:12px;border:1px solid var(--border-color);border-radius:10px;text-decoration:none;color:inherit;background:var(--input-bg);">' +
            (p.articleCover ? '<img src="' + esc(p.articleCover) + '" alt="" style="width:100%;max-height:220px;object-fit:cover;border-radius:7px;margin-bottom:8px;">' : '') +
            '<strong style="display:block;font-size:.9rem;">' + esc(p.articleTitle || p.text) + '</strong><span style="display:block;color:var(--muted-text);font-size:.7rem;margin-top:4px;">' + esc(p.articleDescription || '') + '</span><span style="display:block;color:var(--link-color);font-size:.7rem;margin-top:8px;">Читать статью →</span></a>';
    } else if (p.link && !mediaSlides.some(function(item) { return item.type === 'frame'; })) {
        var frameClass = p.frameSize === 'large' ? ' link-preview--large' : '';
        previewHtml = '<div class="link-preview' + frameClass + '" onclick="event.stopPropagation();"><iframe src="' + p.link + '" style="width:100%;border:none;border-radius:8px;background:#fff;" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe></div>';
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
    
    // ===== МЕНЮ ПОСТА — С ПРАВИЛЬНЫМИ КАВЫЧКАМИ =====
    var menuHtml = canDelete ? `
        <div class="post-menu">
            <button class="dots" onclick="event.stopPropagation();window.togglePostMenu(this)">⋮</button>
            <div class="dropdown" id="menu_${p.id}">
                <button class="edit-btn" onclick="event.stopPropagation();window.openEdit('${p.id}', '${type}')">✏️ Редактировать</button>
                <button class="del-btn" onclick="event.stopPropagation();window.deletePost('${p.id}', '${type}')">🗑 Удалить</button>
            </div>
        </div>
    ` : '';
    
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
            <input type="text" id="commentInput_${p.id}" placeholder="Написать комментарий...">
            <button onclick="event.stopPropagation();window.submitComment('${p.id}', '${type}')">→</button>
        </div>
    `;
    
    var contentHtml = adHtml + textHtml + repostHtml + sharedHtml + mediaHtml + buttonsHtml + previewHtml + hashtagsHtml;
    
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
        '<div class="post-content" data-post-id="' + esc(p.id) + '" data-post-type="' + esc(type) + '" onclick="window.openPostPageFromContent(event, this.dataset.postId, this.dataset.postType)" style="cursor:pointer;">' + contentHtml + '</div>' +
        actionsHtml + commentsHtml + inputHtml;
    initPostCarousel(div);
    
    if (p.authorUid) {
        var avatarEl = div.querySelector('#post-avatar-' + p.id);
        if (avatarEl && !p.authorAvatar) {
            renderAvatar(p.authorUid, avatarEl, letter);
        }
        if (typeof window.loadInlineProfileRating === 'function') {
            window.loadInlineProfileRating(p.authorUid, div.querySelector('.inline-profile-rating'));
        }
        if (typeof window.loadInlineProfileStatus === 'function') {
            window.loadInlineProfileStatus(p.authorUid, div.querySelector('.inline-profile-status'));
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

window.openPostPageFromContent = function(event, postId, type) {
    if (event && event.target && event.target.closest('.shared-entity-wrap')) return;
    if (typeof window.openPostPage === 'function') window.openPostPage(postId, type);
};

function renderPostMedia(slides, postId) {
    if (!slides || !slides.length) return '';
    var slidesHtml = slides.map(function(item, index) {
        var body = item.type === 'frame'
            ? '<div class="post-carousel-frame' + (item.frameSize === 'large' ? ' link-preview--large' : '') + '"><iframe src="' + esc(item.url) + '" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" loading="lazy" title="Встроенная страница"></iframe></div>'
            : '<img src="' + esc(item.url) + '" class="post-img" alt="Фото ' + (index + 1) + '" loading="lazy" onclick="event.stopPropagation();window.open(this.src)">';
        return '<div class="post-carousel-slide" data-slide-index="' + index + '">' + body + '</div>';
    }).join('');
    if (slides.length === 1) return '<div class="post-carousel single">' + slidesHtml + '</div>';
    var dots = slides.map(function(_, index) {
        return '<button type="button" class="post-carousel-dot' + (index === 0 ? ' active' : '') + '" data-carousel-dot="' + index + '" aria-label="Слайд ' + (index + 1) + '"></button>';
    }).join('');
    return '<div class="post-carousel" data-post-carousel="' + esc(postId || '') + '" onclick="event.stopPropagation();"><div class="post-carousel-viewport"><div class="post-carousel-track">' + slidesHtml + '</div></div><button type="button" class="post-carousel-arrow prev" data-carousel-prev aria-label="Предыдущий слайд">‹</button><button type="button" class="post-carousel-arrow next" data-carousel-next aria-label="Следующий слайд">›</button><div class="post-carousel-dots">' + dots + '</div></div>';
}

function initPostCarousel(root) {
    root.querySelectorAll('.post-carousel:not(.single)').forEach(function(carousel) {
        if (carousel.dataset.ready) return;
        carousel.dataset.ready = '1';
        var viewport = carousel.querySelector('.post-carousel-viewport');
        var slides = Array.from(carousel.querySelectorAll('.post-carousel-slide'));
        var dots = Array.from(carousel.querySelectorAll('.post-carousel-dot'));
        var index = 0;
        var timer;
        var visible = !('IntersectionObserver' in window);
        function goTo(next, smooth) {
            index = (next + slides.length) % slides.length;
            viewport.scrollTo({ left: index * viewport.clientWidth, behavior: smooth === false ? 'auto' : 'smooth' });
            dots.forEach(function(dot, i) { dot.classList.toggle('active', i === index); });
        }
        carousel.querySelector('[data-carousel-prev]').addEventListener('click', function() { goTo(index - 1); });
        carousel.querySelector('[data-carousel-next]').addEventListener('click', function() { goTo(index + 1); });
        dots.forEach(function(dot) { dot.addEventListener('click', function() { goTo(Number(dot.dataset.carouselDot)); }); });
        viewport.addEventListener('scroll', function() {
            index = Math.max(0, Math.min(slides.length - 1, Math.round(viewport.scrollLeft / Math.max(1, viewport.clientWidth))));
            dots.forEach(function(dot, i) { dot.classList.toggle('active', i === index); });
        }, { passive: true });
        carousel.addEventListener('mouseenter', function() { clearInterval(timer); });
        carousel.addEventListener('mouseleave', start);
        carousel.addEventListener('touchstart', function() { clearInterval(timer); }, { passive: true });
        carousel.addEventListener('touchend', start, { passive: true });
        function start() {
            clearInterval(timer);
            if (visible && !document.hidden) timer = setInterval(function() { goTo(index + 1); }, 5000);
        }
        if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function(entries) {
                visible = entries[0].isIntersecting;
                if (visible) start(); else clearInterval(timer);
            }, { threshold: 0.25 });
            observer.observe(carousel);
        }
        start();
    });
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

// ================================================================
// БЕСКОНЕЧНЫЙ СКРОЛЛ
// ================================================================

var feedPageSize = 10;
var feedLastTimestamp = null;
var feedLastPostKey = null;
var feedLoading = false;
var feedHasMore = true;
var scrollListenerAdded = false;
var feedRequestId = 0;
var renderedFeedPostIds = Object.create(null);

function loadFeed() {
    var el = document.getElementById('feed');
    if (!el) return;
    if (typeof window.loadProShowcase === 'function') window.loadProShowcase();
    if (!USER_UID) {
        el.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Войдите</div>';
        return;
    }

    feedRequestId++;
    feedLoading = false;
    feedLastTimestamp = null;
    feedLastPostKey = null;
    renderedFeedPostIds = Object.create(null);
    feedHasMore = true;
    el.innerHTML = '';
    
    // Добавляем спиннер внизу
    var spinner = document.createElement('div');
    spinner.id = 'feedSpinner';
    spinner.style.cssText = 'text-align:center;padding:20px;color:var(--muted-text);font-size:0.7rem;display:none;';
    spinner.textContent = '⏳ Загрузка...';
    el.appendChild(spinner);
    
    loadMorePosts(feedRequestId);

    // Добавляем слушатель скролла только один раз
    if (!scrollListenerAdded) {
        scrollListenerAdded = true;
        window.addEventListener('scroll', function() {
            var scrollTop = window.scrollY || window.pageYOffset;
            var windowHeight = window.innerHeight;
            var documentHeight = document.documentElement.scrollHeight;
            
            // Когда доскроллили до низа (осталось 200px)
            if (scrollTop + windowHeight >= documentHeight - 200) {
                if (!feedLoading && feedHasMore) {
                    loadMorePosts();
                }
            }
        });
    }
}

function loadMorePosts(requestId) {
    var el = document.getElementById('feed');
    if (!el) return;
    if (feedLoading || !feedHasMore) return;
    requestId = requestId == null ? feedRequestId : requestId;
    feedLoading = true;

    var spinner = document.getElementById('feedSpinner');
    if (spinner) spinner.style.display = 'block';

    var query = db.ref('sites/' + SITE + '/feed_posts').orderByChild('timestamp');
    if (feedLastPostKey) {
        // Include the exact cursor row, then remove it below. Using both the
        // timestamp and key gives deterministic pagination when timestamps tie.
        query = query.endAt(feedLastTimestamp, feedLastPostKey).limitToLast(feedPageSize + 2);
    } else {
        query = query.limitToLast(feedPageSize + 1);
    }

    query.once('value', function(snap) {
        if (requestId !== feedRequestId) return;

        var entries = [];
        snap.forEach(function(child) {
            entries.push({ key: child.key, post: child.val() });
        });

        if (feedLastPostKey) {
            entries = entries.filter(function(entry) { return entry.key !== feedLastPostKey; });
        }

        if (entries.length > feedPageSize) {
            entries = entries.slice(-feedPageSize);
            feedHasMore = true;
        } else {
            feedHasMore = false;
        }

        if (entries.length > 0) {
            var oldestEntry = entries[0];
            feedLastTimestamp = oldestEntry.post.timestamp || 0;
            feedLastPostKey = oldestEntry.key;
        }

        if (spinner) spinner.style.display = 'none';

        var fragment = document.createDocumentFragment();
        entries.reverse().forEach(function(entry) {
            var k = entry.key;
            if (renderedFeedPostIds[k]) return;
            renderedFeedPostIds[k] = true;
            var p = entry.post;
            p.id = k;
            var postEl = renderPost(p, 'feed');
            fragment.appendChild(postEl);
        });

        // ===== ФИКС: проверяем, есть ли спиннер в DOM =====
        if (spinner && spinner.parentNode === el) {
            el.insertBefore(fragment, spinner);
        } else {
            el.appendChild(fragment);
        }
        if (typeof window.loadDatingLikeSummaries === 'function') {
            var datingLikeUids = Array.from(el.querySelectorAll('[data-dating-like]')).map(function(button) { return button.getAttribute('data-dating-like'); });
            window.loadDatingLikeSummaries(datingLikeUids);
        }

        if (!feedHasMore) {
            var msg = document.createElement('div');
            msg.style.cssText = 'text-align:center;padding:20px;color:var(--muted-text);font-size:0.7rem;';
            msg.textContent = '✅ Все посты загружены';
            if (spinner && spinner.parentNode === el) {
                el.insertBefore(msg, spinner);
            } else {
                el.appendChild(msg);
            }
        }

        feedLoading = false;
    }).catch(function(err) {
        if (requestId !== feedRequestId) return;
        console.error('❌ Ошибка загрузки постов:', err);
        feedLoading = false;
        if (spinner) spinner.style.display = 'none';
    });
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

console.log('✅ feed-core.js загружен (с правильными кавычками)');
