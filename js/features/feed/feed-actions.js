// ================================================================
// ЛАЙКИ, КОММЕНТАРИИ, РЕПОСТЫ
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

window.toggleCommentMenu = function(commentId) {
    var menu = document.getElementById('commentMenu_' + commentId);
    if (!menu) return;
    document.querySelectorAll('.comment-actions .dropdown.open').forEach(function(el) {
        if (el.id !== 'commentMenu_' + commentId) el.classList.remove('open');
    });
    menu.classList.toggle('open');
};

window.deleteComment = function(postId, commentId, type) {
    if (!confirm('🗑 Удалить комментарий и все ответы на него?')) return;
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
};

function saveCommentEdit(postId, commentId, type, newText) {
    if (!newText) {
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
}
