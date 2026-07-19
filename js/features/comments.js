// ================================================================
// КОММЕНТАРИИ
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
        timestamp: Date.now(),
        likes: 0,
        parentId: parentId
    });

    input.value = '';
    document.getElementById('replyInput_' + parentId).style.display = 'none';

    if (state.open) {
        loadComments(postId, type);
    }
};

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
            if (state.open) {
                loadComments(postId, type);
            }
        });
    });
};

// УДАЛЕНИЕ КОММЕНТАРИЯ
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

// Закрытие меню комментариев при клике вне
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
