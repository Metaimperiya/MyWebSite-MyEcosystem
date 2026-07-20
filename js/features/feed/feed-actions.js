// ================================================================
// ЛАЙКИ, КОММЕНТАРИИ, РЕПОСТЫ — ПОЛНАЯ ВЕРСИЯ
// ================================================================

function getPostPath(type) {
    if (type === 'foto') return 'foto_posts';
    if (type === 'profile') {
        var uid = VIEWING_USER || USER_UID;
        return 'user_posts/' + uid;
    }
    return 'feed_posts';
}

function esc(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

var commentStates = {};

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

// ================================================================
// МЕНЮ ПОСТА
// ================================================================

window.togglePostMenu = function(postId) {
    var menu = document.getElementById('menu_' + postId);
    if (!menu) return;
    document.querySelectorAll('.post-menu .dropdown.open').forEach(function(el) {
        if (el.id !== 'menu_' + postId) el.classList.remove('open');
    });
    menu.classList.toggle('open');
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('.post-menu')) {
        document.querySelectorAll('.post-menu .dropdown.open').forEach(function(el) {
            el.classList.remove('open');
        });
    }
});

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
    if (btn) { btn.style.pointerEvents = 'none'; btn.style.opacity = '0.6'; }
    postRef.child('likes').transaction(function(currentLikes) {
        var current = currentLikes || 0;
        return liked ? Math.max(0, current - 1) : current + 1;
    }, function(error, committed, snapshot) {
        if (btn) { btn.style.pointerEvents = 'auto'; btn.style.opacity = '1'; }
        if (error) { console.error('❌ Ошибка лайка:', error); return; }
        if (committed) {
            var newValue = snapshot.val() || 0;
            if (countEl) countEl.textContent = newValue;
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
// КОММЕНТАРИИ — ПОЛНАЯ ПЕРЕПИСАННАЯ ВЕРСИЯ
// ================================================================

window.toggleComments = function(postId, type) {
    console.log('🔵 toggleComments вызвана:', postId, type);
    
    var wrapper = document.getElementById('commentsWrapper_' + postId);
    if (!wrapper) {
        console.error('❌ commentsWrapper_' + postId + ' не найден');
        return;
    }
    
    var state = getCommentState(postId);
    state.open = !state.open;
    
    if (state.open) {
        wrapper.style.display = 'block';
        wrapper.style.maxHeight = '600px';
        wrapper.style.opacity = '1';
        wrapper.style.overflow = 'visible';
        wrapper.classList.add('open');
        wrapper.classList.add('active');
        console.log('✅ Комментарии открыты');
        loadComments(postId, type);
    } else {
        wrapper.style.display = 'none';
        wrapper.style.maxHeight = '0';
        wrapper.style.opacity = '0';
        wrapper.classList.remove('open');
        wrapper.classList.remove('active');
        console.log('✅ Комментарии закрыты');
    }
};

function loadComments(postId, type) {
    var path = getPostPath(type);
    var state = getCommentState(postId);
    if (!state.open) return;
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
        container.innerHTML = '<div class="no-comments">💬 Нет комментариев</div>';
        return;
    }
    var commentsMap = {};
    state.allComments.forEach(function(c) { commentsMap[c.id] = c; });
    var roots = state.allComments.filter(function(c) { return !c.parentId; });
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

function renderCommentTree(comment, commentsMap, postId, type, level, allComments) {
    if (!allComments) {
        var state = getCommentState(postId);
        allComments = state.allComments || [];
    }
    
    var canEdit = (comment.authorUid === USER_UID || isAdmin);
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
    
    var children = allComments.filter(function(c) { return c.parentId === comment.id; });
    if (children.length > 0) {
        children.sort(function(a, b) { return (a.timestamp || 0) - (b.timestamp || 0); });
        children.forEach(function(child) {
            html += renderCommentTree(child, commentsMap, postId, type, level + 1, allComments);
        });
    }
    return html;
}

// ================================================================
// ОТПРАВКА КОММЕНТАРИЯ
// ================================================================

window.submitComment = function(postId, type) {
    console.log('🔵 submitComment вызвана:', postId, type);
    if (!USER) { alert('Войдите!'); return; }
    var input = document.getElementById('commentInput_' + postId);
    if (!input) { console.error('❌ commentInput_' + postId + ' не найден'); return; }
    var text = input.value.trim();
    if (!text) { alert('Напишите комментарий!'); return; }
    var path = getPostPath(type);
    var state = getCommentState(postId);
    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/authorUid').once('value', function(authorSnap) {
        var authorUid = authorSnap.val();
        var newCommentRef = db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments').push();
        newCommentRef.set({
            author: USER,
            authorUid: USER_UID,
            text: text,
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            likes: 0,
            parentId: null
        }).then(function() {
            console.log('✅ Комментарий отправлен!');
            input.value = '';
            db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments').once('value', function(snap) {
                var data = snap.val() || {};
                var count = Object.keys(data).length;
                db.ref('sites/' + SITE + '/' + path + '/' + postId + '/commentCount').set(count);
                var countEl = document.getElementById('commentCount_' + postId);
                if (countEl) countEl.textContent = count;
            });
            if (authorUid && authorUid !== USER_UID) {
                sendNotification(authorUid, {
                    type: 'comment',
                    fromUid: USER_UID,
                    from: USER,
                    text: USER + ' прокомментировал(а) ваш пост: "' + (text.slice(0, 50)) + (text.length > 50 ? '...' : ''),
                    postId: postId,
                    postType: type,
                    timestamp: Date.now()
                });
            }
            if (state.open) { loadComments(postId, type); }
        }).catch(function(err) {
            console.error('❌ Ошибка отправки комментария:', err);
            alert('Ошибка: ' + err.message);
        });
    });
};

// ================================================================
// ОТВЕТ НА КОММЕНТАРИЙ
// ================================================================

window.openReply = function(postId, parentId, type) {
    document.querySelectorAll('.comment-reply-input-wrap').forEach(function(el) { el.style.display = 'none'; });
    var wrap = document.getElementById('replyInput_' + parentId);
    if (wrap) {
        wrap.style.display = 'flex';
        var input = document.getElementById('replyInputField_' + parentId);
        if (input) input.focus();
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
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        likes: 0,
        parentId: parentId
    }).then(function() {
        input.value = '';
        document.getElementById('replyInput_' + parentId).style.display = 'none';
        if (state.open) { loadComments(postId, type); }
    });
};

// ================================================================
// ЛАЙК КОММЕНТАРИЯ
// ================================================================

window.toggleLikeComment = function(postId, commentId, type) {
    if (!USER) { alert('Войдите!'); return; }
    var path = getPostPath(type);
    var ref = db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments/' + commentId + '/likes');
    var countEl = document.getElementById('commentLikeCount_' + commentId);
    ref.transaction(function(likes) { return (likes || 0) + 1; });
    if (countEl) {
        var current = parseInt(countEl.textContent) || 0;
        countEl.textContent = current + 1;
    }
};

// ================================================================
// РЕДАКТИРОВАНИЕ КОММЕНТАРИЯ
// ================================================================

window.toggleCommentMenu = function(commentId) {
    var menu = document.getElementById('commentMenu_' + commentId);
    if (!menu) return;
    document.querySelectorAll('.comment-actions .dropdown.open').forEach(function(el) {
        if (el.id !== 'commentMenu_' + commentId) el.classList.remove('open');
    });
    menu.classList.toggle('open');
};

window.editComment = function(postId, commentId, type) {
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
        if (e.key === 'Enter') { saveCommentEdit(postId, commentId, type, input.value.trim()); }
    });
    input.addEventListener('blur', function() {
        setTimeout(function() {
            if (document.activeElement !== input) { saveCommentEdit(postId, commentId, type, input.value.trim()); }
        }, 200);
    });
};

function saveCommentEdit(postId, commentId, type, newText) {
    if (!newText) {
        var path = getPostPath(type);
        var state = getCommentState(postId);
        db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments/' + commentId).remove();
        if (state.open) { loadComments(postId, type); }
        return;
    }
    var path = getPostPath(type);
    var state = getCommentState(postId);
    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments/' + commentId).update({
        text: newText,
        edited: true
    }).then(function() {
        if (state.open) { loadComments(postId, type); }
    });
}

// ================================================================
// УДАЛЕНИЕ КОММЕНТАРИЯ
// ================================================================

window.deleteComment = function(postId, commentId, type) {
    if (!confirm('🗑 Удалить комментарий?')) return;
    var path = getPostPath(type);
    var state = getCommentState(postId);
    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments/' + commentId).remove();
    db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments').once('value', function(snap) {
        var data = snap.val() || {};
        var count = Object.keys(data).length;
        db.ref('sites/' + SITE + '/' + path + '/' + postId + '/commentCount').set(count);
        var countEl = document.getElementById('commentCount_' + postId);
        if (countEl) countEl.textContent = count;
    });
    if (state.open) { loadComments(postId, type); }
};

// ================================================================
// РЕПОСТЫ
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
                repost: {
                    author: original.author,
                    authorUid: original.authorUid,
                    text: original.text || '',
                    timestamp: original.timestamp || Date.now(),
                    img: original.img || null,
                    link: original.link || null,
                    buttons: original.buttons || [],
                    marquee: original.marquee || null,
                    hashtags: original.hashtags || [],
                    frameSize: original.frameSize || 'small',
                    repost: original.repost || null
                },
                deleted: null,
                deletedAt: null
            };
            db.ref('sites/' + SITE + '/feed_posts').push(repostData);
            db.ref('sites/' + SITE + '/user_posts/' + USER_UID).push(repostData);
            db.ref('sites/' + SITE + '/' + path + '/' + postId + '/reposts').transaction(function(current) { return (current || 0) + 1; });
            closeRepost();
            setTimeout(function() {
                if (typeof loadFeed === 'function') loadFeed();
                if (typeof loadProfile === 'function') loadProfile();
            }, 300);
        });
    });
};

// ================================================================
// УДАЛЕНИЕ ПОСТА
// ================================================================

window.deletePost = function(id, type) {
    var path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + id + '/authorUid').once('value', function(snap) {
        var authorUid = snap.val();
        db.ref('sites/' + SITE + '/' + path + '/' + id).update({ deleted: true, deletedAt: Date.now() });
        if (authorUid) {
            db.ref('sites/' + SITE + '/user_posts/' + authorUid + '/' + id).update({ deleted: true, deletedAt: Date.now() });
        }
        var menu = document.getElementById('menu_' + id);
        if (menu) menu.classList.remove('open');
        setTimeout(function() {
            if (typeof loadFeed === 'function') loadFeed();
            if (typeof loadProfile === 'function') loadProfile();
        }, 300);
    });
};

// ================================================================
// ВОССТАНОВЛЕНИЕ ПОСТА
// ================================================================

window.restorePost = function(id, type) {
    var path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + id).update({ deleted: null, deletedAt: null });
    db.ref('sites/' + SITE + '/' + path + '/' + id + '/authorUid').once('value', function(snap) {
        var authorUid = snap.val();
        if (authorUid) {
            db.ref('sites/' + SITE + '/user_posts/' + authorUid + '/' + id).update({ deleted: null, deletedAt: null });
        }
    });
};

window.permanentDeletePost = function(id, type) {
    var path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + id + '/authorUid').once('value', function(snap) {
        var authorUid = snap.val();
        db.ref('sites/' + SITE + '/' + path + '/' + id).remove();
        if (authorUid) {
            db.ref('sites/' + SITE + '/user_posts/' + authorUid + '/' + id).remove();
        }
    });
    var postEl = document.querySelector('.post[data-id="' + id + '"]');
    if (postEl && postEl.parentNode) { postEl.parentNode.removeChild(postEl); }
};

// ================================================================
// ОТКРЫТИЕ РЕДАКТИРОВАНИЯ
// ================================================================

window.openEdit = function(id, type) {
    console.log('✏️ openEdit вызвана:', id, type);
    var path = getPostPath(type);
    var menu = document.getElementById('menu_' + id);
    if (menu) menu.classList.remove('open');
    var modal = document.getElementById('editModal');
    if (modal) modal.classList.add('open');
    db.ref('sites/' + SITE + '/' + path + '/' + id).once('value', function(snap) {
        var p = snap.val();
        if (!p) { alert('❌ Пост не найден'); return; }
        document.getElementById('editMarquee').value = p.marquee || '';
        document.getElementById('editText').value = p.text || '';
        document.getElementById('editLink').value = p.link || '';
        document.getElementById('editHashtags').value = (p.hashtags || []).join(' ');
        var frameSize = p.frameSize || 'small';
        document.querySelectorAll('.frame-size-btn').forEach(function(btn) { btn.classList.remove('active'); });
        if (frameSize === 'large') {
            var btn = document.getElementById('frameSizeLarge');
            if (btn) btn.classList.add('active');
        } else {
            var btn = document.getElementById('frameSizeSmall');
            if (btn) btn.classList.add('active');
        }
        window.currentFrameSize = frameSize;
        var container = document.getElementById('editButtonsContainer');
        container.innerHTML = '';
        var btns = p.buttons || [];
        if (btns.length === 0) { window.addEditBtn('', ''); } else {
            btns.forEach(function(btn) { window.addEditBtn(btn.label, btn.url); });
        }
        window.EDITING_ID = { id: id, type: type };
    });
};

// ================================================================
// СОХРАНЕНИЕ РЕДАКТИРОВАНИЯ
// ================================================================

window.saveEdit = function() {
    if (!window.EDITING_ID) { alert('❌ Нет поста для редактирования'); return; }
    var id = window.EDITING_ID.id;
    var type = window.EDITING_ID.type;
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
    db.ref('sites/' + SITE + '/' + path + '/' + id).once('value', function(snap) {
        var postData = snap.val();
        if (!postData) { alert('❌ Пост не найден'); return; }
        var authorUid = postData.authorUid;
        db.ref('sites/' + SITE + '/' + path + '/' + id).update(updates);
        if (path !== 'foto_posts' && !path.startsWith('group_posts/')) {
            if (authorUid) { db.ref('sites/' + SITE + '/user_posts/' + authorUid + '/' + id).update(updates); }
        }
        window.closeEdit();
        alert('✅ Пост обновлён!');
        setTimeout(function() {
            if (typeof loadFeed === 'function') loadFeed();
            if (typeof loadProfile === 'function') loadProfile();
        }, 300);
    });
};

// ================================================================
// ЗАКРЫТИЕ РЕДАКТИРОВАНИЯ
// ================================================================

window.closeEdit = function() {
    var modal = document.getElementById('editModal');
    if (modal) modal.classList.remove('open');
    window.EDITING_ID = null;
};

// ================================================================
// КНОПКИ В РЕДАКТОРЕ
// ================================================================

window.addEditBtn = function(label, url) {
    label = label || '';
    url = url || '';
    var container = document.getElementById('editButtonsContainer');
    var div = document.createElement('div');
    div.className = 'btn-group-edit';
    div.innerHTML = '<input class="btn-label-input" placeholder="Текст кнопки" value="' + esc(label) + '"><input class="btn-url-input" placeholder="Ссылка" value="' + esc(url) + '"><button class="btn-remove" onclick="window.removeEditBtn(this)">✕</button>';
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

// ================================================================
// ОТКРЫТИЕ СТРАНИЦЫ ПОСТА
// ================================================================

window.openPostPage = function(postId, type) {
    window.CURRENT_POST_ID = postId;
    window.CURRENT_POST_TYPE = type;
    var container = document.getElementById('postPageContainer');
    if (!container) return;
    document.getElementById('postPage').classList.add('active');
    window.setActivePage(null);
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">⏳ Загрузка поста...</div>';
    var path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + postId).once('value', function(snap) {
        var post = snap.val();
        if (!post) { container.innerHTML = '<div style="text-align:center;padding:20px;color:#e74c3c;">❌ Пост не найден</div>'; return; }
        post.id = postId;
        var postEl = renderPost(post, type);
        container.innerHTML = '';
        container.appendChild(postEl);
        setTimeout(function() {
            var wrapper = document.getElementById('commentsWrapper_' + postId);
            if (wrapper) {
                wrapper.style.display = 'block';
                wrapper.style.maxHeight = '600px';
                wrapper.style.opacity = '1';
                wrapper.classList.add('open');
                var state = getCommentState(postId);
                state.open = true;
                loadComments(postId, type);
            }
        }, 500);
    });
};

window.closePostPage = function() {
    document.getElementById('postPage').classList.remove('active');
    window.setActivePage('feed');
    window.CURRENT_POST_ID = null;
    window.CURRENT_POST_TYPE = null;
    if (typeof loadFeed === 'function') loadFeed();
};

// ================================================================
// ENTER ДЛЯ КОММЕНТАРИЕВ
// ================================================================

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        var input = e.target;
        if (input && input.id && input.id.startsWith('commentInput_')) {
            var postId = input.id.replace('commentInput_', '');
            var type = 'feed';
            if (typeof window.submitComment === 'function') { window.submitComment(postId, type); }
        }
    }
});

console.log('✅ feed-actions.js загружен (полная версия)');
