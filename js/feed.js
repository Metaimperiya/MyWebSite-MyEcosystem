// ================================================================
// ЛЕНТА, ПОСТЫ, КОММЕНТАРИИ, ЛАЙКИ, РЕДАКТИРОВАНИЕ
// ================================================================

// ===== ПУТЬ К ПОСТАМ =====
function getPostPath(type) {
    return type === 'group' ? 'group_posts/' + currentGroup : 'feed_posts';
}

let currentGroup = null;

// ================================================================
// КОММЕНТАРИИ — СОСТОЯНИЕ
// ================================================================

const COMMENTS_LIMIT = 5;
let commentStates = {};

function getCommentState(postId) {
    if (!commentStates[postId]) {
        commentStates[postId] = {
            open: false,
            allComments: [],
            showAll: false
        };
    }
    return commentStates[postId];
}

// ================================================================
// ПЕРЕКЛЮЧЕНИЕ КОММЕНТАРИЕВ
// ================================================================

window.toggleComments = function(postId, type) {
    const state = getCommentState(postId);
    state.open = !state.open;

    const body = document.getElementById('commentsBody_' + postId);
    const toggle = document.getElementById('commentsToggle_' + postId);

    if (body) {
        body.classList.toggle('open', state.open);
        if (toggle) {
            toggle.classList.toggle('active', state.open);
        }
    }

    if (state.open) {
        loadComments(postId, type);
        setTimeout(() => {
            const input = document.getElementById('commentInput_' + postId);
            if (input) input.focus();
        }, 300);
    }
};

// ================================================================
// ЗАГРУЗКА КОММЕНТАРИЕВ
// ================================================================

function loadComments(postId, type) {
    const path = getPostPath(type);
    const state = getCommentState(postId);

    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments')
        .orderByChild('timestamp')
        .on('value', snap => {
            const container = document.getElementById('commentsContainer_' + postId);
            if (!container) return;

            const data = snap.val() || {};
            const keys = Object.keys(data).sort((a, b) => (data[a].timestamp || 0) - (data[b].timestamp || 0));

            state.allComments = keys.map(k => ({ id: k, ...data[k] }));

            const countEl = document.getElementById('commentCount_' + postId);
            if (countEl) countEl.textContent = state.allComments.length;
            db.ref('sites/' + SITE + '/' + path + '/' + postId + '/commentCount').set(state.allComments.length);

            renderComments(postId, type);
        });
}

// ================================================================
// РЕНДЕР КОММЕНТАРИЕВ
// ================================================================

function renderComments(postId, type) {
    const state = getCommentState(postId);
    const container = document.getElementById('commentsContainer_' + postId);
    if (!container) return;

    if (!state.allComments.length) {
        container.innerHTML = '<div class="no-comments">Нет комментариев</div>';
        return;
    }

    const showAll = state.showAll || false;
    const commentsToShow = showAll ? state.allComments : state.allComments.slice(0, COMMENTS_LIMIT);
    const hasMore = !showAll && state.allComments.length > COMMENTS_LIMIT;

    let html = '';
    commentsToShow.forEach(c => {
        const letter = (c.author || '?').charAt(0).toUpperCase();
        const canEdit = (c.author === USER || IS_ADMIN);

        html += `
            <div class="comment-item" data-id="${c.id}">
                <span class="avatar-wrap" id="comment-avatar-${c.id}">
                    <span class="letter">${letter}</span>
                </span>
                <div class="body">
                    <span class="name">${esc(c.author || 'Аноним')}</span>
                    <span class="time">${c.time || ''}${c.edited ? ' <span style="color:#999;font-size:0.4rem;">(ред.)</span>' : ''}</span>
                    <div class="text" id="comment-text-${c.id}">${esc(c.text || '')}</div>
                </div>
                ${canEdit ? `
                <div class="comment-actions">
                    <button class="more-btn" onclick="toggleCommentMenu('${c.id}')">⋮</button>
                    <div class="dropdown" id="commentMenu_${c.id}">
                        <button class="edit-btn" onclick="editComment('${postId}','${c.id}','${type}')">✏️ Редактировать</button>
                        <button class="del-btn" onclick="deleteComment('${postId}','${c.id}','${type}')">🗑 Удалить</button>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    });

    if (hasMore) {
        html += `
            <button class="show-more-btn" onclick="showAllComments('${postId}','${type}')">
                📥 Показать ещё (${state.allComments.length - COMMENTS_LIMIT})
            </button>
        `;
    }

    container.innerHTML = html;

    commentsToShow.forEach(c => {
        const avatarEl = document.getElementById('comment-avatar-' + c.id);
        if (avatarEl && c.authorUid) {
            renderAvatar(c.authorUid, avatarEl, (c.author || '?').charAt(0).toUpperCase());
        }
    });
}

// ================================================================
// ПОКАЗАТЬ ВСЕ КОММЕНТАРИИ
// ================================================================

window.showAllComments = function(postId, type) {
    const state = getCommentState(postId);
    state.showAll = true;
    renderComments(postId, type);
};

// ================================================================
// ОТПРАВКА КОММЕНТАРИЯ
// ================================================================

window.submitComment = function(postId, type) {
    if (!USER) {
        alert('Войдите!');
        return;
    }
    const input = document.getElementById('commentInput_' + postId);
    const text = input.value.trim();
    if (!text) return;

    const path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments').push({
        author: USER,
        authorUid: USER_UID,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    });
    input.value = '';

    const state = getCommentState(postId);
    if (!state.open) {
        state.open = true;
        const body = document.getElementById('commentsBody_' + postId);
        const toggle = document.getElementById('commentsToggle_' + postId);
        if (body) body.classList.add('open');
        if (toggle) toggle.classList.add('active');
    }
};

// ================================================================
// УДАЛЕНИЕ КОММЕНТАРИЯ
// ================================================================

window.deleteComment = function(postId, commentId, type) {
    if (!confirm('🗑 Удалить комментарий?')) return;
    const path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments/' + commentId).remove();
    const menu = document.getElementById('commentMenu_' + commentId);
    if (menu) menu.classList.remove('open');
};

// ================================================================
// МЕНЮ КОММЕНТАРИЯ (ТРИ ТОЧКИ)
// ================================================================

function toggleCommentMenu(commentId) {
    const menu = document.getElementById('commentMenu_' + commentId);
    if (!menu) return;
    document.querySelectorAll('.comment-actions .dropdown.open').forEach(el => {
        if (el.id !== 'commentMenu_' + commentId) el.classList.remove('open');
    });
    menu.classList.toggle('open');
}

// Закрываем меню при клике вне
document.addEventListener('click', function(e) {
    if (!e.target.closest('.comment-actions')) {
        document.querySelectorAll('.comment-actions .dropdown.open').forEach(el => el.classList.remove('open'));
    }
});

// ================================================================
// РЕДАКТИРОВАНИЕ КОММЕНТАРИЯ
// ================================================================

function editComment(postId, commentId, type) {
    const textEl = document.getElementById('comment-text-' + commentId);
    if (!textEl) return;

    const menu = document.getElementById('commentMenu_' + commentId);
    if (menu) menu.classList.remove('open');

    const currentText = textEl.textContent;
    const input = document.createElement('input');
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
        setTimeout(() => {
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
    const path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments/' + commentId).update({
        text: newText,
        edited: true
    });
}

// ================================================================
// ЛЕНТА
// ================================================================

function loadFeed() {
    if (!USER_UID) {
        document.getElementById('feed').innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Войдите</div>';
        return;
    }
    db.ref('sites/' + SITE + '/feed_posts').orderByChild('timestamp').on('value', snap => {
        const el = document.getElementById('feed');
        el.innerHTML = '';
        const data = snap.val() || {};
        const keys = Object.keys(data).sort((a, b) => (data[b].timestamp || 0) - (data[a].timestamp || 0));
        if (!keys.length) {
            el.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Пока пусто</div>';
            return;
        }
        keys.forEach(k => {
            const p = data[k];
            p.id = k;
            el.appendChild(renderPost(p, 'feed'));
        });
    });
}

// ================================================================
// РЕНДЕР ПОСТА
// ================================================================

function renderPost(p, type) {
    const div = document.createElement('div');
    div.className = 'post';
    div.dataset.id = p.id;

    const isLiked = localStorage.getItem('lk_' + p.id + '_' + USER_UID) === '1';
    const letter = (p.author || '?').charAt(0).toUpperCase();
    const avatarHtml = `<span class="avatar-wrap" id="post-avatar-${p.id}"><span class="letter">${letter}</span></span>`;

    let marqueeHtml = p.marquee ? `<div class="marquee"><span>${esc(p.marquee)}</span></div>` : '';
    let textHtml = esc(p.text || '');
    let imgHtml = p.img ? `<img src="${p.img}" class="post-img" onclick="window.open(this.src)">` : '';

    let buttonsHtml = '';
    if (p.buttons && p.buttons.length > 0) {
        buttonsHtml = '<div class="buttons-wrap">';
        p.buttons.forEach(btn => {
            if (btn.url) {
                buttonsHtml += `<a href="${esc(btn.url)}" target="_blank" class="btn-item">${esc(btn.label || '🔗 Перейти')}</a>`;
            }
        });
        buttonsHtml += '</div>';
    }

    let previewHtml = '';
    if (p.link) {
        const frameSize = p.frameSize || 'small';
        previewHtml = `<div class="link-preview"><iframe src="${p.link}" class="${frameSize}" sandbox="allow-scripts allow-same-origin allow-popups"></iframe></div>`;
    }

    let hashtagsHtml = '';
    if (p.hashtags && p.hashtags.length > 0) {
        hashtagsHtml = '<div class="hashtags">';
        p.hashtags.forEach(tag => {
            hashtagsHtml += `<span class="tag" onclick="searchByTag('${esc(tag)}')">${esc(tag)}</span>`;
        });
        hashtagsHtml += '</div>';
    }

    let menuHtml = '';
    if (p.author === USER || IS_ADMIN) {
        menuHtml = `
            <div class="post-menu">
                <button class="dots" onclick="togglePostMenu('${p.id}')">⋮</button>
                <div class="dropdown" id="menu_${p.id}">
                    <button class="edit-btn" onclick="openEdit('${p.id}', '${type}')">✏️ Редактировать</button>
                    <button class="del-btn" onclick="deletePost('${p.id}', '${type}')">🗑 Удалить</button>
                </div>
            </div>
        `;
    }

    // ===== КОММЕНТАРИИ =====
    let commentsHtml = `
        <div class="comments" id="comments_${p.id}">
            <button class="comments-toggle" onclick="toggleComments('${p.id}', '${type}')" id="commentsToggle_${p.id}">
                💬 <span id="commentCount_${p.id}">${p.commentCount || 0}</span>
            </button>
            <div class="comments-body" id="commentsBody_${p.id}">
                <div class="comments-list" id="commentsList_${p.id}">
                    <div id="commentsContainer_${p.id}"></div>
                </div>
                <div class="comment-input-wrap">
                    <input type="text" id="commentInput_${p.id}" placeholder="Написать комментарий...">
                    <button onclick="submitComment('${p.id}', '${type}')">→</button>
                </div>
            </div>
        </div>
    `;

    div.innerHTML = `
        ${menuHtml}
        ${marqueeHtml}
        <div class="author">
            ${avatarHtml}
            <span class="name" onclick="viewUser('${p.authorUid || ''}')">${esc(p.author || 'Аноним')}</span>
            <span class="time">${p.time || ''}${p.edited ? ' <span style="color:#999;font-size:0.4rem;">(ред.)</span>' : ''}</span>
        </div>
        <div class="text">${textHtml}</div>
        ${imgHtml}
        ${buttonsHtml}
        ${previewHtml}
        ${hashtagsHtml}
        <div class="stats">
            <button class="${isLiked ? 'liked' : ''}" onclick="toggleLike('${p.id}', '${type}')">
                👍 <span id="likeCount_${p.id}">${p.likes || 0}</span>
            </button>
            ${commentsHtml}
        </div>
    `;

    if (p.authorUid) {
        const avatarEl = document.getElementById('post-avatar-' + p.id);
        if (avatarEl) renderAvatar(p.authorUid, avatarEl, letter);
    }

    loadComments(p.id, type);
    return div;
}

// ================================================================
// ЛАЙКИ
// ================================================================

window.toggleLike = function(postId, type) {
    if (!USER) {
        alert('Войдите!');
        return;
    }
    const key = 'lk_' + postId + '_' + USER_UID;
    const liked = localStorage.getItem(key) === '1';
    const path = getPostPath(type);

    const ref = db.ref('sites/' + SITE + '/' + path + '/' + postId + '/likes');
    if (liked) {
        ref.transaction(v => Math.max(0, (v || 0) - 1));
        localStorage.removeItem(key);
    } else {
        ref.transaction(v => (v || 0) + 1);
        localStorage.setItem(key, '1');
    }
};

// ================================================================
// УДАЛИТЬ ПОСТ
// ================================================================

window.deletePost = function(id, type) {
    if (!confirm('🗑 Удалить пост?')) return;
    const path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + id).remove();
    const menu = document.getElementById('menu_' + id);
    if (menu) menu.classList.remove('open');
};

// ================================================================
// РЕДАКТИРОВАНИЕ ПОСТА
// ================================================================

window.openEdit = function(id, type) {
    EDITING_ID = { id: id, type: type };
    document.getElementById('editModal').classList.add('open');
    const path = getPostPath(type);

    const menu = document.getElementById('menu_' + id);
    if (menu) menu.classList.remove('open');

    db.ref('sites/' + SITE + '/' + path + '/' + id).once('value', snap => {
        const p = snap.val();
        if (!p) return;

        document.getElementById('editMarquee').value = p.marquee || '';
        document.getElementById('editText').value = p.text || '';
        document.getElementById('editLink').value = p.link || '';
        document.getElementById('editHashtags').value = (p.hashtags || []).join(' ');

        const frameSize = p.frameSize || 'small';
        setFrameSize(frameSize);

        const container = document.getElementById('editButtonsContainer');
        container.innerHTML = '';
        const btns = p.buttons || [];
        btns.forEach(btn => addEditBtn(btn.label, btn.url));
        if (btns.length === 0) addEditBtn('', '');
    });
};

window.addEditBtn = function(label = '', url = '') {
    const container = document.getElementById('editButtonsContainer');
    const div = document.createElement('div');
    div.className = 'btn-group';
    div.innerHTML = `
        <input class="btn-label-input" placeholder="Текст кнопки" value="${esc(label)}">
        <input class="btn-url-input" placeholder="Ссылка" value="${esc(url)}">
        <button class="btn-remove" onclick="removeEditBtn(this)">✕</button>
    `;
    container.appendChild(div);
};

window.removeEditBtn = function(btn) {
    const group = btn.parentElement;
    if (document.getElementById('editButtonsContainer').children.length > 1) {
        group.remove();
    } else {
        group.querySelector('.btn-label-input').value = '';
        group.querySelector('.btn-url-input').value = '';
    }
};

window.saveEdit = function() {
    if (!EDITING_ID) return;
    const { id, type } = EDITING_ID;
    const path = getPostPath(type);

    const marquee = document.getElementById('editMarquee').value.trim();
    const text = document.getElementById('editText').value.trim();
    const link = document.getElementById('editLink').value.trim();
    const hashtagsRaw = document.getElementById('editHashtags').value.trim();
    const hashtags = hashtagsRaw ? hashtagsRaw.split(/\s+/).filter(t => t.startsWith('#')) : [];

    const buttons = [];
    document.querySelectorAll('#editButtonsContainer .btn-group').forEach(g => {
        const label = g.querySelector('.btn-label-input').value.trim();
        const url = g.querySelector('.btn-url-input').value.trim();
        if (url) buttons.push({ label: label || '🔗 Перейти', url });
    });

    const updates = {
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
    const { id, type } = EDITING_ID;
    const path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + id).remove();
    closeEdit();
};

window.closeEdit = function() {
    document.getElementById('editModal').classList.remove('open');
    EDITING_ID = null;
};

// ================================================================
// МЕНЮ ПОСТА
// ================================================================

window.togglePostMenu = function(id) {
    const menu = document.getElementById('menu_' + id);
    if (menu) {
        document.querySelectorAll('.post-menu .dropdown.open').forEach(el => {
            if (el.id !== 'menu_' + id) el.classList.remove('open');
        });
        menu.classList.toggle('open');
    }
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('.post-menu')) {
        document.querySelectorAll('.post-menu .dropdown.open').forEach(el => el.classList.remove('open'));
    }
});

// ================================================================
// СОЗДАНИЕ ПОСТА
// ================================================================

function extractHashtags(text) {
    if (!text) return [];
    const matches = text.match(/#[\wа-яё]+/gi) || [];
    return matches.slice(0, 8);
}

window.searchByTag = function(tag) {
    const input = document.getElementById('postInput');
    if (input) {
        input.value = tag + ' ';
        input.focus();
    }
};

window.submitPost = function() {
    if (!USER) {
        alert('Войдите!');
        return;
    }
    const text = document.getElementById('postInput').value.trim();
    if (!text && !pendingImageFile) {
        alert('Введите текст или добавьте фото');
        return;
    }

    const hashtags = extractHashtags(text);
    const postData = {
        author: USER,
        authorUid: USER_UID,
        text: text || '📷',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        likes: 0,
        commentCount: 0,
        hashtags: hashtags,
        marquee: null,
        link: null,
        buttons: [],
        frameSize: 'small',
        edited: false
    };

    const linkMatch = (text || '').match(/(https?:\/\/[^\s]+)/);
    if (linkMatch) postData.link = linkMatch[1];

    if (pendingImageFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            postData.img = e.target.result;
            db.ref('sites/' + SITE + '/feed_posts').push(postData);
            clearPostForm();
        };
        reader.readAsDataURL(pendingImageFile);
    } else {
        db.ref('sites/' + SITE + '/feed_posts').push(postData);
        clearPostForm();
    }
};

function clearPostForm() {
    document.getElementById('postInput').value = '';
    pendingImage = null;
    pendingImageFile = null;
    document.getElementById('previewBox').classList.remove('visible');
    document.getElementById('fileInput').value = '';
}

document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
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
    const reader = new FileReader();
    reader.onload = function(ev) {
        pendingImage = ev.target.result;
        document.getElementById('previewImg').src = pendingImage;
        document.getElementById('previewName').textContent = file.name.slice(0, 16);
        document.getElementById('previewBox').classList.add('visible');
    };
    reader.readAsDataURL(file);
});

window.removeImage = function() {
    pendingImage = null;
    pendingImageFile = null;
    document.getElementById('previewBox').classList.remove('visible');
    document.getElementById('fileInput').value = '';
};
