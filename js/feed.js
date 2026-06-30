// ================================================================
// ЛЕНТА И ПОСТЫ (обновлённая версия)
// ================================================================

// ================================================================
// 1. ВСПОМОГАТЕЛЬНЫЕ ПЕРЕМЕННЫЕ И ФУНКЦИИ
// ================================================================

var commentStates = {};

function getPostPath(type) {
    if (type === 'group') return 'group_posts/' + currentGroup;
    return 'feed_posts';
}

function getCommentState(postId) {
    if (!commentStates[postId]) {
        commentStates[postId] = {
            open: false,
            allComments: []
        };
    }
    return commentStates[postId];
}

// ================================================================
// 2. ЗАГРУЗКА ЛЕНТЫ
// ================================================================

function loadFeed() {
    if (!USER_UID) {
        document.getElementById('feed').innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Войдите</div>';
        return;
    }

    db.ref('sites/' + SITE + '/feed_posts').orderByChild('timestamp').on('value', function(snap) {
        var el = document.getElementById('feed');
        el.innerHTML = '';
        var data = snap.val() || {};
        var keys = Object.keys(data).sort(function(a, b) {
            return (data[b].timestamp || 0) - (data[a].timestamp || 0);
        });

        if (!keys.length) {
            el.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Пока пусто</div>';
            return;
        }

        keys.forEach(function(k) {
            var p = data[k];
            p.id = k;
            el.appendChild(renderPost(p, 'feed'));
        });
    });
}

// ================================================================
// 3. ОТПРАВКА ПОСТА - ИСПРАВЛЕННАЯ
// ================================================================

window.submitPost = function() {
    if (!USER) {
        alert('Войдите!');
        return;
    }

    var text = document.getElementById('postInput').value.trim();

    // Если нет ни текста, ни фото — блокируем
    if (!text && !pendingImageFile) {
        alert('Введите текст или добавьте фото');
        return;
    }

    var hashtags = extractHashtags(text);

    var postData = {
        author: USER,
        authorUid: USER_UID,
        text: text || '📷',          // если текста нет — иконка
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        likes: 0,
        commentCount: 0,
        hashtags: hashtags,
        marquee: null,
        link: null,
        buttons: [],
        frameSize: 'small',
        edited: false,
        img: null                    // по умолчанию null
    };

    // Ссылка, если есть
    var linkMatch = (text || '').match(/(https?:\/\/[^\s]+)/);
    if (linkMatch) postData.link = linkMatch[1];

    // Если есть фото — отправляем с фото
    if (pendingImageFile) {
        var reader = new FileReader();
        reader.onload = function(e) {
            postData.img = e.target.result;
            db.ref('sites/' + SITE + '/feed_posts').push(postData);
            clearPostForm();
        };
        reader.readAsDataURL(pendingImageFile);
    } else {
        // Фото нет — отправляем только текст
        db.ref('sites/' + SITE + '/feed_posts').push(postData);
        clearPostForm();
    }
};

// ================================================================
// 4. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ================================================================

function extractHashtags(text) {
    if (!text) return [];
    var matches = text.match(/#[\wа-яё]+/gi) || [];
    return matches.slice(0, 8);
}

window.clearPostForm = function() {
    document.getElementById('postInput').value = '';
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

// ================================================================
// 5. ЗАГРУЗКА КАРТИНКИ В ПОСТ
// ================================================================

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
// 6. РЕНДЕР ПОСТА — СТРОКА ВВОДА ВНИЗУ, БЕЗ FIXED
// ================================================================

function renderPost(p, type) {
    var div = document.createElement('div');
    div.className = 'post';
    div.dataset.id = p.id;

    var isLiked = localStorage.getItem('lk_' + p.id + '_' + USER_UID) === '1';
    var letter = (p.author || '?').charAt(0).toUpperCase();
    var avatarHtml = '<span class="avatar-wrap" id="post-avatar-' + p.id + '"><span class="letter">' + letter + '</span></span>';

    var marqueeHtml = p.marquee ? '<div class="marquee"><span>' + esc(p.marquee) + '</span></div>' : '';
    var textHtml = esc(p.text || '');
    var imgHtml = p.img ? '<img src="' + p.img + '" class="post-img" onclick="window.open(this.src)">' : '';

    var buttonsHtml = '';
    if (p.buttons && p.buttons.length > 0) {
        buttonsHtml = '<div class="buttons-wrap">';
        p.buttons.forEach(function(btn) {
            if (btn.url) {
                buttonsHtml += '<a href="' + esc(btn.url) + '" target="_blank" class="btn-item">' + esc(btn.label || '🔗 Перейти') + '</a>';
            }
        });
        buttonsHtml += '</div>';
    }

    var previewHtml = '';
    if (p.link) {
        var frameSize = p.frameSize || 'small';
        previewHtml = '<div class="link-preview"><iframe src="' + p.link + '" class="' + frameSize + '" sandbox="allow-scripts allow-same-origin allow-popups"></iframe></div>';
    }

    var hashtagsHtml = '';
    if (p.hashtags && p.hashtags.length > 0) {
        hashtagsHtml = '<div class="hashtags">';
        p.hashtags.forEach(function(tag) {
            hashtagsHtml += '<span class="tag" onclick="searchByTag(\'' + esc(tag) + '\')">' + esc(tag) + '</span>';
        });
        hashtagsHtml += '</div>';
    }

    var menuHtml = '';
    if (p.author === USER || isAdmin) {
        menuHtml = '<div class="post-menu"><button class="dots" onclick="togglePostMenu(\'' + p.id + '\')">⋮</button><div class="dropdown" id="menu_' + p.id + '"><button class="edit-btn" onclick="openEdit(\'' + p.id + '\', \'' + type + '\')">✏️ Редактировать</button><button class="del-btn" onclick="deletePost(\'' + p.id + '\', \'' + type + '\')">🗑 Удалить</button></div></div>';
    }

    var actionsHtml = '<div class="stats"><button class="' + (isLiked ? 'liked' : '') + '" onclick="toggleLike(\'' + p.id + '\', \'' + type + '\')">👍 <span id="likeCount_' + p.id + '">' + (p.likes || 0) + '</span></button><button onclick="toggleComments(\'' + p.id + '\', \'' + type + '\')">💬 <span id="commentCount_' + p.id + '">' + (p.commentCount || 0) + '</span></button></div>';

    // ===== КОММЕНТАРИИ — СТРОКА ВВОДА ВНИЗУ =====
    // 👇 comments-wrapper скрыт по умолчанию (display: none)
    // 👇 строка ввода идёт ПОСЛЕ списка — браузер сам сдвинет её вниз при открытии
    var commentsHtml = `
        <div class="comments-wrapper" id="commentsWrapper_${p.id}" style="display:none;">
            <div class="comments" id="comments_${p.id}">
                <div class="comments-body" id="commentsBody_${p.id}">
                    <!-- СПИСОК КОММЕНТАРИЕВ -->
                    <div class="comments-list" id="commentsList_${p.id}">
                        <div id="commentsContainer_${p.id}"></div>
                    </div>
                    <!-- СТРОКА ВВОДА — ВНИЗУ, В ПОТОКЕ -->
                    <div class="comment-input-wrap" id="commentInputWrap_${p.id}">
                        <input type="text" id="commentInput_${p.id}" placeholder="Написать комментарий...">
                        <button onclick="submitComment('${p.id}', '${type}')">→</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    div.innerHTML = menuHtml + marqueeHtml + '<div class="author">' + avatarHtml + '<span class="name" onclick="viewUser(\'' + (p.authorUid || '') + '\')">' + esc(p.author || 'Аноним') + '</span><span class="time">' + (p.time || '') + (p.edited ? ' <span style="color:#999;font-size:0.4rem;">(ред.)</span>' : '') + '</span></div><div class="text">' + textHtml + '</div>' + imgHtml + buttonsHtml + previewHtml + hashtagsHtml + actionsHtml + commentsHtml;

    if (p.authorUid) {
        var avatarEl = document.getElementById('post-avatar-' + p.id);
        if (avatarEl) renderAvatar(p.authorUid, avatarEl, letter);
    }

    loadComments(p.id, type);
    return div;
}

// ================================================================
// 7. ПЕРЕКЛЮЧЕНИЕ КОММЕНТАРИЕВ — ПРОСТО display: none/block
// ================================================================

window.toggleComments = function(postId, type) {
    var state = getCommentState(postId);
    state.open = !state.open;

    var wrapper = document.getElementById('commentsWrapper_' + postId);
    if (wrapper) {
        wrapper.style.display = state.open ? 'block' : 'none';
    }

    if (state.open) {
        loadComments(postId, type);
        setTimeout(function() {
            var input = document.getElementById('commentInput_' + postId);
            if (input) {
                input.focus();
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 400);
    }
};

// ================================================================
// 8. ЗАГРУЗКА КОММЕНТАРИЕВ — БЕЗ ЛИМИТОВ
// ================================================================

function loadComments(postId, type) {
    var path = getPostPath(type);
    var state = getCommentState(postId);

    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments').orderByChild('timestamp').on('value', function(snap) {
        var container = document.getElementById('commentsContainer_' + postId);
        if (!container) return;

        var data = snap.val() || {};
        var keys = Object.keys(data).sort(function(a, b) {
            return (data[a].timestamp || 0) - (data[b].timestamp || 0);
        });

        // ✅ Загружаем ВСЕ комментарии, без лимитов
        state.allComments = keys.map(function(k) {
            return { id: k, ...data[k] };
        });

        var countEl = document.getElementById('commentCount_' + postId);
        if (countEl) countEl.textContent = state.allComments.length;
        db.ref('sites/' + SITE + '/' + path + '/' + postId + '/commentCount').set(state.allComments.length);

        renderComments(postId, type);
    });
}

// ================================================================
// 9. РЕНДЕР КОММЕНТАРИЕВ — С КНОПКОЙ ЛАЙКА
// ================================================================

function renderComments(postId, type) {
    var state = getCommentState(postId);
    var container = document.getElementById('commentsContainer_' + postId);
    if (!container) return;

    if (!state.allComments.length) {
        container.innerHTML = '<div class="no-comments">Нет комментариев</div>';
        return;
    }

    // ✅ БЕЗ "ПОКАЗАТЬ ЕЩЁ" — грузим все
    var html = '';
    state.allComments.forEach(function(c) {
        var letter = (c.author || '?').charAt(0).toUpperCase();
        var canEdit = (c.author === USER || isAdmin);
        var likes = c.likes || 0;

        html += '<div class="comment-item" data-id="' + c.id + '">';
        html += '<span class="avatar-wrap" id="comment-avatar-' + c.id + '"><span class="letter">' + letter + '</span></span>';
        html += '<div class="body">';
        html += '<span class="name">' + esc(c.author || 'Аноним') + '</span>';
        html += '<span class="time">' + (c.time || '') + (c.edited ? ' <span style="color:#999;font-size:0.4rem;">(ред.)</span>' : '') + '</span>';
        html += '<div class="text" id="comment-text-' + c.id + '">' + esc(c.text || '') + '</div>';

        // ✅ КНОПКА ЛАЙКА ДЛЯ КОММЕНТАРИЯ
        html += '<div class="comment-actions-row">';
        html += '<button class="comment-like-btn" onclick="toggleLikeComment(\'' + postId + '\', \'' + c.id + '\')">👍 <span id="commentLikeCount_' + c.id + '">' + likes + '</span></button>';
        html += '</div>';

        html += '</div>'; // .body

        if (canEdit) {
            html += '<div class="comment-actions">';
            html += '<button class="more-btn" onclick="toggleCommentMenu(\'' + c.id + '\')">⋮</button>';
            html += '<div class="dropdown" id="commentMenu_' + c.id + '">';
            html += '<button class="edit-btn" onclick="editComment(\'' + postId + '\',\'' + c.id + '\',\'' + type + '\')">✏️ Редактировать</button>';
            html += '<button class="del-btn" onclick="deleteComment(\'' + postId + '\',\'' + c.id + '\',\'' + type + '\')">🗑 Удалить</button>';
            html += '</div>';
            html += '</div>';
        }

        html += '</div>'; // .comment-item
    });

    container.innerHTML = html;

    state.allComments.forEach(function(c) {
        var avatarEl = document.getElementById('comment-avatar-' + c.id);
        if (avatarEl && c.authorUid) {
            renderAvatar(c.authorUid, avatarEl, (c.author || '?').charAt(0).toUpperCase());
        }
    });
}

// ================================================================
// 10. ЛАЙК КОММЕНТАРИЯ — НОВАЯ ФУНКЦИЯ
// ================================================================

window.toggleLikeComment = function(postId, commentId) {
    if (!USER) {
        alert('Войдите!');
        return;
    }

    var ref = db.ref('sites/' + SITE + '/feed_posts/' + postId + '/comments/' + commentId + '/likes');
    ref.transaction(function(likes) {
        return (likes || 0) + 1;
    });

    // Обновляем счётчик на странице
    var countEl = document.getElementById('commentLikeCount_' + commentId);
    if (countEl) {
        var current = parseInt(countEl.textContent) || 0;
        countEl.textContent = current + 1;
    }
};

// ================================================================
// 11. ЛАЙК ПОСТА
// ================================================================

window.toggleLike = function(postId, type) {
    if (!USER) {
        alert('Войдите!');
        return;
    }

    var key = 'lk_' + postId + '_' + USER_UID;
    var liked = localStorage.getItem(key) === '1';
    var path = getPostPath(type);
    var ref = db.ref('sites/' + SITE + '/' + path + '/' + postId + '/likes');

    if (liked) {
        ref.transaction(function(v) { return Math.max(0, (v || 0) - 1); });
        localStorage.removeItem(key);
    } else {
        ref.transaction(function(v) { return (v || 0) + 1; });
        localStorage.setItem(key, '1');
    }
};

// ================================================================
// 12. ОТПРАВКА КОММЕНТАРИЯ
// ================================================================

window.submitComment = function(postId, type) {
    if (!USER) {
        alert('Войдите!');
        return;
    }

    var input = document.getElementById('commentInput_' + postId);
    var text = input.value.trim();
    if (!text) return;

    var path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments').push({
        author: USER,
        authorUid: USER_UID,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        likes: 0
    });
    input.value = '';
};

// ================================================================
// 13. УДАЛЕНИЕ КОММЕНТАРИЯ
// ================================================================

window.deleteComment = function(postId, commentId, type) {
    if (!confirm('🗑 Удалить комментарий?')) return;
    var path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments/' + commentId).remove();
    var menu = document.getElementById('commentMenu_' + commentId);
    if (menu) menu.classList.remove('open');
};

// ================================================================
// 14. МЕНЮ КОММЕНТАРИЯ (три точки)
// ================================================================

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

// ================================================================
// 15. РЕДАКТИРОВАНИЕ КОММЕНТАРИЯ
// ================================================================

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
        deleteComment(postId, commentId, type);
        return;
    }
    var path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments/' + commentId).update({
        text: newText,
        edited: true
    });
}

// ================================================================
// 16. УДАЛЕНИЕ ПОСТА
// ================================================================

window.deletePost = function(id, type) {
    if (!confirm('🗑 Удалить пост?')) return;
    var path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + id).remove();
    var menu = document.getElementById('menu_' + id);
    if (menu) menu.classList.remove('open');
};

// ================================================================
// 17. РЕДАКТИРОВАНИЕ ПОСТА
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
        setFrameSize(frameSize);

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
        frameSize: currentFrameSize,
        edited: true,
        editedAt: Date.now()
    };

    db.ref('sites/' + SITE + '/' + path + '/' + id).update(updates);
    closeEdit();
    alert('✅ Пост обновлён!');
};

window.deleteEditPost = function() {
    if (!EDITING_ID) return;
    if (!confirm('🗑 Удалить пост навсегда?')) return;
    var id = EDITING_ID.id;
    var type = EDITING_ID.type;
    var path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + id).remove();
    closeEdit();
};

window.closeEdit = function() {
    document.getElementById('editModal').classList.remove('open');
    EDITING_ID = null;
};

// ================================================================
// 18. МЕНЮ ПОСТА (три точки)
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

window.searchByTag = function(tag) {
    var input = document.getElementById('postInput');
    if (input) {
        input.value = tag + ' ';
        input.focus();
    }
};
