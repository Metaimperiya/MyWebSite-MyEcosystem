// ================================================================
// РЕДАКТИРОВАНИЕ И УДАЛЕНИЕ ПОСТОВ — ПОЛНАЯ ВЕРСИЯ С БЕГУЩЕЙ СТРОКОЙ
// ================================================================

(function() {
    'use strict';

    var pendingImageFile_Feed = null;
    var pendingImageData_Feed = null;
    var pendingProfileImageFile_Feed = null;
    var pendingFotoImageFile_Feed = null;
    var composeMedia = [];
    var editMedia = [];
    var editorSlideIndex = -1;
    var postEditorReady = false;
    var editorHtmlLoading = null;
    var editorEmbedStarted = false;

    function mediaUrl(item) { return item.type === 'frame' ? item.url : (item.url || item.preview); }

    function renderMediaList(containerId, items, editable) {
        var container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = items.map(function(item, index) {
            var url = mediaUrl(item) || '';
            var preview = item.type === 'frame'
                ? '<div class="media-frame-placeholder">🔗</div>'
                : '<img src="' + esc(item.preview || url) + '" alt="">';
            return '<div class="post-media-item">' + preview + '<span class="media-kind">' + (item.type === 'frame' ? 'Фрейм' : (index + 1) + '/' + items.length) + '</span>' +
                (editable ? (item.type === 'image' ? '<button type="button" class="media-edit" onclick="editPostMedia(' + index + ')">Править</button>' : '') + '<button type="button" onclick="removePostMedia(' + index + ')">×</button>' : '') + '</div>';
        }).join('');
    }

    function dataUrlToBlob(dataUrl) {
        var parts = dataUrl.split(',');
        var mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/png';
        var binary = atob(parts[1]);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: mime });
    }

    function toDataUrl(item) {
        if (item.source instanceof File) return new Promise(function(resolve, reject) {
            var reader = new FileReader(); reader.onload = function() { resolve(reader.result); }; reader.onerror = reject; reader.readAsDataURL(item.source);
        });
        if (item.source && item.source.startsWith('data:')) return Promise.resolve(item.source);
        return fetch(item.source || item.url).then(function(response) { if (!response.ok) throw new Error('Не удалось открыть изображение'); return response.blob(); }).then(function(blob) {
            return new Promise(function(resolve, reject) { var reader = new FileReader(); reader.onload = function() { resolve(reader.result); }; reader.onerror = reject; reader.readAsDataURL(blob); });
        });
    }

    function blobToDataUrl(blob) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader(); reader.onload = function() { resolve(reader.result); }; reader.onerror = reject; reader.readAsDataURL(blob);
        });
    }

    function withTimeout(promise, milliseconds, message) {
        return new Promise(function(resolve, reject) {
            var timer = setTimeout(function() { reject(new Error(message)); }, milliseconds);
            Promise.resolve(promise).then(function(value) { clearTimeout(timer); resolve(value); }, function(error) { clearTimeout(timer); reject(error); });
        });
    }

    function compressPostImage(blob) {
        return createImageBitmap(blob).then(function(bitmap) {
            var canvas = document.createElement('canvas');
            var scale = Math.min(1, 1440 / Math.max(bitmap.width, bitmap.height));
            var width = Math.max(1, Math.round(bitmap.width * scale));
            var height = Math.max(1, Math.round(bitmap.height * scale));
            var quality = 0.78;
            function encode() {
                canvas.width = width; canvas.height = height;
                var ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(bitmap, 0, 0, width, height);
                return new Promise(function(resolve, reject) {
                    canvas.toBlob(function(result) {
                        if (!result) { reject(new Error('Не удалось подготовить изображение')); return; }
                        if (result.size <= 450 * 1024 || width <= 360) { bitmap.close(); resolve(result); return; }
                        width = Math.max(360, Math.round(width * 0.78));
                        height = Math.max(1, Math.round(height * 0.78));
                        quality = Math.max(0.58, quality - 0.04);
                        encode().then(resolve, reject);
                    }, 'image/webp', quality);
                });
            }
            return encode();
        });
    }

    function uploadPostImage(item, index) {
        if (item.type === 'frame') return Promise.resolve({ type: 'frame', url: item.url, frameSize: item.frameSize || 'small' });
        if (item.source && /^https?:\/\//.test(item.source) && !item.edited) return Promise.resolve({ type: 'image', url: item.source });
        var sourcePromise = item.source instanceof File ? Promise.resolve(item.source) : Promise.resolve(dataUrlToBlob(item.source || item.url));
        return sourcePromise.then(function(source) {
            var payloadPromise = source.size < 5 * 1024 * 1024 ? Promise.resolve(source) : compressPostImage(source);
            return payloadPromise.then(function(blob) {
                var name = item.source instanceof File ? item.source.name.replace(/[^\w.-]/g, '_') : 'image.webp';
                var ref = storage.ref('posts/' + USER_UID + '/' + Date.now() + '_' + index + '_' + name);
                var upload = ref.put(blob, { contentType: blob.type || source.type || 'image/png' })
                    .then(function() { return ref.getDownloadURL(); });
                return withTimeout(upload, 12000, 'Хранилище не ответило за 12 секунд')
                    .then(function(url) { return { type: 'image', url: url }; })
                    .catch(function() {
                        return withTimeout(compressPostImage(blob), 20000, 'Не удалось сжать фото') .then(function(compact) {
                            return blobToDataUrl(compact).then(function(dataUrl) { return { type: 'image', url: dataUrl }; });
                        });
                    });
            });
        });
    }

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

    function setPostPublishStatus(message, type) {
        var status = document.getElementById('postPublishStatus');
        if (!status) return;
        status.textContent = message || '';
        status.className = 'post-publish-status' + (type ? ' ' + type : '');
    }

    function setPostPublishBusy(busy) {
        var button = document.querySelector('#page-feed .post-form .btn-submit');
        if (!button) return;
        if (!button.dataset.readyLabel) button.dataset.readyLabel = button.textContent;
        button.disabled = !!busy;
        button.textContent = busy ? '⏳ Публикую…' : button.dataset.readyLabel;
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
        if (!text && !composeMedia.length) {
            alert('Введите текст или добавьте фото');
            return;
        }

        setPostPublishStatus('Проверяю профиль…');
        setPostPublishBusy(true);

        var hashtags = extractHashtags(text);

        withTimeout(db.ref('sites/' + SITE + '/users/' + USER_UID + '/avatarUrl').once('value'), 10000, 'База данных не ответила при проверке профиля').then(function(avatarSnap) {
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
                media: [],
                repost: null,
                deleted: null,
                deletedAt: null
            };

            var mediaItems = composeMedia.slice();
            var linkMatch = (text || '').match(/(https?:\/\/[^\s]+)/);
            if (!mediaItems.some(function(item) { return item.type === 'frame'; }) && linkMatch) mediaItems.push({ type: 'frame', url: linkMatch[1], frameSize: 'small' });
            var mediaStep = Promise.resolve();
            var savedMedia = [];
            mediaItems.forEach(function(item, index) {
                mediaStep = mediaStep.then(function() {
                    if (item.type === 'image') setPostPublishStatus('Загружаю фото ' + (index + 1) + ' из ' + mediaItems.filter(function(media) { return media.type === 'image'; }).length + '…');
                    return uploadPostImage(item, index).then(function(result) { savedMedia.push(result); });
                });
            });
            mediaStep.then(function() {
                postData.media = savedMedia;
                postData.img = (savedMedia.find(function(item) { return item.type === 'image'; }) || {}).url || null;
                postData.link = (savedMedia.find(function(item) { return item.type === 'frame'; }) || {}).url || null;
                var postId = db.ref('sites/' + SITE + '/feed_posts').push().key;
                var updates = {};
                updates['sites/' + SITE + '/feed_posts/' + postId] = postData;
                updates['sites/' + SITE + '/user_posts/' + USER_UID + '/' + postId] = postData;
                setPostPublishStatus('Сохраняю пост в ленте…');
                withTimeout(db.ref().update(updates), 15000, 'База данных не ответила при сохранении поста').then(function() {
                    clearEditor('postEditor');
                    window.clearPostForm();
                    setPostPublishBusy(false);
                    setPostPublishStatus('Пост опубликован', 'success');
                    if (typeof loadFeed === 'function') loadFeed();
                }).catch(function(error) {
                    setPostPublishBusy(false);
                    setPostPublishStatus('Пост не отправлен: ' + (error.message || 'ошибка базы данных'), 'error');
                    console.error('Feed post write failed:', error);
                });
            }).catch(function(error) {
                setPostPublishBusy(false);
                setPostPublishStatus('Не удалось загрузить фото: ' + (error.message || error), 'error');
                console.error('Feed media upload failed:', error);
            });
        }).catch(function(error) {
            setPostPublishBusy(false);
            setPostPublishStatus('Не удалось подготовить пост: ' + (error.message || error), 'error');
            console.error('Feed post preparation failed:', error);
        });
    };

    window.clearPostForm = function() {
        clearEditor('postEditor');
        setPostPublishStatus('', '');
        pendingImageFile_Feed = null;
        pendingImageData_Feed = null;
        composeMedia.forEach(function(item) { if (item.preview && item.preview.startsWith('blob:')) URL.revokeObjectURL(item.preview); });
        composeMedia = [];
        renderMediaList('postMediaList', composeMedia, true);
        var frameInput = document.getElementById('postFrameUrl'); if (frameInput) frameInput.value = '';
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

    window.removePostMedia = function(index) {
        var target = document.getElementById('editModal').classList.contains('open') ? editMedia : composeMedia;
        var item = target[index];
        if (item && item.preview && item.preview.startsWith('blob:')) URL.revokeObjectURL(item.preview);
        target.splice(index, 1);
        renderMediaList(target === editMedia ? 'editMediaList' : 'postMediaList', target, true);
    };

    window.addPostFrame = function() {
        var input = document.getElementById('postFrameUrl');
        var url = input && input.value.trim();
        if (!url) return;
        try { var parsed = new URL(url); if (!/^https?:$/.test(parsed.protocol)) throw new Error(); }
        catch (_) { alert('Введите корректную ссылку, начинающуюся с https://'); return; }
        if (composeMedia.length >= 10) { alert('В карусели может быть не больше 10 слайдов'); return; }
        composeMedia.push({ type: 'frame', url: url, frameSize: 'small' });
        input.value = ''; renderMediaList('postMediaList', composeMedia, true);
    };

    window.addEditFrame = function() {
        var input = document.getElementById('editFrameUrl');
        var url = input && input.value.trim();
        if (!url) return;
        try { var parsed = new URL(url); if (!/^https?:$/.test(parsed.protocol)) throw new Error(); }
        catch (_) { alert('Введите корректную ссылку, начинающуюся с https://'); return; }
        if (editMedia.length >= 10) { alert('В карусели может быть не больше 10 слайдов'); return; }
        editMedia.push({ type: 'frame', url: url, frameSize: 'small' });
        input.value = ''; renderMediaList('editMediaList', editMedia, true);
    };

    window.editPostMedia = function(index) {
        var target = document.getElementById('editModal').classList.contains('open') ? editMedia : composeMedia;
        if (!target[index] || target[index].type !== 'image') return;
        editorSlideIndex = index;
        var modal = document.getElementById('postImageEditorModal');
        var frame = document.getElementById('postImageEditorFrame');
        var loading = document.getElementById('postImageEditorLoading');
        var loadingText = document.getElementById('postImageEditorLoadingText');
        var retryButton = document.getElementById('postImageEditorRetry');
        modal.classList.add('open');
        if (loading) loading.hidden = postEditorReady;
        if (loadingText) loadingText.textContent = 'Загружаю редактор…';
        if (retryButton) retryButton.hidden = true;
        if (postEditorReady) {
            loadEditorImage(target[index]);
        } else if (!editorEmbedStarted) {
            editorEmbedStarted = true;
            frame.src = 'post-image-editor.html';
            setTimeout(function() {
                if (postEditorReady || editorHtmlLoading) return;
                editorHtmlLoading = fetch('post-image-editor.html', { cache: 'no-cache' }).then(function(response) {
                    if (!response.ok) throw new Error('Файл редактора не найден на сайте');
                    return response.text();
                }).then(function(html) {
                    if (!postEditorReady) {
                        frame.srcdoc = html;
                        setTimeout(function() {
                            if (!postEditorReady && modal.classList.contains('open')) {
                                if (loadingText) loadingText.textContent = 'Редактор не ответил. Проверьте соединение.';
                                if (retryButton) retryButton.hidden = false;
                            }
                        }, 15000);
                    }
                    editorHtmlLoading = null;
                }).catch(function(error) {
                    editorHtmlLoading = null;
                    if (loadingText) loadingText.textContent = 'Не удалось загрузить редактор: ' + (error.message || error);
                    if (retryButton) retryButton.hidden = false;
                });
            }, 6000);
        }
    };

    function loadEditorImage(item) {
        toDataUrl(item).then(function(dataUrl) {
            var frame = document.getElementById('postImageEditorFrame');
            if (frame && frame.contentWindow) frame.contentWindow.postMessage({ type: 'post-editor:load-image', dataUrl: dataUrl }, '*');
        }).catch(function(error) { alert('Не получилось открыть фото в редакторе: ' + (error.message || error)); });
    }

    window.closePostImageEditor = function() {
        var modal = document.getElementById('postImageEditorModal'); if (modal) modal.classList.remove('open');
        editorSlideIndex = -1;
    };

    window.retryPostImageEditor = function() {
        var frame = document.getElementById('postImageEditorFrame');
        var target = document.getElementById('editModal').classList.contains('open') ? editMedia : composeMedia;
        var index = editorSlideIndex;
        postEditorReady = false;
        editorEmbedStarted = false;
        editorHtmlLoading = null;
        frame.removeAttribute('srcdoc');
        frame.src = 'about:blank';
        if (index >= 0 && target[index]) window.editPostMedia(index);
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

                var postId = db.ref('sites/' + SITE + '/feed_posts').push().key;
                var updates = {};
                updates['sites/' + SITE + '/feed_posts/' + postId] = postData;
                updates['sites/' + SITE + '/user_posts/' + USER_UID + '/' + postId] = postData;
                db.ref().update(updates);
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
            editMedia = Array.isArray(p.media) ? p.media.map(function(item) { return Object.assign({}, item, { source: item.url }); }) : [];
            if (!editMedia.length && p.img) editMedia.push({ type: 'image', url: p.img, source: p.img });
            if (p.link && !editMedia.some(function(item) { return item.type === 'frame' && item.url === p.link; })) editMedia.push({ type: 'frame', url: p.link, frameSize: p.frameSize || 'small' });
            renderMediaList('editMediaList', editMedia, true);
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
            link: null,
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
            Promise.all(editMedia.map(uploadPostImage)).then(function(savedMedia) {
                savedMedia.forEach(function(item) { if (item.type === 'frame') item.frameSize = frameSize; });
                updates.media = savedMedia;
                updates.img = (savedMedia.find(function(item) { return item.type === 'image'; }) || {}).url || null;
                updates.link = (savedMedia.find(function(item) { return item.type === 'frame'; }) || {}).url || null;
                db.ref('sites/' + SITE + '/' + path + '/' + id).update(updates);
                if (path !== 'foto_posts' && !path.startsWith('group_posts/') && authorUid) {
                    db.ref('sites/' + SITE + '/user_posts/' + authorUid + '/' + id).update(updates);
                }
                window.closeEdit();
                setTimeout(function() {
                    if (typeof loadFeed === 'function') loadFeed();
                    if (typeof loadProfile === 'function') loadProfile();
                    if (window.CURRENT_POST_ID === id && typeof window.openPostPage === 'function') window.openPostPage(id, type);
                }, 300);
            }).catch(function(error) { alert('Не удалось сохранить медиа: ' + (error.message || error)); });
        });
    };

    // ================================================================
    // ЗАКРЫТИЕ РЕДАКТИРОВАНИЯ
    // ================================================================

    window.closeEdit = function() {
        var modal = document.getElementById('editModal');
        if (modal) modal.classList.remove('open');
        editMedia.forEach(function(item) { if (item.preview && item.preview.startsWith('blob:')) URL.revokeObjectURL(item.preview); });
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
        var feedInput = document.getElementById('fileInput');
        if (feedInput) feedInput.addEventListener('change', function(event) {
            var files = Array.from(event.target.files || []);
            event.target.value = '';
            files.forEach(function(file) {
                if (!file.type.startsWith('image/')) { alert('Можно добавить только изображения'); return; }
                if (file.size >= 5 * 1024 * 1024) { alert('Максимальный размер одного фото — меньше 5 МБ'); return; }
                if (composeMedia.length >= 10) { alert('В карусели может быть не больше 10 слайдов'); return; }
                var preview = URL.createObjectURL(file);
                composeMedia.push({ type: 'image', source: file, preview: preview });
            });
            renderMediaList('postMediaList', composeMedia, true);
        });
        var editInput = document.getElementById('editMediaInput');
        if (editInput) editInput.addEventListener('change', function(event) {
            Array.from(event.target.files || []).forEach(function(file) {
                if (!file.type.startsWith('image/') || file.size >= 5 * 1024 * 1024) { alert('Добавьте изображение размером меньше 5 МБ'); return; }
                if (editMedia.length >= 10) { alert('В карусели может быть не больше 10 слайдов'); return; }
                editMedia.push({ type: 'image', source: file, preview: URL.createObjectURL(file) });
            });
            event.target.value = '';
            renderMediaList('editMediaList', editMedia, true);
        });
        var editorFrame = document.getElementById('postImageEditorFrame');
        window.addEventListener('message', function(event) {
            if (!editorFrame || event.source !== editorFrame.contentWindow || !event.data) return;
            if (event.data.type === 'post-editor:ready') {
                postEditorReady = true;
                var loading = document.getElementById('postImageEditorLoading'); if (loading) loading.hidden = true;
                var retryButton = document.getElementById('postImageEditorRetry'); if (retryButton) retryButton.hidden = true;
                var editing = document.getElementById('editModal').classList.contains('open') ? editMedia : composeMedia;
                if (editorSlideIndex >= 0 && editing[editorSlideIndex]) loadEditorImage(editing[editorSlideIndex]);
            }
            if (event.data.type === 'post-editor:result' && typeof event.data.dataUrl === 'string' && editorSlideIndex >= 0) {
                var target = document.getElementById('editModal').classList.contains('open') ? editMedia : composeMedia;
                if (target[editorSlideIndex]) {
                    target[editorSlideIndex].source = event.data.dataUrl;
                    target[editorSlideIndex].preview = event.data.dataUrl;
                    target[editorSlideIndex].edited = true;
                    renderMediaList(target === editMedia ? 'editMediaList' : 'postMediaList', target, true);
                    window.closePostImageEditor();
                }
            }
        });
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
