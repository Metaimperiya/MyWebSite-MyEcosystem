// ================================================================
// СТРАНИЦЫ — ПОЛНОЦЕННЫЕ СТРАНИЦЫ ПОЛЬЗОВАТЕЛЕЙ
// ================================================================

var pageListener = null;
var CURRENT_PAGE_UID = null;
var pageSubscribers = {};

// ===== ЗАГРУЗКА СТРАНИЦЫ =====
function loadPage(slug) {
    var container = document.getElementById('pageContainer');
    if (!container) {
        console.warn('⚠️ pageContainer не найден');
        return;
    }

    if (!USER_UID) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Войдите, чтобы просматривать страницы</div>';
        return;
    }

    showLoading(container);

    // Ищем страницу по слагу во всех типах
    var types = ['profiles', 'pages', 'groups'];
    var found = false;

    types.forEach(function(type) {
        if (found) return;
        db.ref('sites/' + SITE + '/pages/' + type).orderByChild('slug').equalTo(slug).once('value', function(snap) {
            var data = snap.val();
            if (data) {
                found = true;
                var pageUid = Object.keys(data)[0];
                var pageData = data[pageUid];
                pageData.type = type;
                pageData.uid = pageUid;
                CURRENT_PAGE_UID = pageUid;
                renderPage(container, pageData);
            }
        });
    });

    // Если страница не найдена через 2 секунды
    setTimeout(function() {
        if (!found && container.innerHTML.includes('Загрузка')) {
            container.innerHTML = '<div style="text-align:center;padding:20px;color:#e74c3c;">❌ Страница не найдена</div>';
        }
    }, 2000);
}

// ===== РЕНДЕР СТРАНИЦЫ =====
function renderPage(container, pageData) {
    var isOwner = (pageData.ownerUid === USER_UID);
    var isSubscribed = pageSubscribers[pageData.uid] === true;

    var avatarHtml = pageData.avatarUrl 
        ? '<img src="' + pageData.avatarUrl + '" />' 
        : '<span class="letter">' + (pageData.name || '?').charAt(0).toUpperCase() + '</span>';

    var roleLabel = '';
    if (pageData.role === 'admin') roleLabel = '👑 Администратор';
    else if (pageData.role === 'moderator') roleLabel = '🛡️ Модератор';
    else if (pageData.role === 'premium') roleLabel = '💎 Премиум';
    else if (pageData.role === 'freelancer') roleLabel = '💼 Фрилансер';
    else roleLabel = '👤 Пользователь';

    var html = `
        <div class="page-header" style="background:var(--card-bg);border-radius:12px;padding:16px;margin-bottom:8px;border:1px solid var(--border-color);">
            ${pageData.coverUrl ? '<div style="width:100%;height:120px;border-radius:8px;overflow:hidden;margin-bottom:10px;background:var(--input-bg);"><img src="' + pageData.coverUrl + '" style="width:100%;height:100%;object-fit:cover;" /></div>' : ''}
            <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:56px;height:56px;border-radius:50%;overflow:hidden;background:var(--avatar-bg);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    ${avatarHtml}
                </div>
                <div style="flex:1;">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <span style="font-size:1.1rem;font-weight:700;color:var(--text-color);">${esc(pageData.name || 'Без названия')}</span>
                        <span style="font-size:0.55rem;background:var(--input-bg);padding:2px 10px;border-radius:12px;color:var(--text-secondary);">${roleLabel}</span>
                    </div>
                    <div style="font-size:0.65rem;color:var(--muted-text);">${esc(pageData.description || 'Нет описания')}</div>
                </div>
            </div>
            <div style="display:flex;gap:12px;margin-top:8px;font-size:0.6rem;color:var(--muted-text);">
                <span>📝 <span id="pagePostCount">0</span> постов</span>
                <span>👥 <span id="pageSubscriberCount">0</span> подписчиков</span>
                <span>👁️ <span id="pageViewCount">0</span> просмотров</span>
            </div>
            <div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap;">
                ${!isOwner ? `
                    <button onclick="togglePageSubscribe('${pageData.uid}')" style="padding:4px 16px;border:none;border-radius:16px;font-weight:600;cursor:pointer;font-size:0.6rem;background:${isSubscribed ? 'var(--input-bg)' : 'var(--link-color)'};color:${isSubscribed ? 'var(--text-secondary)' : '#fff'};">
                        ${isSubscribed ? '✅ Подписан' : '➕ Подписаться'}
                    </button>
                ` : `
                    <button onclick="openEditPage()" style="padding:4px 16px;border:none;border-radius:16px;font-weight:600;cursor:pointer;font-size:0.6rem;background:var(--input-bg);color:var(--text-secondary);">✏️ Редактировать страницу</button>
                `}
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Загружаем посты страницы
    loadPagePosts(pageData.uid);
    loadPageSubscribers(pageData.uid);
    loadPageViews(pageData.uid);

    // Если владелец — показываем форму поста
    if (isOwner) {
        var formHtml = `
            <div class="card" style="margin-top:8px;">
                <div class="post-form">
                    <div class="editor-toolbar">
                        <button onclick="formatText('bold')"><b>B</b></button>
                        <button onclick="formatText('italic')"><i>I</i></button>
                        <button onclick="formatText('underline')"><u>U</u></button>
                        <button onclick="formatText('strike')"><s>S</s></button>
                        <button onclick="formatText('h1')">H1</button>
                        <button onclick="formatText('h2')">H2</button>
                        <button onclick="formatText('quote')">"</button>
                        <button onclick="formatText('code')">&lt;/&gt;</button>
                        <button onclick="insertLink()">🔗</button>
                    </div>
                    <div contenteditable="true" id="postEditorPage" class="post-editor" placeholder="Что нового на странице?"></div>
                    <div class="post-actions" style="margin-top:6px;">
                        <label class="file-label" for="fileInputPage">📎 Фото</label>
                        <button class="btn-submit" onclick="submitPagePost()">📤 Опубликовать</button>
                        <button class="btn-cancel" onclick="clearPagePostForm()">Очистить</button>
                    </div>
                    <input type="file" id="fileInputPage" accept="image/*" class="hidden">
                    <div class="preview-box" id="previewBoxPage">
                        <img id="previewImgPage"><span id="previewNamePage"></span>
                        <button class="remove-pic" onclick="removePageImage()">✕</button>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', formHtml);
    }

    // Добавляем контейнер для постов
    var postsHtml = `<div id="pagePosts"></div>`;
    container.insertAdjacentHTML('beforeend', postsHtml);

    // Загружаем посты
    loadPagePosts(pageData.uid);
}

// ===== ЗАГРУЗКА ПОСТОВ СТРАНИЦЫ =====
function loadPagePosts(pageUid) {
    var el = document.getElementById('pagePosts');
    if (!el) return;

    if (pageListener) {
        db.ref('sites/' + SITE + '/page_posts/' + pageUid).off('value', pageListener);
        pageListener = null;
    }

    pageListener = function(snap) {
        var data = snap.val() || {};
        var keys = Object.keys(data).sort(function(a, b) {
            return (data[b].timestamp || 0) - (data[a].timestamp || 0);
        });

        if (!keys.length) {
            el.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Нет постов на странице</div>';
            var countEl = document.getElementById('pagePostCount');
            if (countEl) countEl.textContent = '0';
            return;
        }

        var countEl = document.getElementById('pagePostCount');
        if (countEl) countEl.textContent = keys.length;

        el.innerHTML = '';
        keys.forEach(function(k) {
            var p = data[k];
            p.id = k;
            var postEl = renderPost(p, 'page');
            if (postEl) el.appendChild(postEl);
        });
    };

    db.ref('sites/' + SITE + '/page_posts/' + pageUid).orderByChild('timestamp').on('value', pageListener);
}

// ===== ЗАГРУЗКА ПОДПИСЧИКОВ =====
function loadPageSubscribers(pageUid) {
    db.ref('sites/' + SITE + '/page_subscribers/' + pageUid).on('value', function(snap) {
        var data = snap.val() || {};
        var count = Object.keys(data).length;
        var countEl = document.getElementById('pageSubscriberCount');
        if (countEl) countEl.textContent = count;

        if (USER_UID) {
            pageSubscribers[pageUid] = data[USER_UID] === true;
        }
    });
}

// ===== ЗАГРУЗКА ПРОСМОТРОВ =====
function loadPageViews(pageUid) {
    db.ref('sites/' + SITE + '/page_views/' + pageUid).on('value', function(snap) {
        var data = snap.val() || {};
        var count = Object.keys(data).length;
        var countEl = document.getElementById('pageViewCount');
        if (countEl) countEl.textContent = count;
    });

    if (pageUid !== USER_UID) {
        db.ref('sites/' + SITE + '/page_views/' + pageUid + '/' + USER_UID).set(Date.now());
    }
}

// ===== ПОДПИСКА НА СТРАНИЦУ =====
window.togglePageSubscribe = function(pageUid) {
    if (!USER_UID) { alert('Войдите!'); return; }
    if (pageUid === USER_UID) { alert('Нельзя подписаться на себя'); return; }

    var isSubscribed = pageSubscribers[pageUid] === true;
    var ref = db.ref('sites/' + SITE + '/page_subscribers/' + pageUid + '/' + USER_UID);

    if (isSubscribed) {
        ref.remove();
        pageSubscribers[pageUid] = false;
    } else {
        ref.set(true);
        pageSubscribers[pageUid] = true;
    }

    var btn = document.querySelector('[onclick="togglePageSubscribe(\'' + pageUid + '\')"]');
    if (btn) {
        if (pageSubscribers[pageUid]) {
            btn.textContent = '✅ Подписан';
            btn.style.background = 'var(--input-bg)';
            btn.style.color = 'var(--text-secondary)';
        } else {
            btn.textContent = '➕ Подписаться';
            btn.style.background = 'var(--link-color)';
            btn.style.color = '#fff';
        }
    }
};

// ===== ОТПРАВКА ПОСТА НА СТРАНИЦУ =====
var pendingPageImageFile = null;

function getPageEditorText() {
    var editor = document.getElementById('postEditorPage');
    if (!editor) return '';
    return editor.innerHTML;
}

function clearPagePostForm() {
    var editor = document.getElementById('postEditorPage');
    if (editor) editor.innerHTML = '';
    pendingPageImageFile = null;
    var preview = document.getElementById('previewBoxPage');
    if (preview) preview.classList.remove('visible');
    var input = document.getElementById('fileInputPage');
    if (input) input.value = '';
}

function removePageImage() {
    pendingPageImageFile = null;
    var preview = document.getElementById('previewBoxPage');
    if (preview) preview.classList.remove('visible');
    var input = document.getElementById('fileInputPage');
    if (input) input.value = '';
}

document.addEventListener('DOMContentLoaded', function() {
    var fileInput = document.getElementById('fileInputPage');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
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

            pendingPageImageFile = file;
            var reader = new FileReader();
            reader.onload = function(ev) {
                var img = document.getElementById('previewImgPage');
                var name = document.getElementById('previewNamePage');
                var box = document.getElementById('previewBoxPage');
                if (img) img.src = ev.target.result;
                if (name) name.textContent = file.name.slice(0, 16);
                if (box) box.classList.add('visible');
            };
            reader.readAsDataURL(file);
        });
    }
});

window.submitPagePost = function() {
    if (!USER_UID || !CURRENT_PAGE_UID) {
        alert('Ошибка: страница не найдена');
        return;
    }

    if (CURRENT_PAGE_UID !== USER_UID) {
        alert('Только владелец страницы может публиковать посты');
        return;
    }

    var text = getPageEditorText().trim();
    if (!text && !pendingPageImageFile) {
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
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
            deletedAt: null,
            pageUid: CURRENT_PAGE_UID
        };

        var savePost = function(imgData) {
            if (imgData) postData.img = imgData;
            
            db.ref('sites/' + SITE + '/page_posts/' + CURRENT_PAGE_UID).push(postData);
            clearPagePostForm();
            loadPagePosts(CURRENT_PAGE_UID);
        };

        if (pendingPageImageFile) {
            var reader = new FileReader();
            reader.onload = function(e) {
                savePost(e.target.result);
            };
            reader.readAsDataURL(pendingPageImageFile);
        } else {
            savePost(null);
        }
    });
};

// ===== РЕДАКТИРОВАНИЕ СТРАНИЦЫ =====
window.openEditPage = function() {
    if (!CURRENT_PAGE_UID || CURRENT_PAGE_UID !== USER_UID) return;
    
    db.ref('sites/' + SITE + '/pages/profiles/' + CURRENT_PAGE_UID).once('value', function(snap) {
        var data = snap.val() || {};
        document.getElementById('editPageName').value = data.name || '';
        document.getElementById('editPageDesc').value = data.description || '';
        document.getElementById('editPageModal').classList.add('open');
    });
};

window.closeEditPage = function() {
    document.getElementById('editPageModal').classList.remove('open');
};

window.savePage = function() {
    if (!CURRENT_PAGE_UID || CURRENT_PAGE_UID !== USER_UID) return;

    var name = document.getElementById('editPageName').value.trim();
    var desc = document.getElementById('editPageDesc').value.trim();

    if (!name) { alert('Введите название страницы'); return; }

    db.ref('sites/' + SITE + '/pages/profiles/' + CURRENT_PAGE_UID).update({
        name: name,
        description: desc,
        updatedAt: Date.now()
    }).then(function() {
        closeEditPage();
        alert('✅ Страница обновлена!');
        loadPage('player-likee');
    });
};
