// ================================================================
// ЛЕНТА И ПОСТЫ — ПОЛНАЯ ВЕРСИЯ
// ================================================================

var commentStates = {};
var feedListener = null;

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

// ===== АНИМАЦИЯ ЗАГРУЗКИ =====
function showLoading(el) {
    if (!el) return;
    el.innerHTML = `
        <div style="text-align:center;padding:30px 20px;">
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

// ================================================================
// ЗАГРУЗКА ЛЕНТЫ (ГЛАВНАЯ)
// ================================================================

function loadFeed() {
    var el = document.getElementById('feed');
    if (!el) return;

    if (!USER_UID) {
        el.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Войдите</div>';
        return;
    }

    showLoading(el);

    if (feedListener) {
        db.ref('sites/' + SITE + '/feed_posts').off('value', feedListener);
        feedListener = null;
    }

    feedListener = function(snap) {
        var data = snap.val() || {};
        var keys = Object.keys(data).sort(function(a, b) {
            return (data[b].timestamp || 0) - (data[a].timestamp || 0);
        });

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

// ================================================================
// ОБНОВЛЕНИЕ СТАТИСТИКИ ПОСТА
// ================================================================

function updatePostStats(postId, data) {
    var likeCount = document.getElementById('likeCount_' + postId);
    var commentCount = document.getElementById('commentCount_' + postId);
    var repostCount = document.getElementById('repostCount_' + postId);
    
    if (likeCount) likeCount.textContent = data.likes || 0;
    if (commentCount) commentCount.textContent = data.commentCount || 0;
    if (repostCount) repostCount.textContent = data.reposts || 0;
}

// ================================================================
// РАБОТА С РЕДАКТОРОМ
// ================================================================

function getEditorText() {
    var editor = document.getElementById('postEditor');
    if (!editor) return '';
    return editor.innerHTML;
}

function clearEditor() {
    var editor = document.getElementById('postEditor');
    if (!editor) return;
    editor.innerHTML = '';
}

function getProfileEditorText() {
    var editor = document.getElementById('postEditorProfile');
    if (!editor) return '';
    return editor.innerHTML;
}

function clearProfileEditor() {
    var editor = document.getElementById('postEditorProfile');
    if (!editor) return;
    editor.innerHTML = '';
}

function formatText(type) {
    var editor = document.getElementById('postEditor');
    if (!editor) return;
    
    var selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    var range = selection.getRangeAt(0);
    var selectedText = range.toString();
    
    if (!selectedText) {
        var templates = {
            'bold': '**жирный текст**',
            'italic': '*курсив*',
            'underline': '__подчёркнутый__',
            'strike': '~~зачёркнутый~~',
            'h1': '# Заголовок',
            'h2': '## Подзаголовок',
            'quote': '> Цитата',
            'code': '```код```'
        };
        
        var template = templates[type] || '';
        if (template) {
            document.execCommand('insertText', false, template);
        }
        return;
    }
    
    var wrappers = {
        'bold': '**',
        'italic': '*',
        'underline': '__',
        'strike': '~~',
        'h1': '# ',
        'h2': '## ',
        'quote': '> ',
        'code': '```'
    };
    
    var wrapper = wrappers[type];
    if (!wrapper) return;
    
    var newText;
    if (type === 'h1' || type === 'h2' || type === 'quote') {
        newText = wrapper + selectedText;
    } else {
        var closeWrapper = wrapper;
        if (type === 'code') closeWrapper = '```';
        newText = wrapper + selectedText + closeWrapper;
    }
    
    document.execCommand('insertText', false, newText);
}

function insertLink() {
    var url = prompt('Введите ссылку:');
    if (!url) return;
    
    var editor = document.getElementById('postEditor');
    if (!editor) return;
    
    var selection = window.getSelection();
    if (selection.rangeCount) {
        var text = selection.toString() || 'ссылка';
        document.execCommand('insertText', false, '[' + text + '](' + url + ')');
    }
}

// ================================================================
// ОТПРАВКА ПОСТА (ГЛАВНАЯ ЛЕНТА)
// ================================================================

window.submitPost = function() {
    if (!USER) { alert('Войдите!'); return; }

    var text = getEditorText().trim();
    if (!text && !pendingImageFile) {
        alert('Введите текст или добавьте фото');
        return;
    }

    var hashtags = extractHashtags(text);
    
    db.ref('sites/' + SITE + '/users/' + USER_UID + '/avatarUrl').once('value', function(avatarSnap) {
        var avatarUrl = avatarSnap.val() || null;
        
        var postData = {
            author: USER,
            authorUid: USER_UID,
            authorAvatar: avatarUrl,
            text: text || '📷',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now(),
            likes: 0,
            commentCount: 0,
            reposts: 0,
            hashtags: hashtags,
            marquee: null,
            link: null,
            buttons: [],
            frameSize: 'small',
            edited: false,
            img: null,
            repost: null,
            deleted: null,
            deletedAt: null
        };

        var linkMatch = (text || '').match(/(https?:\/\/[^\s]+)/);
        if (linkMatch) postData.link = linkMatch[1];

        var savePost = function(imgData) {
            if (imgData) postData.img = imgData;
            
            db.ref('sites/' + SITE + '/feed_posts').push(postData);
            db.ref('sites/' + SITE + '/user_posts/' + USER_UID).push(postData);
            clearEditor();
            clearPostForm();
            
            setTimeout(function() {
                if (typeof loadFeed === 'function') loadFeed();
            }, 300);
        };

        if (pendingImageFile) {
            var reader = new FileReader();
            reader.onload = function(e) {
                savePost(e.target.result);
            };
            reader.readAsDataURL(pendingImageFile);
        } else {
            savePost(null);
        }
    });
};

// ================================================================
// ОТПРАВКА ПОСТА (ПРОФИЛЬ)
// ================================================================

var pendingProfileImageFile = null;

window.submitProfilePost = function() {
    if (!USER) { alert('Войдите!'); return; }

    var text = getProfileEditorText().trim();
    if (!text && !pendingProfileImageFile) {
        alert('Введите текст или добавьте фото');
        return;
    }

    var hashtags = extractHashtags(text);
    
    db.ref('sites/' + SITE + '/users/' + USER_UID + '/avatarUrl').once('value', function(avatarSnap) {
        var avatarUrl = avatarSnap.val() || null;
        
        var postData = {
            author: USER,
            authorUid: USER_UID,
            authorAvatar: avatarUrl,
            text: text || '📷',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now(),
            likes: 0,
            commentCount: 0,
            reposts: 0,
            hashtags: hashtags,
            marquee: null,
            link: null,
            buttons: [],
            frameSize: 'small',
            edited: false,
            img: null,
            repost: null,
            deleted: null,
            deletedAt: null
        };

        var linkMatch = (text || '').match(/(https?:\/\/[^\s]+)/);
        if (linkMatch) postData.link = linkMatch[1];

        var savePost = function(imgData) {
            if (imgData) postData.img = imgData;
            
            db.ref('sites/' + SITE + '/feed_posts').push(postData);
            db.ref('sites/' + SITE + '/user_posts/' + USER_UID).push(postData);
            clearProfileEditor();
            clearProfilePostForm();
            
            setTimeout(function() {
                if (typeof loadFeed === 'function') loadFeed();
                if (typeof loadProfile === 'function') loadProfile();
            }, 300);
        };

        if (pendingProfileImageFile) {
            var reader = new FileReader();
            reader.onload = function(e) {
                savePost(e.target.result);
            };
            reader.readAsDataURL(pendingProfileImageFile);
        } else {
            savePost(null);
        }
    });
};

window.clearProfilePostForm = function() {
    clearProfileEditor();
    pendingProfileImageFile = null;
    document.getElementById('previewBoxProfile').classList.remove('visible');
    document.getElementById('fileInputProfile').value = '';
};

window.removeProfileImage = function() {
    pendingProfileImageFile = null;
    document.getElementById('previewBoxProfile').classList.remove('visible');
    document.getElementById('fileInputProfile').value = '';
};

document.getElementById('fileInputProfile').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        alert('Только изображения!');
        this.value = '';
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        alert('Максимум 5 МБ');
        this.value = '';
        return;
    }

    pendingProfileImageFile = file;
    var reader = new FileReader();
    reader.onload = function(ev) {
        document.getElementById('previewImgProfile').src = ev.target.result;
        document.getElementById('previewNameProfile').textContent = file.name.slice(0, 16);
        document.getElementById('previewBoxProfile').classList.add('visible');
    };
    reader.readAsDataURL(file);
});

function extractHashtags(text) {
    if (!text) return [];
    var matches = text.match(/#[\wа-яё]+/gi) || [];
    return matches.slice(0, 8);
}

window.clearPostForm = function() {
    clearEditor();
    pendingImage = null;
    pendingImageFile = null;
    document.getElementById('previewBox').classList.remove('visible');
    document.getElementById('fileInput').value = '';
};

window.removeImage = function() {
    pendingImage = null;
    pendingImageFile = null;
    document.getElementById('previewBox').classList.remove('visible');
    document.getElementById('fileInput').value = '';
};

document.getElementById('fileInput').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        alert('Только изображения!');
        this.value = '';
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        alert('Максимум 5 МБ');
        this.value = '';
        return;
    }

    pendingImageFile = file;
    var reader = new FileReader();
    reader.onload = function(ev) {
        pendingImage = ev.target.result;
        document.getElementById('previewImg').src = pendingImage;
        document.getElementById('previewName').textContent = file.name.slice(0, 16);
        document.getElementById('previewBox').classList.add('visible');
    };
    reader.readAsDataURL(file);
});

// ================================================================
// РЕНДЕР ПОСТА (ПОЛНАЯ ВЕРСИЯ С ТРИ ТОЧКИ)
// ================================================================

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
                buttonsHtml += '<a href="' + esc(btn.url) + '" target="_blank" class="btn-item" onclick="event.stopPropagation();">' + esc(btn.label || '🔗 Перейти') + '</a>';
            }
        });
        buttonsHtml += '</div>';
    }

    var previewHtml = '';
    if (p.link) {
        var frameSize = p.frameSize || 'small';
        var height = frameSize === 'large' ? '450px' : '250px';
        previewHtml = '<div class="link-preview" onclick="event.stopPropagation();"><iframe src="' + p.link + '" style="width:100%;height:' + height + ';border:none;border-radius:8px;background:#fff;" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe></div>';
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

    // ===== ТРИ ТОЧКИ =====
    var menuHtml = '';
    if (canDelete) {
        menuHtml = '<div class="post-menu">' +
            '<button class="dots" onclick="event.stopPropagation();togglePostMenu(\'' + p.id + '\')">⋮</button>' +
            '<div class="dropdown" id="menu_' + p.id + '">' +
            '<button class="edit-btn" onclick="event.stopPropagation();openEdit(\'' + p.id + '\', \'' + type + '\')" style="color:#e67e22;">✏️ Редактировать</button>' +
            '<button class="del-btn" onclick="event.stopPropagation();deletePost(\'' + p.id + '\', \'' + type + '\')" style="color:var(--danger);">🗑 Удалить</button>' +
            '</div>' +
            '</div>';
    }

    var actionsHtml = '<div class="stats" onclick="event.stopPropagation();">' +
        '<button class="' + (isLiked ? 'liked' : '') + '" onclick="event.stopPropagation();toggleLike(\'' + p.id + '\', \'' + type + '\')">👍 <span id="likeCount_' + p.id + '">' + (p.likes || 0) + '</span></button>' +
        '<button onclick="event.stopPropagation();toggleComments(\'' + p.id + '\', \'' + type + '\')">💬 <span id="commentCount_' + p.id + '">' + (p.commentCount || 0) + '</span></button>' +
        '<button onclick="event.stopPropagation();openRepost(\'' + p.id + '\', \'' + type + '\')">🔁 <span id="repostCount_' + p.id + '">' + (p.reposts || 0) + '</span></button>' +
        '</div>';

    // ===== КОММЕНТАРИИ (ВЛОЖЕННЫЕ) =====
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
    
    div.innerHTML = menuHtml + marqueeHtml + 
        '<div class="author" onclick="event.stopPropagation();viewUser(\'' + (p.authorUid || '') + '\')">' + avatarHtml + 
        '<span class="name" onclick="event.stopPropagation();viewUser(\'' + (p.authorUid || '') + '\')">' + esc(p.author || 'Аноним') + '</span>' +
        '<span class="time">' + (p.time || '') + (p.edited ? ' <span style="color:#999;font-size:0.4rem;">(ред.)</span>' : '') + '</span>' +
        '</div>' +
        '<div class="post-content" onclick="openPostPage(\'' + p.id + '\', \'' + type + '\')" style="cursor:pointer;">' + contentHtml + '</div>' +
        actionsHtml + commentsHtml + inputHtml;

    if (p.authorUid) {
        var avatarEl = document.getElementById('post-avatar-' + p.id);
        if (avatarEl && !p.authorAvatar) {
            renderAvatar(p.authorUid, avatarEl, letter);
        }
    }

    // Загружаем комментарии только если они открыты
    var state = getCommentState(p.id);
    if (state.open) {
        loadComments(p.id, type);
    } else {
        // Просто обновляем счетчик
        var countEl = document.getElementById('commentCount_' + p.id);
        if (countEl) countEl.textContent = p.commentCount || 0;
    }
    return div;
}

// ================================================================
// РЕКУРСИВНЫЙ РЕНДЕР ВЛОЖЕННЫХ РЕПОСТОВ
// ================================================================

function renderNestedRepost(repost, level) {
    if (!repost) return '';
    
    var maxLevel = 5;
    if (level > maxLevel) return '<div class="repost-nested" style="padding:6px;color:var(--muted-text);font-size:0.6rem;">📦 Слишком глубокий репост</div>';
    
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
        var height = frameSize === 'large' ? '450px' : '250px';
        linkHtml = '<div class="link-preview"><iframe src="' + repost.link + '" style="width:100%;height:' + height + ';border:none;border-radius:8px;background:#fff;" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe></div>';
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
    
    return '<div class="repost-nested" style="border-left:3px solid ' + borderColor + ';padding:8px 10px;margin-top:6px;background:var(--input-bg);border-radius:6px;">' +
        '<div class="repost-header">' + levelLabel + ' от <span class="repost-author" onclick="viewUser(\'' + (repost.authorUid || '') + '\')">' + esc(repost.author || 'Аноним') + '</span>' +
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

// ================================================================
// КОММЕНТАРИИ — БЕЗ ПРЫЖКОВ, БЕЗ ЗАКРЫТИЯ
// ================================================================

window.toggleComments = function(postId, type) {
    var state = getCommentState(postId);
    state.open = !state.open;

    var wrapper = document.getElementById('commentsWrapper_' + postId);
    if (!wrapper) return;

    if (state.open) {
        wrapper.style.display = 'block';
        wrapper.style.opacity = '0';
        wrapper.style.transition = 'opacity 0.2s ease';
        loadComments(postId, type);
        setTimeout(function() {
            wrapper.style.opacity = '1';
        }, 10);
    } else {
        wrapper.style.display = 'none';
        wrapper.style.opacity = '0';
    }
};

function loadComments(postId, type) {
    var path = getPostPath(type);
    var state = getCommentState(postId);

    // Если комментарии не открыты — не грузим
    if (!state.open) {
        return;
    }

    if (state.listener) {
        db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments').off('value', state.listener);
        state.listener = null;
    }

    state.listener = function(snap) {
        var container = document.getElementById('commentsContainer_' + postId);
        if (!container) return;

        var data = snap.val() || {};
        var keys = Object.keys(data).sort(function(a, b) {
            return (data[a].timestamp || 0) - (data[b].timestamp || 0);
        });

        state.allComments = keys.map(function(k) {
            return { id: k, ...data[k] };
        });

        var countEl = document.getElementById('commentCount_' + postId);
        if (countEl) countEl.textContent = state.allComments.length;
        db.ref('sites/' + SITE + '/' + path + '/' + postId + '/commentCount').set(state.allComments.length);

        renderComments(postId, type);
    };

    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments').orderByChild('timestamp').on('value', state.listener);
}

function renderComments(postId, type) {
    var state = getCommentState(postId);
    var container = document.getElementById('commentsContainer_' + postId);
    if (!container) return;

    if (!state.allComments.length) {
        container.innerHTML = '<div class="no-comments">Нет комментариев</div>';
        return;
    }

    var commentsMap = {};
    state.allComments.forEach(function(c) {
        commentsMap[c.id] = c;
    });

    var roots = [];
    state.allComments.forEach(function(c) {
        if (!c.parentId) {
            roots.push(c);
        }
    });

    var html = '';
    roots.forEach(function(root) {
        html += renderCommentTree(root, commentsMap, postId, type, 0);
    });

    container.innerHTML = html;

    state.allComments.forEach(function(c) {
        var avatarEl = document.getElementById('comment-avatar-' + c.id);
        if (avatarEl && c.authorUid) {
            renderAvatar(c.authorUid, avatarEl, (c.author || '?').charAt(0).toUpperCase());
        }
    });
}

function renderCommentTree(comment, commentsMap, postId, type, level) {
    var canEdit = (comment.author === USER || isAdmin);
    var likes = comment.likes || 0;
    var letter = (comment.author || '?').charAt(0).toUpperCase();
    var replyClass = level > 0 ? ' comment-reply' : '';
    var marginLeft = level * 24;

    var html = '<div class="comment-item' + replyClass + '" data-id="' + comment.id + '" style="margin-left:' + marginLeft + 'px;">';
    html += '<span class="avatar-wrap" id="comment-avatar-' + comment.id + '"><span class="letter">' + letter + '</span></span>';
    html += '<div class="body">';
    html += '<span class="name">' + esc(comment.author || 'Аноним') + '</span>';
    html += '<span class="time">' + (comment.time || '') + (comment.edited ? ' <span style="color:#999;font-size:0.4rem;">(ред.)</span>' : '') + '</span>';
    html += '<div class="text" id="comment-text-' + comment.id + '">' + esc(comment.text || '') + '</div>';
    html += '<div class="comment-actions-row">';
    html += '<button class="comment-like-btn" onclick="toggleLikeComment(\'' + postId + '\', \'' + comment.id + '\', \'' + type + '\')">👍 <span id="commentLikeCount_' + comment.id + '">' + likes + '</span></button>';
    html += '<button class="comment-reply-btn" onclick="openReply(\'' + postId + '\', \'' + comment.id + '\', \'' + type + '\')">💬 Ответить</button>';
    html += '</div>';

    html += '<div class="comment-reply-input-wrap" id="replyInput_' + comment.id + '" style="display:none; margin-top:4px;">';
    html += '<input type="text" id="replyInputField_' + comment.id + '" placeholder="Написать ответ..." class="reply-input">';
    html += '<button onclick="submitReply(\'' + postId + '\', \'' + comment.id + '\', \'' + type + '\')" class="reply-send-btn">→</button>';
    html += '</div>';

    html += '</div>';

    if (canEdit) {
        html += '<div class="comment-actions">';
        html += '<button class="more-btn" onclick="toggleCommentMenu(\'' + comment.id + '\')">⋮</button>';
        html += '<div class="dropdown" id="commentMenu_' + comment.id + '">';
        html += '<button class="edit-btn" onclick="editComment(\'' + postId + '\',\'' + comment.id + '\',\'' + type + '\')">✏️ Редактировать</button>';
        html += '<button class="del-btn" onclick="deleteComment(\'' + postId + '\',\'' + comment.id + '\',\'' + type + '\')">🗑 Удалить</button>';
        html += '</div>';
        html += '</div>';
    }

    html += '</div>';

    var children = [];
    Object.keys(commentsMap).forEach(function(id) {
        if (commentsMap[id].parentId === comment.id) {
            children.push(commentsMap[id]);
        }
    });

    if (children.length > 0) {
        children.sort(function(a, b) {
            return (a.timestamp || 0) - (b.timestamp || 0);
        });
        children.forEach(function(child) {
            html += renderCommentTree(child, commentsMap, postId, type, level + 1);
        });
    }

    return html;
}

window.openReply = function(postId, parentId, type) {
    document.querySelectorAll('.comment-reply-input-wrap').forEach(function(el) {
        el.style.display = 'none';
    });
    
    var wrap = document.getElementById('replyInput_' + parentId);
    if (wrap) {
        wrap.style.display = 'flex';
        var input = document.getElementById('replyInputField_' + parentId);
        if (input) {
            input.focus();
        }
    }
};

window.submitReply = function(postId, parentId, type) {
    if (!USER) { alert('Войдите!'); return; }
    
    var input = document.getElementById('replyInputField_' + parentId);
    if (!input) return;
    
    var text = input.value.trim();
    if (!text) return;
    
    var path = getPostPath(type);
    var state = getCommentState(postId);
    
    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments').push({
        author: USER,
        authorUid: USER_UID,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        likes: 0,
        parentId: parentId
    });
    
    input.value = '';
    document.getElementById('replyInput_' + parentId).style.display = 'none';
    
    // Обновляем комментарии если они открыты
    if (state.open) {
        loadComments(postId, type);
    }
};

window.toggleLikeComment = function(postId, commentId, type) {
    if (!USER) { alert('Войдите!'); return; }

    var path = getPostPath(type);
    var ref = db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments/' + commentId + '/likes');
    var countEl = document.getElementById('commentLikeCount_' + commentId);
    
    ref.transaction(function(likes) {
        return (likes || 0) + 1;
    });

    if (countEl) {
        var current = parseInt(countEl.textContent) || 0;
        countEl.textContent = current + 1;
    }
};

// ================================================================
// ЛАЙКИ
// ================================================================

window.toggleLike = function(postId, type) {
    if (!USER) { alert('Войдите!'); return; }

    var key = 'lk_' + postId + '_' + USER_UID;
    var liked = localStorage.getItem(key) === '1';
    var path = getPostPath(type);
    var postRef = db.ref('sites/' + SITE + '/' + path + '/' + postId);
    var countEl = document.getElementById('likeCount_' + postId);
    var btn = document.querySelector('.post[data-id="' + postId + '"] .stats button:first-child');

    if (btn) {
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.6';
    }

    postRef.child('likes').transaction(function(currentLikes) {
        var current = currentLikes || 0;
        if (liked) {
            return Math.max(0, current - 1);
        } else {
            return current + 1;
        }
    }, function(error, committed, snapshot) {
        if (btn) {
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = '1';
        }
        
        if (error) {
            console.error('Ошибка лайка:', error);
            return;
        }
        
        if (committed) {
            var newValue = snapshot.val() || 0;
            
            if (countEl) {
                countEl.textContent = newValue;
            }
            
            if (liked) {
                localStorage.removeItem(key);
                if (btn) btn.classList.remove('liked');
            } else {
                localStorage.setItem(key, '1');
                if (btn) btn.classList.add('liked');
            }
        }
    });
};

// ================================================================
// ОТПРАВКА КОММЕНТАРИЯ — НЕ ЗАКРЫВАЕТ КОММЕНТАРИИ
// ================================================================

window.submitComment = function(postId, type) {
    if (!USER) { alert('Войдите!'); return; }

    var input = document.getElementById('commentInput_' + postId);
    if (!input) return;
    
    var text = input.value.trim();
    if (!text) return;

    var path = getPostPath(type);
    var state = getCommentState(postId);
    
    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/authorUid').once('value', function(authorSnap) {
        var authorUid = authorSnap.val();
        
        db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments').push({
            author: USER,
            authorUid: USER_UID,
            text: text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now(),
            likes: 0,
            parentId: null
        }).then(function() {
            input.value = '';
            if (authorUid && authorUid !== USER_UID) {
                sendNotification(authorUid, {
                    type: 'comment',
                    from: USER_UID,
                    text: USER + ' прокомментировал(а) ваш пост: "' + (text.slice(0, 50)) + (text.length > 50 ? '...' : ''),
                    postId: postId,
                    postType: type,
                    timestamp: Date.now()
                });
            }
            // Если комментарии открыты — обновляем их, НЕ ЗАКРЫВАЯ
            if (state.open) {
                loadComments(postId, type);
            }
        });
    });
};

// ================================================================
// УДАЛЕНИЕ КОММЕНТАРИЯ С ВЕТКОЙ
// ================================================================

function deleteCommentWithChildren(postId, commentId, type) {
    var path = getPostPath(type);
    var commentsRef = db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments');
    var state = getCommentState(postId);
    
    commentsRef.once('value', function(snap) {
        var allComments = snap.val() || {};
        var toDelete = {};
        
        function collectChildren(parentId) {
            Object.keys(allComments).forEach(function(id) {
                if (allComments[id].parentId === parentId) {
                    toDelete[id] = true;
                    collectChildren(id);
                }
            });
        }
        
        toDelete[commentId] = true;
        collectChildren(commentId);
        
        var updates = {};
        Object.keys(toDelete).forEach(function(id) {
            updates[id] = null;
        });
        
        commentsRef.update(updates).then(function() {
            var remaining = 0;
            Object.keys(allComments).forEach(function(id) {
                if (!toDelete[id]) remaining++;
            });
            db.ref('sites/' + SITE + '/' + path + '/' + postId + '/commentCount').set(remaining);
            var countEl = document.getElementById('commentCount_' + postId);
            if (countEl) countEl.textContent = remaining;
            if (state.open) {
                loadComments(postId, type);
            }
        });
    });
}

window.deleteComment = function(postId, commentId, type) {
    if (!confirm('🗑 Удалить комментарий и все ответы на него?')) return;
    deleteCommentWithChildren(postId, commentId, type);
    var menu = document.getElementById('commentMenu_' + commentId);
    if (menu) menu.classList.remove('open');
};

window.toggleCommentMenu = function(commentId) {
    var menu = document.getElementById('commentMenu_' + commentId);
    if (!menu) return;
    document.querySelectorAll('.comment-actions .dropdown.open').forEach(function(el) {
        if (el.id !== 'commentMenu_' + commentId) el.classList.remove('open');
    });
    menu.classList.toggle('open');
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('.comment-actions')) {
        document.querySelectorAll('.comment-actions .dropdown.open').forEach(function(el) {
            el.classList.remove('open');
        });
    }
});

function editComment(postId, commentId, type) {
    var textEl = document.getElementById('comment-text-' + commentId);
    if (!textEl) return;

    var menu = document.getElementById('commentMenu_' + commentId);
    if (menu) menu.classList.remove('open');

    var currentText = textEl.textContent;
    var input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'edit-comment-input';

    textEl.innerHTML = '';
    textEl.appendChild(input);
    input.focus();
    input.select();

    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            saveCommentEdit(postId, commentId, type, input.value.trim());
        }
    });

    input.addEventListener('blur', function() {
        setTimeout(function() {
            if (document.activeElement !== input) {
                saveCommentEdit(postId, commentId, type, input.value.trim());
            }
        }, 200);
    });
}

function saveCommentEdit(postId, commentId, type, newText) {
    if (!newText) {
        deleteCommentWithChildren(postId, commentId, type);
        return;
    }
    var path = getPostPath(type);
    var state = getCommentState(postId);
    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments/' + commentId).update({
        text: newText,
        edited: true
    }).then(function() {
        if (state.open) {
            loadComments(postId, type);
        }
    });
}

// ================================================================
// ОТКРЫТИЕ СТРАНИЦЫ ПОСТА
// ================================================================

window.openPostPage = function(postId, type) {
    window.CURRENT_POST_ID = postId;
    window.CURRENT_POST_TYPE = type;
    
    var container = document.getElementById('postPageContainer');
    if (!container) return;
    
    document.getElementById('postPage').classList.add('active');
    setActivePage(null);
    
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">⏳ Загрузка поста...</div>';
    
    var path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + postId).once('value', function(snap) {
        var post = snap.val();
        if (!post) {
            container.innerHTML = '<div style="text-align:center;padding:20px;color:#e74c3c;">❌ Пост не найден</div>';
            return;
        }
        post.id = postId;
        var postEl = renderPost(post, type);
        container.innerHTML = '';
        container.appendChild(postEl);
        
        setTimeout(function() {
            var wrapper = document.getElementById('commentsWrapper_' + postId);
            if (wrapper) {
                wrapper.style.display = 'block';
                wrapper.style.opacity = '1';
                var state = getCommentState(postId);
                state.open = true;
                loadComments(postId, type);
            }
        }, 500);
    });
};

window.closePostPage = function() {
    document.getElementById('postPage').classList.remove('active');
    setActivePage('feed');
    window.CURRENT_POST_ID = null;
    window.CURRENT_POST_TYPE = null;
    loadFeed();
};

// ================================================================
// УДАЛЕНИЕ ПОСТА
// ================================================================

window.deletePost = function(id, type) {
    var path = getPostPath(type);
    
    db.ref('sites/' + SITE + '/' + path + '/' + id).update({
        deleted: true,
        deletedAt: Date.now()
    });
    
    db.ref('sites/' + SITE + '/' + path + '/' + id + '/authorUid').once('value', function(snap) {
        var authorUid = snap.val();
        if (authorUid) {
            db.ref('sites/' + SITE + '/user_posts/' + authorUid + '/' + id).update({
                deleted: true,
                deletedAt: Date.now()
            });
        }
    });
    
    var menu = document.getElementById('menu_' + id);
    if (menu) menu.classList.remove('open');
    
    if (type === 'feed' || type === 'profile') {
        var postEl = document.querySelector('.post[data-id="' + id + '"]');
        if (postEl) {
            var deletedHtml = `
                <div style="padding:10px;text-align:center;color:var(--muted-text);background:var(--input-bg);border-radius:8px;border:1px solid var(--border-color);">
                    🗑 Пост удален 
                    <button onclick="restorePost('${id}', '${type}')" style="background:var(--link-color);color:#fff;border:none;border-radius:12px;padding:2px 12px;cursor:pointer;font-size:0.6rem;margin-left:6px;">↩️ Восстановить</button>
                    <button onclick="permanentDeletePost('${id}', '${type}')" style="background:var(--danger);color:#fff;border:none;border-radius:12px;padding:2px 12px;cursor:pointer;font-size:0.6rem;margin-left:4px;">✕ Удалить навсегда</button>
                </div>
            `;
            postEl.innerHTML = deletedHtml;
        }
    }
    
    setTimeout(function() {
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadProfile === 'function') loadProfile();
    }, 300);
};

window.permanentDeletePost = function(id, type) {
    var path = getPostPath(type);
    
    db.ref('sites/' + SITE + '/' + path + '/' + id).remove();
    
    db.ref('sites/' + SITE + '/' + path + '/' + id + '/authorUid').once('value', function(snap) {
        var authorUid = snap.val();
        if (authorUid) {
            db.ref('sites/' + SITE + '/user_posts/' + authorUid + '/' + id).remove();
        }
    });
    
    var postEl = document.querySelector('.post[data-id="' + id + '"]');
    if (postEl && postEl.parentNode) {
        postEl.parentNode.removeChild(postEl);
    }
    
    setTimeout(function() {
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadProfile === 'function') loadProfile();
    }, 50);
};

window.restorePost = function(id, type) {
    var path = getPostPath(type);
    
    db.ref('sites/' + SITE + '/' + path + '/' + id).update({
        deleted: null,
        deletedAt: null
    });
    
    db.ref('sites/' + SITE + '/' + path + '/' + id + '/authorUid').once('value', function(snap) {
        var authorUid = snap.val();
        if (authorUid) {
            db.ref('sites/' + SITE + '/user_posts/' + authorUid + '/' + id).update({
                deleted: null,
                deletedAt: null
            });
        }
    });
    
    if (type === 'feed' || type === 'profile') {
        var postEl = document.querySelector('.post[data-id="' + id + '"]');
        if (postEl) {
            db.ref('sites/' + SITE + '/' + path + '/' + id).once('value', function(snap) {
                var p = snap.val();
                if (p) {
                    p.id = id;
                    var newPostEl = renderPost(p, type);
                    postEl.parentNode.replaceChild(newPostEl, postEl);
                }
            });
        }
    }
    
    setTimeout(function() {
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadProfile === 'function') loadProfile();
    }, 300);
};

// ================================================================
// РЕДАКТИРОВАНИЕ ПОСТА
// ================================================================

window.openEdit = function(id, type) {
    EDITING_ID = { id: id, type: type };
    document.getElementById('editModal').classList.add('open');
    var path = getPostPath(type);

    var menu = document.getElementById('menu_' + id);
    if (menu) menu.classList.remove('open');

    db.ref('sites/' + SITE + '/' + path + '/' + id).once('value', function(snap) {
        var p = snap.val();
        if (!p) return;

        document.getElementById('editMarquee').value = p.marquee || '';
        document.getElementById('editText').value = p.text || '';
        document.getElementById('editLink').value = p.link || '';
        document.getElementById('editHashtags').value = (p.hashtags || []).join(' ');

        var frameSize = p.frameSize || 'small';
        document.querySelectorAll('.frame-size-btn').forEach(function(btn) {
            btn.classList.remove('active');
        });
        if (frameSize === 'large') {
            var btn = document.getElementById('frameSizeLarge');
            if (btn) btn.classList.add('active');
        } else {
            var btn = document.getElementById('frameSizeSmall');
            if (btn) btn.classList.add('active');
        }
        currentFrameSize = frameSize;

        var container = document.getElementById('editButtonsContainer');
        container.innerHTML = '';
        var btns = p.buttons || [];
        btns.forEach(function(btn) { addEditBtn(btn.label, btn.url); });
        if (btns.length === 0) addEditBtn('', '');
    });
};

window.addEditBtn = function(label, url) {
    label = label || '';
    url = url || '';
    var container = document.getElementById('editButtonsContainer');
    var div = document.createElement('div');
    div.className = 'btn-group-edit';
    div.innerHTML = '<input class="btn-label-input" placeholder="Текст кнопки" value="' + esc(label) + '"><input class="btn-url-input" placeholder="Ссылка" value="' + esc(url) + '"><button class="btn-remove" onclick="removeEditBtn(this)">✕</button>';
    container.appendChild(div);
};

window.removeEditBtn = function(btn) {
    var group = btn.parentElement;
    if (document.getElementById('editButtonsContainer').children.length > 1) {
        group.remove();
    } else {
        group.querySelector('.btn-label-input').value = '';
        group.querySelector('.btn-url-input').value = '';
    }
};

window.saveEdit = function() {
    if (!EDITING_ID) return;
    var id = EDITING_ID.id;
    var type = EDITING_ID.type;
    var path = getPostPath(type);

    var marquee = document.getElementById('editMarquee').value.trim();
    var text = document.getElementById('editText').value.trim();
    var link = document.getElementById('editLink').value.trim();
    var hashtagsRaw = document.getElementById('editHashtags').value.trim();
    var hashtags = hashtagsRaw ? hashtagsRaw.split(/\s+/).filter(function(t) { return t.startsWith('#'); }) : [];

    var frameSize = 'small';
    if (document.getElementById('frameSizeLarge') && document.getElementById('frameSizeLarge').classList.contains('active')) {
        frameSize = 'large';
    }

    var buttons = [];
    document.querySelectorAll('#editButtonsContainer .btn-group-edit').forEach(function(g) {
        var label = g.querySelector('.btn-label-input').value.trim();
        var url = g.querySelector('.btn-url-input').value.trim();
        if (url) buttons.push({ label: label || '🔗 Перейти', url: url });
    });

    var updates = {
        marquee: marquee || null,
        text: text || '📝',
        link: link || null,
        hashtags: hashtags,
        buttons: buttons,
        frameSize: frameSize,
        edited: true,
        editedAt: Date.now()
    };

    db.ref('sites/' + SITE + '/' + path + '/' + id).update(updates);
    closeEdit();
    alert('✅ Пост обновлён!');
    
    setTimeout(function() {
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadProfile === 'function') loadProfile();
    }, 100);
    
    setTimeout(function() {
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadProfile === 'function') loadProfile();
    }, 500);
};

window.deleteEditPost = function() {
    if (!EDITING_ID) return;
    var id = EDITING_ID.id;
    var type = EDITING_ID.type;
    var path = getPostPath(type);
    
    db.ref('sites/' + SITE + '/' + path + '/' + id).update({
        deleted: true,
        deletedAt: Date.now()
    });
    
    closeEdit();
    
    setTimeout(function() {
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadProfile === 'function') loadProfile();
    }, 300);
};

window.closeEdit = function() {
    document.getElementById('editModal').classList.remove('open');
    EDITING_ID = null;
};

window.togglePostMenu = function(id) {
    var menu = document.getElementById('menu_' + id);
    if (menu) {
        document.querySelectorAll('.post-menu .dropdown.open').forEach(function(el) {
            if (el.id !== 'menu_' + id) el.classList.remove('open');
        });
        menu.classList.toggle('open');
    }
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('.post-menu')) {
        document.querySelectorAll('.post-menu .dropdown.open').forEach(function(el) {
            el.classList.remove('open');
        });
    }
});

window.searchByTag = function(tag) {
    var input = document.getElementById('postEditor');
    if (input) {
        input.innerHTML = tag + ' ';
        input.focus();
    }
};

// ================================================================
// РЕПОСТЫ — БЕЗ ЛИШНЕГО ПОДТВЕРЖДЕНИЯ
// ================================================================

window.openRepost = function(postId, type) {
    if (!USER) { alert('Войдите!'); return; }
    
    document.getElementById('repostModal').classList.add('open');
    document.getElementById('repostPostId').value = postId;
    document.getElementById('repostType').value = type;
    document.getElementById('repostText').value = '';
    document.getElementById('repostText').placeholder = 'Напишите что-нибудь (необязательно)...';
    document.getElementById('repostText').focus();
};

window.closeRepost = function() {
    document.getElementById('repostModal').classList.remove('open');
};

window.submitRepost = function() {
    var postId = document.getElementById('repostPostId').value;
    var type = document.getElementById('repostType').value;
    var comment = document.getElementById('repostText').value.trim();
    
    if (!postId) { alert('Ошибка: пост не найден'); return; }
    
    var path = getPostPath(type);
    
    db.ref('sites/' + SITE + '/' + path + '/' + postId).once('value', function(snap) {
        var original = snap.val();
        if (!original) { alert('Пост удалён'); closeRepost(); return; }
        
        var repostText = comment || '🔁 Репост';
        
        db.ref('sites/' + SITE + '/users/' + USER_UID + '/avatarUrl').once('value', function(avatarSnap) {
            var avatarUrl = avatarSnap.val() || null;
            
            var repostData = {
                author: USER,
                authorUid: USER_UID,
                authorAvatar: avatarUrl,
                text: repostText,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now(),
                likes: 0,
                commentCount: 0,
                reposts: 0,
                hashtags: [],
                marquee: null,
                link: null,
                buttons: [],
                frameSize: 'small',
                edited: false,
                img: null,
                repost: null,
                deleted: null,
                deletedAt: null
            };
            
            if (pendingImageFile) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    repostData.img = e.target.result;
                    repostData.repost = createRepostObject(original);
                    saveNestedRepost(repostData, postId, type, path);
                };
                reader.readAsDataURL(pendingImageFile);
                return;
            }
            
            repostData.repost = createRepostObject(original);
            saveNestedRepost(repostData, postId, type, path);
        });
    });
};

function createRepostObject(original) {
    if (original.repost) {
        return {
            author: original.author,
            authorUid: original.authorUid,
            text: original.text || '',
            time: original.time || '',
            timestamp: original.timestamp || Date.now(),
            img: original.img || null,
            link: original.link || null,
            buttons: original.buttons || [],
            marquee: original.marquee || null,
            hashtags: original.hashtags || [],
            frameSize: original.frameSize || 'small',
            repost: original.repost
        };
    }
    
    return {
        author: original.author,
        authorUid: original.authorUid,
        text: original.text || '',
        time: original.time || '',
        timestamp: original.timestamp || Date.now(),
        img: original.img || null,
        link: original.link || null,
        buttons: original.buttons || [],
        marquee: original.marquee || null,
        hashtags: original.hashtags || [],
        frameSize: original.frameSize || 'small',
        repost: null
    };
}

function saveNestedRepost(repostData, postId, type, path) {
    var repostRef = db.ref('sites/' + SITE + '/' + path + '/' + postId + '/reposts');
    repostRef.transaction(function(current) {
        return (current || 0) + 1;
    });
    
    db.ref('sites/' + SITE + '/feed_posts').push(repostData);
    db.ref('sites/' + SITE + '/user_posts/' + USER_UID).push(repostData);
    
    closeRepost();
    
    setTimeout(function() {
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadProfile === 'function') loadProfile();
    }, 300);
};

// ================================================================
// РАЗМЕР ФРЕЙМА
// ================================================================

window.setFrameSize = function(size) {
    currentFrameSize = size;
    document.querySelectorAll('.frame-size-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    if (size === 'small') {
        var btn = document.getElementById('frameSizeSmall');
        if (btn) btn.classList.add('active');
    } else {
        var btn = document.getElementById('frameSizeLarge');
        if (btn) btn.classList.add('active');
    }
};

// ================================================================
// ФОТО-ЛЕНТА (ОТДЕЛЬНАЯ)
// ================================================================

var fotoFeedListener = null;
var pendingFotoImage = null;
var pendingFotoImageFile = null;

function getFotoEditorText() {
    var editor = document.getElementById('postEditorFoto');
    if (!editor) return '';
    return editor.innerHTML;
}

function clearFotoPostForm() {
    var editor = document.getElementById('postEditorFoto');
    if (editor) editor.innerHTML = '';
    pendingFotoImage = null;
    pendingFotoImageFile = null;
    var preview = document.getElementById('previewBoxFoto');
    if (preview) preview.classList.remove('visible');
    var input = document.getElementById('fileInputFoto');
    if (input) input.value = '';
}

function removeFotoImage() {
    pendingFotoImage = null;
    pendingFotoImageFile = null;
    var preview = document.getElementById('previewBoxFoto');
    if (preview) preview.classList.remove('visible');
    var input = document.getElementById('fileInputFoto');
    if (input) input.value = '';
}

document.addEventListener('DOMContentLoaded', function() {
    var fileInput = document.getElementById('fileInputFoto');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                alert('Только изображения!');
                this.value = '';
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('Максимум 5 МБ');
                this.value = '';
                return;
            }

            pendingFotoImageFile = file;
            var reader = new FileReader();
            reader.onload = function(ev) {
                pendingFotoImage = ev.target.result;
                var img = document.getElementById('previewImgFoto');
                var name = document.getElementById('previewNameFoto');
                var box = document.getElementById('previewBoxFoto');
                if (img) img.src = pendingFotoImage;
                if (name) name.textContent = file.name.slice(0, 16);
                if (box) box.classList.add('visible');
            };
            reader.readAsDataURL(file);
        });
    }
});

function loadFotoFeed() {
    var el = document.getElementById('fotoFeed');
    if (!el) return;

    if (!USER || !USER_UID) {
        el.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Войдите, чтобы видеть ленту</div>';
        return;
    }

    showLoading(el);

    if (fotoFeedListener) {
        db.ref('sites/' + SITE + '/foto_posts').off('value', fotoFeedListener);
        fotoFeedListener = null;
    }

    fotoFeedListener = function(snap) {
        var data = snap.val() || {};
        var keys = Object.keys(data).sort(function(a, b) {
            return (data[b].timestamp || 0) - (data[a].timestamp || 0);
        });

        if (!keys.length) {
            el.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Пока нет фото-постов. Будьте первым!</div>';
            return;
        }

        el.innerHTML = '';

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

window.submitFotoPost = function() {
    if (!USER || !USER_UID) {
        alert('Войдите, чтобы опубликовать пост!');
        var loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.add('open');
        return;
    }

    var text = getFotoEditorText().trim();
    if (!text && !pendingFotoImageFile) {
        alert('Введите текст или добавьте фото');
        return;
    }

    var hashtags = extractHashtags(text);
    
    db.ref('sites/' + SITE + '/users/' + USER_UID + '/avatarUrl').once('value', function(avatarSnap) {
        var avatarUrl = avatarSnap.val() || null;
        
        var postData = {
            author: USER,
            authorUid: USER_UID,
            authorAvatar: avatarUrl,
            text: text || '📷',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now(),
            likes: 0,
            commentCount: 0,
            reposts: 0,
            hashtags: hashtags,
            marquee: null,
            link: null,
            buttons: [],
            frameSize: 'small',
            edited: false,
            img: null,
            repost: null,
            deleted: null,
            deletedAt: null
        };

        var savePost = function(imgData) {
            if (imgData) postData.img = imgData;
            
            db.ref('sites/' + SITE + '/foto_posts').push(postData);
            clearFotoPostForm();
            
            setTimeout(function() {
                loadFotoFeed();
            }, 100);
        };

        if (pendingFotoImageFile) {
            var reader = new FileReader();
            reader.onload = function(e) {
                savePost(e.target.result);
            };
            reader.readAsDataURL(pendingFotoImageFile);
        } else {
            savePost(null);
        }
    });
};

// ================================================================
// ТОГЛ МЕНЮ
// ================================================================

window.togglePostMenu = function(id) {
    var menu = document.getElementById('menu_' + id);
    if (menu) {
        document.querySelectorAll('.post-menu .dropdown.open').forEach(function(el) {
            if (el.id !== 'menu_' + id) el.classList.remove('open');
        });
        menu.classList.toggle('open');
    }
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('.post-menu')) {
        document.querySelectorAll('.post-menu .dropdown.open').forEach(function(el) {
            el.classList.remove('open');
        });
    }
});
