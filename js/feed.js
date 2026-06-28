// ================================================================
// ЛЕНТА, ПОСТЫ, КОММЕНТАРИИ, ЛАЙКИ, РЕДАКТИРОВАНИЕ
// АДМИНКА ОСТАЕТСЯ! РЕДАКТИРОВАТЬ МОЖЕТ ТОЛЬКО АДМИН ИЛИ АВТОР
// ================================================================

// ===== ЗАГРУЗКА ЛЕНТЫ =====
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

// ===== ПУТЬ К ПОСТАМ =====
function getPostPath(type) {
    return type === 'group' ? 'group_posts/' + currentGroup : 'feed_posts';
}

let currentGroup = null;

// ===== РЕНДЕР ПОСТА =====
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
        previewHtml = `<div class="link-preview"><iframe src="${p.link}" sandbox="allow-scripts allow-same-origin allow-popups"></iframe></div>`;
    }

    let hashtagsHtml = '';
    if (p.hashtags && p.hashtags.length > 0) {
        hashtagsHtml = '<div class="hashtags">';
        p.hashtags.forEach(tag => {
            hashtagsHtml += `<span class="tag" onclick="searchByTag('${esc(tag)}')">${esc(tag)}</span>`;
        });
        hashtagsHtml += '</div>';
    }

    // ===== ТРИ ТОЧКИ ВЕРТИКАЛЬНЫЕ (ТОЛЬКО ДЛЯ АДМИНА ИЛИ АВТОРА) =====
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

    // ===== КНОПКИ ЛАЙКОВ И КОММЕНТАРИЕВ =====
    let actionsHtml = `
        <div class="stats">
            <button class="${isLiked ? 'liked' : ''}" onclick="toggleLike('${p.id}', '${type}')">
                👍 <span id="likeCount_${p.id}">${p.likes || 0}</span>
            </button>
            <button onclick="toggleComments('${p.id}', '${type}')" id="commentToggle_${p.id}">
                💬 <span id="commentCount_${p.id}">${p.commentCount || 0}</span>
            </button>
        </div>
    `;

    // ===== КОММЕНТАРИИ (СПИСОК СКРЫТ, ПОЛЕ ВВОДА ВСЕГДА ВИДНО) =====
    let commentsHtml = `
        <div class="comments" id="comments_${p.id}">
            <div class="list" id="commentsList_${p.id}">
                <div id="commentsContainer_${p.id}"></div>
            </div>
            <div class="input-wrap">
                <input type="text" id="commentInput_${p.id}" placeholder="Написать комментарий...">
                <button onclick="submitComment('${p.id}', '${type}')">→</button>
            </div>
        </div>
    `;

    // ===== СБОРКА ПОСТА =====
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
        ${actionsHtml}
        ${commentsHtml}
    `;

    // ===== АВАТАРКА АВТОРА =====
    if (p.authorUid) {
        const avatarEl = document.getElementById('post-avatar-' + p.id);
        if (avatarEl) renderAvatar(p.authorUid, avatarEl, letter);
    }

    // ===== ЗАГРУЗКА КОММЕНТАРИЕВ =====
    loadComments(p.id, type);
    return div;
}

// ================================================================
// КОММЕНТАРИИ
// ================================================================

function loadComments(postId, type) {
    const path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments').orderByChild('timestamp').on('value', snap => {
        const container = document.getElementById('commentsContainer_' + postId);
        if (!container) return;
        container.innerHTML = '';
        const data = snap.val() || {};
        const keys = Object.keys(data).sort((a, b) => (data[a].timestamp || 0) - (data[b].timestamp || 0));

        const count = keys.length;
        const countEl = document.getElementById('commentCount_' + postId);
        if (countEl) countEl.textContent = count;
        db.ref('sites/' + SITE + '/' + path + '/' + postId + '/commentCount').set(count);

        if (!keys.length) {
            container.innerHTML = '<div style="color:#bbb;font-size:0.55rem;padding:3px 0;">Нет комментариев</div>';
            return;
        }

        keys.forEach(k => {
            const c = data[k];
            const div = document.createElement('div');
            div.className = 'comment';
            const letter = (c.author || '?').charAt(0).toUpperCase();
            const canDelete = (c.author === USER || IS_ADMIN);
            div.innerHTML = `
                <span class="avatar-wrap" id="comment-avatar-${k}"><span class="letter">${letter}</span></span>
                <div class="body">
                    <span class="name">${esc(c.author || 'Аноним')}</span>
                    <span class="time">${c.time || ''}</span>
                    <div class="text">${esc(c.text || '')}</div>
                </div>
                ${canDelete ? `<button onclick="deleteComment('${postId}','${k}','${type}')" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:0.45rem;">✕</button>` : ''}
            `;
            container.appendChild(div);
            if (c.authorUid) {
                const avatarEl = document.getElementById('comment-avatar-' + k);
                if (avatarEl) renderAvatar(c.authorUid, avatarEl, letter);
            }
        });
    });
}

// ===== ОТКРЫТЬ/ЗАКРЫТЬ КОММЕНТАРИИ =====
window.toggleComments = function(postId, type) {
    const list = document.getElementById('commentsList_' + postId);
    if (list) {
        list.classList.toggle('open');
    }
};

// ===== ОТПРАВИТЬ КОММЕНТАРИЙ =====
window.submitComment = function(postId, type) {
    if (!USER) { alert('Войдите!'); return; }
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
    
    const list = document.getElementById('commentsList_' + postId);
    if (list) {
        list.classList.add('open');
    }
};

// ===== УДАЛИТЬ КОММЕНТАРИЙ =====
window.deleteComment = function(postId, commentId, type) {
    if (!confirm('Удалить комментарий?')) return;
    const path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments/' + commentId).remove();
};

// ================================================================
// ЛАЙКИ
// ================================================================

window.toggleLike = function(postId, type) {
    if (!USER) { alert('Войдите!'); return; }
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
// УДАЛИТЬ ПОСТ (ТОЛЬКО АДМИН ИЛИ АВТОР)
// ================================================================

window.deletePost = function(id, type) {
    if (!confirm('🗑 Удалить пост?')) return;
    const path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + id).remove();
    const menu = document.getElementById('menu_' + id);
    if (menu) menu.classList.remove('open');
};

// ================================================================
// РЕДАКТИРОВАНИЕ ПОСТА (ТОЛЬКО АДМИН ИЛИ АВТОР)
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
// МЕНЮ ПОСТА (ТРИ ТОЧКИ ВЕРТИКАЛЬНЫЕ)
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
    if (!USER) { alert('Войдите!'); return; }
    const text = document.getElementById('postInput').value.trim();
    if (!text && !pendingImageFile) { alert('Введите текст или добавьте фото'); return; }

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
    if (!file.type.startsWith('image/')) { alert('Только изображения!'); this.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { alert('Максимум 5 МБ'); this.value = ''; return; }

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

// ================================================================
// РЕДАКТИРОВАНИЕ КОММЕНТАРИЕВ
// ================================================================

function editComment(postId, commentId, type) {
    const path = getPostPath(type);
    const textEl = document.getElementById('comment-text-' + commentId);
    if (!textEl) return;
    
    const menu = document.getElementById('commentMenu_' + commentId);
    if (menu) menu.classList.remove('open');
    
    const currentText = textEl.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'edit-comment-input';
    input.style.cssText = 'width:100%;padding:2px 8px;border:1px solid #1877f2;border-radius:4px;font-size:0.7rem;outline:none;';
    
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
