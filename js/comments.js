// ================================================================
// КОММЕНТАРИИ — НОВАЯ ЛОГИКА (КАК В FACEBOOK)
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

// ===== ПЕРЕКЛЮЧЕНИЕ КОММЕНТАРИЕВ =====
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

// ===== ЗАГРУЗКА КОММЕНТАРИЕВ =====
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

// ===== РЕНДЕР КОММЕНТАРИЕВ =====
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

// ===== ПОКАЗАТЬ ВСЕ КОММЕНТАРИИ =====
window.showAllComments = function(postId, type) {
    const state = getCommentState(postId);
    state.showAll = true;
    renderComments(postId, type);
};

// ===== ОТПРАВКА КОММЕНТАРИЯ =====
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

    const state = getCommentState(postId);
    if (!state.open) {
        state.open = true;
        const body = document.getElementById('commentsBody_' + postId);
        const toggle = document.getElementById('commentsToggle_' + postId);
        if (body) body.classList.add('open');
        if (toggle) toggle.classList.add('active');
    }
};

// ===== УДАЛЕНИЕ КОММЕНТАРИЯ =====
window.deleteComment = function(postId, commentId, type) {
    if (!confirm('🗑 Удалить комментарий?')) return;
    const path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments/' + commentId).remove();
    const menu = document.getElementById('commentMenu_' + commentId);
    if (menu) menu.classList.remove('open');
};

// ===== МЕНЮ КОММЕНТАРИЯ (ТРИ ТОЧКИ) =====
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

// ===== РЕДАКТИРОВАНИЕ КОММЕНТАРИЯ =====
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
