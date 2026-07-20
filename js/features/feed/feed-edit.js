// ================================================================
// РЕДАКТИРОВАНИЕ И УДАЛЕНИЕ ПОСТОВ — ПОЛНАЯ ВЕРСИЯ С БЕГУЩЕЙ СТРОКОЙ
// ================================================================

(function() {
    'use strict';

    var pendingImageFile_Feed = null;
    var pendingImageData_Feed = null;
    var pendingProfileImageFile_Feed = null;
    var pendingFotoImageFile_Feed = null;

    function esc(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function extractHashtags(text) {
        if (!text) return [];
        var matches = text.match(/#[\wа-яё]+/gi) || [];
        return matches.slice(0, 8);
    }

    function getEditorText(id) {
        var editor = document.getElementById(id);
        if (!editor) return '';
        return editor.innerHTML;
    }

    function clearEditor(id) {
        var editor = document.getElementById(id);
        if (!editor) return;
        editor.innerHTML = '';
    }

    function getPostPath(type) {
        if (type === 'foto') return 'foto_posts';
        if (type === 'profile') {
            var uid = VIEWING_USER || USER_UID;
            return 'user_posts/' + uid;
        }
        return 'feed_posts';
    }

    // ================================================================
    // ОТПРАВКА ПОСТА В ЛЕНТУ
    // ================================================================

    window.submitPost = function() {
        if (!USER) {
            alert('Войдите!');
            var loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.add('open');
            return;
        }

        var text = getEditorText('postEditor').trim();
        if (!text && !pendingImageFile_Feed) {
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
                marquee: null,
                timestamp: Date.now(),
                likes: 0,
                commentCount: 0,
                reposts: 0,
                hashtags: hashtags,
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
                clearEditor('postEditor');
                window.clearPostForm();

                // ОБНОВЛЯЕМ ЛЕНТУ БЕЗ ПЕРЕЗАГРУЗКИ
                setTimeout(function() {
                    if (typeof loadFeed === 'function') loadFeed();
                }, 300);
            };

            if (pendingImageFile_Feed) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    savePost(e.target.result);
                };
                reader.readAsDataURL(pendingImageFile_Feed);
            } else {
                savePost(null);
            }
        });
    };

    window.clearPostForm = function() {
        clearEditor('postEditor');
        pendingImageFile_Feed = null;
        pendingImageData_Feed = null;
        var box = document.getElementById('previewBox');
        if (box) box.classList.remove('visible');
        var input = document.getElementById('fileInput');
        if (input) input.value = '';
    };

    window.removeImage = function() {
        pendingImageFile_Feed = null;
        pendingImageData_Feed = null;
        var box = document.getElementById('previewBox');
        if (box) box.classList.remove('visible');
        var input = document.getElementById('fileInput');
        if (input) input.value = '';
    };

    // ================================================================
    // ПРОФИЛЬНЫЙ ПОСТ
    // ================================================================

    window.submitProfilePost = function() {
        if (!USER) {
            alert('Войдите!');
            return;
        }

        var text = getEditorText('postEditorProfile').trim();
        if (!text && !pendingProfileImageFile_Feed) {
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
                marquee: null,
                timestamp: Date.now(),
                likes: 0,
                commentCount: 0,
                reposts: 0,
                hashtags: hashtags,
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
                clearEditor('postEditorProfile');
                window.clearProfilePostForm();

                setTimeout(function() {
                    if (typeof loadFeed === 'function') loadFeed();
                    if (typeof loadProfile === 'function') loadProfile();
                }, 300);
            };

            if (pendingProfileImageFile_Feed) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    savePost(e.target.result);
                };
                reader.readAsDataURL(pendingProfileImageFile_Feed);
            } else {
                savePost(null);
            }
        });
    };

    window.clearProfilePostForm = function() {
        clearEditor('postEditorProfile');
        pendingProfileImageFile_Feed = null;
        var box = document.getElementById('previewBoxProfile');
        if (box) box.classList.remove('visible');
        var input = document.getElementById('fileInputProfile');
        if (input) input.value = '';
    };

    window.removeProfileImage = function() {
        pendingProfileImageFile_Feed = null;
        var box = document.getElementById('previewBoxProfile');
        if (box) box.classList.remove('visible');
        var input = document.getElementById('fileInputProfile');
        if (input) input.value = '';
    };

    // ================================================================
    // ФОТО-ПОСТ
    // ================================================================

    window.submitFotoPost = function() {
        if (!USER || !USER_UID) {
            alert('Войдите, чтобы опубликовать пост!');
            var loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.add('open');
            return;
        }

        var text = getEditorText('postEditorFoto').trim();
        if (!text && !pendingFotoImageFile_Feed) {
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
                marquee: null,
                timestamp: Date.now(),
                likes: 0,
                commentCount: 0,
                reposts: 0,
                hashtags: hashtags,
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
                window.clearFotoPostForm();

                setTimeout(function() {
                    if (typeof loadFotoFeed === 'function') loadFotoFeed();
                }, 100);
            };

            if (pendingFotoImageFile_Feed) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    savePost(e.target.result);
                };
                reader.readAsDataURL(pendingFotoImageFile_Feed);
            } else {
                savePost(null);
            }
        });
    };

    window.clearFotoPostForm = function() {
        clearEditor('postEditorFoto');
        pendingFotoImageFile_Feed = null;
        var box = document.getElementById('previewBoxFoto');
        if (box) box.classList.remove('visible');
        var input = document.getElementById('fileInputFoto');
        if (input) input.value = '';
    };

    window.removeFotoImage = function() {
        pendingFotoImageFile_Feed = null;
        var box = document.getElementById('previewBoxFoto');
        if (box) box.classList.remove('visible');
        var input = document.getElementById('fileInputFoto');
        if (input) input.value = '';
    };

    // ================================================================
    // НАСТРОЙКА ЗАГРУЗКИ ФАЙЛОВ
    // ================================================================

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

    // ================================================================
    // ТОГГЛ МЕНЮ ПОСТА
    // ================================================================

    window.togglePostMenu = function(postId) {
        var menu = document.getElementById('menu_' + postId);
        if (!menu) return;

        document.querySelectorAll('.post-menu .dropdown.open').forEach(function(el) {
            if (el.id !== 'menu_' + postId) el.classList.remove('open');
        });

        menu.classList.toggle('open');
    };

    // ================================================================
    // ОТКРЫТИЕ РЕДАКТИРОВАНИЯ — С БЕГУЩЕЙ СТРОКОЙ
    // ================================================================

    window.openEdit = function(id, type) {
        console.log('🔵 openEdit вызвана:', id, type);

        var path = getPostPath(type);
        var menu = document.getElementById('menu_' + id);
        if (menu) menu.classList.remove('open');

        var modal = document.getElementById('editModal');
        if (modal) modal.classList.add('open');

        db.ref('sites/' + SITE + '/' + path + '/' + id).once('value', function(snap) {
            var p = snap.val();
            if (!p) {
                alert('❌ Пост не найден');
                return;
            }

            // ЗАПОЛНЯЕМ ВСЕ ПОЛЯ, ВКЛЮЧАЯ БЕГУЩУЮ СТРОКУ
            document.getElementById('editMarquee').value = p.marquee || '';
            document.getElementById('editText').value = p.text || '';
            document.getElementById('editLink').value = p.link || '';
            document.getElementById('editHashtags').value = (p.hashtags || []).join(' ');

            var frameSize = p.frameSize || 'small';
            window.currentFrameSize = frameSize;
            
            var smallBtn = document.getElementById('frameSizeSmall');
            var largeBtn = document.getElementById('frameSizeLarge');
            
            if (smallBtn) smallBtn.classList.remove('active');
            if (largeBtn) largeBtn.classList.remove('active');
            
            if (frameSize === 'large') {
                if (largeBtn) largeBtn.classList.add('active');
            } else {
                if (smallBtn) smallBtn.classList.add('active');
            }

            var container = document.getElementById('editButtonsContainer');
            container.innerHTML = '';
            var btns = p.buttons || [];
            if (btns.length === 0) {
                window.addEditBtn('', '');
            } else {
                btns.forEach(function(btn) {
                    window.addEditBtn(btn.label, btn.url);
                });
            }

            window.EDITING_ID = { id: id, type: type };
        });
    };

    // ================================================================
    // СОХРАНЕНИЕ РЕДАКТИРОВАНИЯ — С БЕГУЩЕЙ СТРОКОЙ И БЕЗ ПЕРЕЗАГРУЗКИ
    // ================================================================

    window.saveEdit = function() {
        if (!window.EDITING_ID) {
            alert('❌ Нет поста для редактирования');
            return;
        }

        var id = window.EDITING_ID.id;
        var type = window.EDITING_ID.type;
        var path = getPostPath(type);

        // ===== БЕРЁМ ЗНАЧЕНИЯ ИЗ ПОЛЕЙ =====
        var marquee = document.getElementById('editMarquee').value.trim();
        var text = document.getElementById('editText').value.trim();
        var link = document.getElementById('editLink').value.trim();
        var hashtagsRaw = document.getElementById('editHashtags').value.trim();
        var hashtags = hashtagsRaw ? hashtagsRaw.split(/\s+/).filter(function(t) { return t.startsWith('#'); }) : [];

        var frameSize = 'small';
        var largeBtn = document.getElementById('frameSizeLarge');
        if (largeBtn && largeBtn.classList.contains('active')) {
            frameSize = 'large';
        }

        var buttons = [];
        document.querySelectorAll('#editButtonsContainer .btn-group-edit').forEach(function(g) {
            var label = g.querySelector('.btn-label-input').value.trim();
            var url = g.querySelector('.btn-url-input').value.trim();
            if (url) buttons.push({ label: label || '🔗 Перейти', url: url });
        });

        // ===== ОБНОВЛЯЕМ ДАННЫЕ =====
        var updates = {
            marquee: marquee || null,  // <-- БЕГУЩАЯ СТРОКА
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
            if (!postData) {
                alert('❌ Пост не найден');
                return;
            }

            var authorUid = postData.authorUid;

            // ОБНОВЛЯЕМ В ОСНОВНОЙ ЛЕНТЕ
            db.ref('sites/' + SITE + '/' + path + '/' + id).update(updates);

            // ОБНОВЛЯЕМ В ПОСТАХ ПОЛЬЗОВАТЕЛЯ
            if (path !== 'foto_posts' && !path.startsWith('group_posts/')) {
                if (authorUid) {
                    db.ref('sites/' + SITE + '/user_posts/' + authorUid + '/' + id).update(updates);
                }
            }

            window.closeEdit();

            // ===== ОБНОВЛЯЕМ ЛЕНТУ БЕЗ ПЕРЕЗАГРУЗКИ СТРАНИЦЫ =====
            setTimeout(function() {
                if (typeof loadFeed === 'function') loadFeed();
                if (typeof loadProfile === 'function') loadProfile();
                // Если открыта страница поста — обновляем её
                if (window.CURRENT_POST_ID === id) {
                    if (typeof window.openPostPage === 'function') {
                        window.openPostPage(id, type);
                    }
                }
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

            var menu = document.getElementById('menu_' + id);
            if (menu) menu.classList.remove('open');

            setTimeout(function() {
                if (typeof loadFeed === 'function') loadFeed();
                if (typeof loadProfile === 'function') loadProfile();
            }, 300);
        });
    };

    window.deleteEditPost = function() {
        if (!window.EDITING_ID) return;
        if (!confirm('🗑 Удалить этот пост навсегда?')) return;

        var id = window.EDITING_ID.id;
        var type = window.EDITING_ID.type;
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

            window.closeEdit();

            setTimeout(function() {
                if (typeof loadFeed === 'function') loadFeed();
                if (typeof loadProfile === 'function') loadProfile();
            }, 300);
        });
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

    // ================================================================
    // РАЗМЕР ФРЕЙМА
    // ================================================================

    window.setFrameSize = function(size) {
        window.currentFrameSize = size;
        
        var smallBtn = document.getElementById('frameSizeSmall');
        var largeBtn = document.getElementById('frameSizeLarge');
        
        if (smallBtn) smallBtn.classList.remove('active');
        if (largeBtn) largeBtn.classList.remove('active');
        
        if (size === 'large') {
            if (largeBtn) largeBtn.classList.add('active');
        } else {
            if (smallBtn) smallBtn.classList.add('active');
        }
    };

    window.searchByTag = function(tag) {
        var input = document.getElementById('postEditor');
        if (input) {
            input.innerHTML = tag + ' ';
            input.focus();
        }
    };

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
    // ИНИЦИАЛИЗАЦИЯ
    // ================================================================

    document.addEventListener('DOMContentLoaded', function() {
        setupFileInput('fileInput', 'previewBox', 'previewImg', 'previewName', 'pendingImageFile_Feed');
        setupFileInput('fileInputProfile', 'previewBoxProfile', 'previewImgProfile', 'previewNameProfile', 'pendingProfileImageFile_Feed');
        setupFileInput('fileInputFoto', 'previewBoxFoto', 'previewImgFoto', 'previewNameFoto', 'pendingFotoImageFile_Feed');
        
        setTimeout(function() {
            var smallBtn = document.getElementById('frameSizeSmall');
            if (smallBtn) {
                smallBtn.classList.add('active');
                window.currentFrameSize = 'small';
            }
        }, 500);
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.post-menu')) {
            document.querySelectorAll('.post-menu .dropdown.open').forEach(function(el) {
                el.classList.remove('open');
            });
        }
    });

    console.log('✅ feed-edit.js загружен (бегущая строка работает)');

})();
