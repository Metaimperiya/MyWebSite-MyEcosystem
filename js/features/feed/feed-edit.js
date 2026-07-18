// ================================================================
// РЕДАКТИРОВАНИЕ И УДАЛЕНИЕ ПОСТОВ
// ================================================================

function extractHashtags(text) {
    if (!text) return [];
    var matches = text.match(/#[\wа-яё]+/gi) || [];
    return matches.slice(0, 8);
}

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

// ================================================================
// ОТПРАВКА ПОСТА
// ================================================================

window.submitPost = function() {
    if (!USER) { 
        alert('Войдите!'); 
        var loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.add('open');
        return; 
    }

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
            }, 500);
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

window.submitProfilePost = function() {
    if (!USER) { 
        alert('Войдите!'); 
        return; 
    }

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
            }, 500);
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

window.clearPostForm = function() {
    clearEditor();
    pendingImage = null;
    pendingImageFile = null;
    document.getElementById('previewBox').classList.remove('visible');
    document.getElementById('fileInput').value = '';
};

window.clearProfilePostForm = function() {
    clearProfileEditor();
    pendingProfileImageFile = null;
    document.getElementById('previewBoxProfile').classList.remove('visible');
    document.getElementById('fileInputProfile').value = '';
};

window.removeImage = function() {
    pendingImage = null;
    pendingImageFile = null;
    document.getElementById('previewBox').classList.remove('visible');
    document.getElementById('fileInput').value = '';
};

window.removeProfileImage = function() {
    pendingProfileImageFile = null;
    document.getElementById('previewBoxProfile').classList.remove('visible');
    document.getElementById('fileInputProfile').value = '';
};

function removeFotoImage() {
    pendingFotoImage = null;
    pendingFotoImageFile = null;
    var preview = document.getElementById('previewBoxFoto');
    if (preview) preview.classList.remove('visible');
    var input = document.getElementById('fileInputFoto');
    if (input) input.value = '';
}

function setupFileInput(inputId, previewBoxId, previewImgId, previewNameId, pendingVar) {
    var input = document.getElementById(inputId);
    if (!input) return;
    
    input.addEventListener('change', function(e) {
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

        window[pendingVar] = file;
        var reader = new FileReader();
        reader.onload = function(ev) {
            var img = document.getElementById(previewImgId);
            var name = document.getElementById(previewNameId);
            var box = document.getElementById(previewBoxId);
            if (img) img.src = ev.target.result;
            if (name) name.textContent = file.name.slice(0, 16);
            if (box) box.classList.add('visible');
        };
        reader.readAsDataURL(file);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    setupFileInput('fileInput', 'previewBox', 'previewImg', 'previewName', 'pendingImageFile');
    setupFileInput('fileInputProfile', 'previewBoxProfile', 'previewImgProfile', 'previewNameProfile', 'pendingProfileImageFile');
    setupFileInput('fileInputFoto', 'previewBoxFoto', 'previewImgFoto', 'previewNameFoto', 'pendingFotoImageFile');
});

// ================================================================
// ОТКРЫТИЕ РЕДАКТИРОВАНИЯ
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

// ================================================================
// СОХРАНЕНИЕ РЕДАКТИРОВАНИЯ
// ================================================================

window.saveEdit = function() {
    if (!EDITING_ID) {
        alert('❌ Нет поста для редактирования');
        return;
    }
    
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

    // Если ссылка есть — добавляем её в текст для отображения
    if (link) {
        if (!updates.text.includes(link)) {
            updates.text = updates.text + '\n' + link;
        }
    }

    var postRef = db.ref('sites/' + SITE + '/' + path + '/' + id);
    postRef.once('value', function(snap) {
        var postData = snap.val();
        if (!postData) {
            alert('❌ Пост не найден');
            return;
        }
        
        var authorUid = postData.authorUid;
        var actualPath = path;
        
        // Обновляем в feed_posts
        db.ref('sites/' + SITE + '/' + actualPath + '/' + id).update(updates);
        
        // Обновляем в user_posts
        if (actualPath !== 'foto_posts' && !actualPath.startsWith('group_posts/')) {
            if (authorUid) {
                db.ref('sites/' + SITE + '/user_posts/' + authorUid + '/' + id).update(updates);
            }
        }
        
        if (type === 'profile' && authorUid) {
            db.ref('sites/' + SITE + '/user_posts/' + authorUid + '/' + id).update(updates);
        }
        
        closeEdit();
        alert('✅ Пост обновлён!');
        
        setTimeout(function() {
            if (typeof loadFeed === 'function') loadFeed();
            if (typeof loadProfile === 'function') loadProfile();
            var fotoPage = document.getElementById('page-foto');
            if (fotoPage && fotoPage.style.display !== 'none') {
                if (typeof loadFotoFeed === 'function') loadFotoFeed();
            }
        }, 500);
    });
};

// ================================================================
// УДАЛЕНИЕ ПОСТА
// ================================================================

window.deletePost = function(id, type) {
    var path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + id + '/authorUid').once('value', function(snap) {
        var authorUid = snap.val();
        db.ref('sites/' + SITE + '/' + path + '/' + id).update({
            deleted: true,
            deletedAt: Date.now()
        });
        if (authorUid) {
            db.ref('sites/' + SITE + '/user_posts/' + authorUid + '/' + id).update({
                deleted: true,
                deletedAt: Date.now()
            });
        }
    });
    var menu = document.getElementById('menu_' + id);
    if (menu) menu.classList.remove('open');
    setTimeout(function() {
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadProfile === 'function') loadProfile();
    }, 300);
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
    if (postEl && postEl.parentNode) {
        postEl.parentNode.removeChild(postEl);
    }
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
};

window.deleteEditPost = function() {
    if (!EDITING_ID) return;
    var id = EDITING_ID.id;
    var type = EDITING_ID.type;
    var path = getPostPath(type);
    db.ref('sites/' + SITE + '/' + path + '/' + id + '/authorUid').once('value', function(snap) {
        var authorUid = snap.val();
        db.ref('sites/' + SITE + '/' + path + '/' + id).update({
            deleted: true,
            deletedAt: Date.now()
        });
        if (authorUid) {
            db.ref('sites/' + SITE + '/user_posts/' + authorUid + '/' + id).update({
                deleted: true,
                deletedAt: Date.now()
            });
        }
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

window.searchByTag = function(tag) {
    var input = document.getElementById('postEditor');
    if (input) {
        input.innerHTML = tag + ' ';
        input.focus();
    }
};

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
