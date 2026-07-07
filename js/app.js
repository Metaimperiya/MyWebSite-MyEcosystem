// ================================================================
// ОСНОВНЫЕ ФУНКЦИИ ПРИЛОЖЕНИЯ
// ================================================================

// ===== ОБНОВЛЕНИЕ UI =====

function updateUI() {
    const topAvatar = document.getElementById('topAvatar');
    const sAvatar = document.getElementById('sAvatar');
    const name = document.getElementById('topName');
    const sName = document.getElementById('sName');
    const dot = document.getElementById('adminDot');

    if (USER && USER_UID) {
        name.textContent = USER;
        sName.textContent = USER;
        renderAvatar(USER_UID, topAvatar, USER.charAt(0).toUpperCase());
        renderAvatar(USER_UID, sAvatar, USER.charAt(0).toUpperCase());
        if (isAdmin) dot.classList.add('active');
        else dot.classList.remove('active');
        updateAdminMenu();
    } else {
        topAvatar.innerHTML = '<span class="letter">?</span>';
        sAvatar.innerHTML = '<span class="letter">?</span>';
        name.textContent = 'Гость';
        sName.textContent = 'Гость';
        dot.classList.remove('active');
        var item = document.getElementById('adminChatsMenuItem');
        if (item) item.style.display = 'none';
    }
}

// ===== АВАТАРКИ =====

function getUserAvatar(uid, callback) {
    if (avatarCache && avatarCache[uid]) {
        callback(avatarCache[uid]);
        return;
    }
    db.ref('sites/' + SITE + '/users/' + uid + '/avatarUrl').once('value', function(snap) {
        const url = snap.val() || null;
        if (!avatarCache) avatarCache = {};
        avatarCache[uid] = url;
        callback(url);
    });
}

function renderAvatar(uid, container, letter) {
    if (!container) return;
    getUserAvatar(uid, function(url) {
        if (url) {
            container.innerHTML = '<img src="' + url + '" />';
        } else {
            container.innerHTML = '<span class="letter">' + (letter || '?') + '</span>';
        }
    });
}

// ===== НАВИГАЦИЯ =====

function setActivePage(pageId) {
    document.querySelectorAll('.page').forEach(function(el) {
        el.classList.remove('active');
    });
    if (pageId) {
        var el = document.getElementById('page-' + pageId);
        if (el) el.classList.add('active');
    }
    
    document.querySelectorAll('.tab-bar .tab').forEach(function(el) {
        el.classList.remove('active');
    });
    
    var tabs = document.querySelectorAll('.tab-bar .tab');
    var map = { feed: 0, groups: 1, people: 2, profile: 3 };
    if (tabs[map[pageId]]) tabs[map[pageId]].classList.add('active');
}

// ===== КНОПКА "ГЛАВНАЯ" В САЙДБАРЕ =====
window.goToHome = function() {
    if (!USER) { 
        var loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.add('open');
        return; 
    }
    window.location.href = '/';
};

window.goToFeed = function() {
    if (!USER) { 
        var loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.add('open');
        return; 
    }
    if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
        window.location.href = '/';
        return;
    }
    setActivePage('feed');
    document.getElementById('chatView').classList.remove('active');
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    CURRENT_ROOM = null;
    if (typeof loadFeed === 'function') loadFeed();
};

window.goToProfile = function() {
    if (!USER) { 
        var loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.add('open');
        return; 
    }
    if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
        window.location.href = '/?page=profile';
        return;
    }
    VIEWING_USER = null;
    setActivePage('profile');
    document.getElementById('chatView').classList.remove('active');
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    CURRENT_ROOM = null;
    if (typeof loadProfile === 'function') loadProfile();
};

window.goToPeople = function() {
    if (!USER) { 
        var loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.add('open');
        return; 
    }
    if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
        window.location.href = '/?page=people';
        return;
    }
    setActivePage('people');
    document.getElementById('chatView').classList.remove('active');
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    CURRENT_ROOM = null;
    if (typeof loadPeople === 'function') loadPeople();
};

window.goToGroups = function() {
    if (!USER) { 
        var loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.add('open');
        return; 
    }
    if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
        window.location.href = '/?page=groups';
        return;
    }
    setActivePage('groups');
    document.getElementById('chatView').classList.remove('active');
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    CURRENT_ROOM = null;
    if (typeof loadGroups === 'function') loadGroups();
};

// ===== САЙДБАР =====

window.toggleSidebar = function() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('show');
};

window.closeSidebar = function() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
};

// ===== АККОРДЕОН =====

window.toggleAccordion = function(header) {
    var item = header.parentElement;
    var body = item.querySelector('.accordion-body');
    var arrow = header.querySelector('.accordion-arrow');
    
    document.querySelectorAll('.accordion-body').forEach(function(b) {
        if (b !== body && b.style.maxHeight) {
            b.style.maxHeight = null;
            b.style.padding = '0 16px';
            var otherArrow = b.parentElement.querySelector('.accordion-arrow');
            if (otherArrow) otherArrow.textContent = '▾';
        }
    });
    
    if (body.style.maxHeight) {
        body.style.maxHeight = null;
        body.style.padding = '0 16px';
        if (arrow) arrow.textContent = '▾';
    } else {
        body.style.maxHeight = body.scrollHeight + 'px';
        body.style.padding = '6px 16px 10px 16px';
        if (arrow) arrow.textContent = '▴';
    }
};

// ===== РАЗМЕР ФРЕЙМА =====

window.setFrameSize = function(size) {
    currentFrameSize = size;
    document.querySelectorAll('.frame-size-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    if (size === 'small') {
        var btn = document.getElementById('frameSizeSmall');
        if (btn) btn.classList.add('active');
    } else {
        var btn2 = document.getElementById('frameSizeLarge');
        if (btn2) btn2.classList.add('active');
    }
};

// ===== ТЕМА =====

window.toggleTheme = function() {
    var currentTheme = document.documentElement.getAttribute('data-theme');
    var newTheme = (currentTheme === 'dark') ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
};

(function applySavedTheme() {
    var savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

// ===== РЕДАКТОР =====

window.formatText = function(type) {
    var editor = document.getElementById('postEditor');
    if (!editor) return;
    
    var selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    var range = selection.getRangeAt(0);
    var selectedText = range.toString();
    
    if (!selectedText) {
        var templates = {
            'bold': '**жирный текст**',
            'italic': '*курсив*',
            'underline': '__подчёркнутый__',
            'strike': '~~зачёркнутый~~',
            'h1': '# Заголовок',
            'h2': '## Подзаголовок',
            'quote': '> Цитата',
            'code': '```код```'
        };
        
        var template = templates[type] || '';
        if (template) {
            document.execCommand('insertText', false, template);
        }
        return;
    }
    
    var wrappers = {
        'bold': '**',
        'italic': '*',
        'underline': '__',
        'strike': '~~',
        'h1': '# ',
        'h2': '## ',
        'quote': '> ',
        'code': '```'
    };
    
    var wrapper = wrappers[type];
    if (!wrapper) return;
    
    var newText;
    if (type === 'h1' || type === 'h2' || type === 'quote') {
        newText = wrapper + selectedText;
    } else {
        var closeWrapper = wrapper;
        if (type === 'code') closeWrapper = '```';
        newText = wrapper + selectedText + closeWrapper;
    }
    
    document.execCommand('insertText', false, newText);
};

window.insertLink = function() {
    var url = prompt('Введите ссылку:');
    if (!url) return;
    
    var editor = document.getElementById('postEditor');
    if (!editor) return;
    
    var selection = window.getSelection();
    if (selection.rangeCount) {
        var text = selection.toString() || 'ссылка';
        document.execCommand('insertText', false, '[' + text + '](' + url + ')');
    }
};

// ================================================================
// СПИСОК ЧАТОВ
// ================================================================

window.openChatList = function() {
    if (!USER_UID) {
        alert('Войдите!');
        return;
    }
    document.getElementById('chatListModal').classList.add('open');
    loadChatList();
};

window.closeChatList = function() {
    document.getElementById('chatListModal').classList.remove('open');
};

function loadChatList() {
    var container = document.getElementById('chatListContainer');
    if (!container) return;
    
    container.innerHTML = '<div style="color:#bbb;text-align:center;padding:12px;font-size:0.75rem;">⏳ Загрузка...</div>';
    
    db.ref('sites/' + SITE + '/friends/' + USER_UID).once('value', function(snap) {
        var friends = snap.val() || {};
        var friendIds = Object.keys(friends).filter(function(k) { return friends[k] === true; });
        
        if (!friendIds.length) {
            container.innerHTML = '<div style="color:#bbb;text-align:center;padding:12px;font-size:0.75rem;">🤝 Добавьте друзей, чтобы начать общение</div>';
            return;
        }
        
        var html = '';
        var loaded = 0;
        
        friendIds.forEach(function(uid) {
            db.ref('sites/' + SITE + '/users/' + uid).once('value', function(usnap) {
                var u = usnap.val() || {};
                var name = u.name || 'Аноним';
                var letter = name.charAt(0).toUpperCase();
                
                var chatId = [USER_UID, uid].sort().join('_');
                var path = 'dms/' + SITE + '/' + chatId + '/messages';
                
                db.ref(path).orderByChild('timestamp').limitToLast(1).once('value', function(msgSnap) {
                    var lastMsg = '';
                    msgSnap.forEach(function(m) {
                        lastMsg = m.val().text || '';
                    });
                    
                    html += '<div class="chat-list-item" onclick="openPrivateChat(\'' + uid + '\');closeChatList();">';
                    html += '<span class="avatar-wrap" id="clava-' + uid + '"><span class="letter">' + letter + '</span></span>';
                    html += '<div class="chat-list-info">';
                    html += '<div class="chat-list-name">' + esc(name) + '</div>';
                    html += '<div class="chat-list-last">' + (lastMsg ? esc(lastMsg.slice(0, 30)) : 'Нет сообщений') + '</div>';
                    html += '</div>';
                    html += '</div>';
                    
                    loaded++;
                    if (loaded === friendIds.length) {
                        container.innerHTML = html;
                        friendIds.forEach(function(k) {
                            var el = document.getElementById('clava-' + k);
                            if (el) renderAvatar(k, el, '?');
                        });
                    }
                });
            });
        });
    });
}

// ================================================================
// ИНДИКАТОР НАБОРА
// ================================================================

var typingTimeout = null;

function setupTypingIndicator(chatId) {
    var typingRef = db.ref('dms/' + SITE + '/' + chatId + '/typing');
    var input = document.getElementById('chatInput');

    if (window._typingHandler) {
        input.removeEventListener('keydown', window._typingHandler);
    }

    window._typingHandler = function() {
        typingRef.set({ [USER_UID]: true });
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(function() {
            typingRef.set(null);
        }, 2000);
    };
    input.addEventListener('keydown', window._typingHandler);

    typingRef.on('value', function(snap) {
        var data = snap.val() || {};
        var isTyping = Object.keys(data).some(function(key) {
            return data[key] === true && key !== USER_UID;
        });

        var indicator = document.getElementById('typingIndicator');
        if (indicator) {
            if (isTyping) {
                indicator.textContent = '✍️ Печатает...';
                indicator.style.display = 'block';
            } else {
                indicator.style.display = 'none';
            }
        }
    });
}

// ================================================================
// АДМИН-ПАНЕЛЬ
// ================================================================

window.openAdminChats = function() {
    if (!isAdmin) {
        alert('Только для администратора!');
        return;
    }
    document.getElementById('adminChatsModal').classList.add('open');
    loadAdminChats();
};

window.closeAdminChats = function() {
    document.getElementById('adminChatsModal').classList.remove('open');
};

function loadAdminChats() {
    var container = document.getElementById('adminChatsList');
    if (!container) return;
    
    container.innerHTML = '<div style="color:#bbb;text-align:center;padding:12px;font-size:0.75rem;">⏳ Загрузка...</div>';
    
    db.ref('dms/' + SITE).once('value', function(snap) {
        var dms = snap.val() || {};
        var chatIds = Object.keys(dms);
        
        if (!chatIds.length) {
            container.innerHTML = '<div style="color:#bbb;text-align:center;padding:12px;font-size:0.75rem;">Нет личных чатов</div>';
            return;
        }
        
        var html = '';
        var loaded = 0;
        
        chatIds.forEach(function(chatId) {
            var uids = chatId.split('_');
            
            var promises = uids.map(function(uid) {
                return db.ref('sites/' + SITE + '/users/' + uid + '/name').once('value');
            });
            
            Promise.all(promises).then(function(results) {
                var names = results.map(function(r) { return r.val() || 'Аноним'; });
                var chatName = names.join(' ⬄ ');
                var path = 'dms/' + SITE + '/' + chatId + '/messages';
                
                db.ref(path).once('value', function(msgSnap) {
                    var count = msgSnap.numChildren();
                    var lastMsg = '';
                    msgSnap.orderByChild('timestamp').limitToLast(1).forEach(function(m) {
                        lastMsg = m.val().text || '';
                    });
                    
                    html += '<div class="chat-list-item" onclick="adminViewChat(\'' + chatId + '\')">';
                    html += '<div class="chat-list-info">';
                    html += '<div class="chat-list-name">💬 ' + esc(chatName) + '</div>';
                    html += '<div class="chat-list-last">' + (lastMsg ? esc(lastMsg.slice(0, 30)) : 'Сообщений: ' + count) + '</div>';
                    html += '</div>';
                    html += '</div>';
                    
                    loaded++;
                    if (loaded === chatIds.length) {
                        container.innerHTML = html;
                    }
                });
            });
        });
    });
}

window.adminViewChat = function(chatId) {
    if (!isAdmin) return;
    var path = 'dms/' + SITE + '/' + chatId + '/messages';
    closeAdminChats();
    CURRENT_ROOM = chatId;
    document.getElementById('chatView').classList.add('active');
    setActivePage(null);
    loadChat(path);
};

function updateAdminMenu() {
    var item = document.getElementById('adminChatsMenuItem');
    if (item) {
        item.style.display = isAdmin ? 'block' : 'none';
    }
}

// ================================================================
// ЯЗЫК
// ================================================================

if (typeof toggleLanguage === 'undefined') {
    window.toggleLanguage = function() {
        var newLang = currentLang === 'ru' ? 'en' : 'ru';
        setLanguage(newLang);
    };
}

function updateLangDisplay() {
    var display = document.getElementById('langDisplay');
    if (display) {
        display.textContent = currentLang === 'ru' ? 'Русский' : 'English';
    }
}

// ================================================================
// ОБНОВЛЕНИЕ БЕЙДЖИКА УВЕДОМЛЕНИЙ
// ================================================================

function updateNotifBadge() {
    if (!USER_UID) return;
    db.ref('sites/' + SITE + '/notifications/' + USER_UID).orderByChild('read').equalTo(false).once('value', function(snap) {
        var count = snap.numChildren();
        var badge = document.getElementById('notifBadge');
        if (badge) {
            if (count > 0) {
                badge.style.display = 'inline';
                badge.textContent = count;
            } else {
                badge.style.display = 'none';
            }
        }
    });
}

// ================================================================
// ОТКРЫТИЕ СТРАНИЦ (SPA)
// ================================================================

function openPage(pageId) {
    if (!pageId) return;
    
    document.querySelectorAll('.page').forEach(function(el) {
        el.style.display = 'none';
        el.classList.remove('active');
    });
    
    var page = document.getElementById('page-' + pageId);
    if (page) {
        page.style.display = 'block';
        page.classList.add('active');
        console.log('✅ Открыта страница:', pageId);
        
        if (pageId === 'foto') {
            setTimeout(function() {
                if (typeof loadFotoFeed === 'function') {
                    loadFotoFeed();
                }
            }, 300);
        }
    } else {
        console.warn('⚠️ Страница не найдена:', pageId);
    }
    
    if (typeof closeSidebar === 'function') {
        closeSidebar();
    }
}

window.openPage = openPage;

// ================================================================

var originalUpdateUI = updateUI || function() {};
updateUI = function() {
    originalUpdateUI();
    setTimeout(function() {
        if (typeof translatePage === 'function') translatePage();
        updateLangDisplay();
        updateNotifBadge();
    }, 200);
};

setTimeout(function() {
    updateLangDisplay();
    updateNotifBadge();
}, 500);

setInterval(updateNotifBadge, 5000);

// ================================================================
// КОРОТКИЕ ССЫЛКИ
// ================================================================

function handleShortUrl() {
    var path = window.location.pathname;
    var slug = path.replace('/', '').replace(/\/$/, '');
    
    if (!slug || slug === '' || slug === 'index.html') {
        return;
    }
    
    if (slug === 'player-likee') {
        document.querySelectorAll('.page').forEach(function(el) {
            el.style.display = 'none';
            el.classList.remove('active');
        });
        var page = document.getElementById('page-profile');
        if (page) {
            page.style.display = 'block';
            page.classList.add('active');
            if (typeof loadProfile === 'function') {
                VIEWING_USER = 'ANR62p3qcjOe2ALsdVvJHUNCCV42';
                loadProfile();
            }
        }
        return;
    }
    
    show404();
}

function show404() {
    var container = document.getElementById('pageContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px 20px;">
                <div style="font-size:48px;color:var(--muted-text);">404</div>
                <div style="font-size:1.2rem;font-weight:600;margin:10px 0;">Страница не найдена</div>
                <div style="color:var(--muted-text);font-size:0.8rem;">Страница ${window.location.pathname} не существует</div>
                <button onclick="window.location.href='/'" style="margin-top:16px;padding:8px 24px;background:var(--link-color);color:#fff;border:none;border-radius:8px;cursor:pointer;">На главную</button>
            </div>
        `;
    }
}

setTimeout(handleShortUrl, 600);

// ================================================================
// ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ШАПКИ
// ================================================================

function forceUpdateTopbar() {
    var topName = document.getElementById('topName');
    var topAvatar = document.getElementById('topAvatar');
    
    if (topName && USER) {
        topName.textContent = USER;
    }
    if (topAvatar && USER_UID) {
        renderAvatar(USER_UID, topAvatar, USER.charAt(0).toUpperCase());
    }
}

// ================================================================
// ЗАГРУЗКА КОМПОНЕНТОВ
// ================================================================

(function() {
    const components = [
        { id: 'topbarContainer', url: 'topbar.html' },
        { id: 'settingsContainer', url: 'settings.html' },
        { id: 'sidebarContainer', url: 'sidebar.html' },
        { id: 'modalsContainer', url: 'modals.html' }
    ];

    let loaded = 0;
    const total = components.length;

    components.forEach(function(comp) {
        const container = document.getElementById(comp.id);
        if (!container) return;

        fetch(comp.url)
            .then(response => {
                if (!response.ok) throw new Error('Не удалось загрузить ' + comp.url);
                return response.text();
            })
            .then(html => {
                container.innerHTML = html;
                loaded++;
                
                // !!! ВОТ ЗДЕСЬ !!! — СРАЗУ ПОСЛЕ ВСТАВКИ HTML ОБНОВЛЯЕМ ШАПКУ
                if (comp.id === 'topbarContainer') {
                    forceUpdateTopbar();
                }
                
                if (loaded === total) {
                    console.log('✅ Все компоненты загружены!');
                    setTimeout(function() {
                        if (typeof translatePage === 'function') translatePage();
                        if (typeof updateUI === 'function') updateUI();
                        if (typeof loadNotifications === 'function') loadNotifications();
                        if (typeof updateNotifBadge === 'function') updateNotifBadge();
                        if (typeof initAudio === 'function') initAudio();
                        
                        var MY_UID = 'ANR62p3qcjOe2ALsdVvJHUNCCV42';
                        VIEWING_USER = MY_UID;
                        if (typeof loadProfile === 'function') {
                            loadProfile();
                        }
                    }, 300);
                }
            })
            .catch(err => {
                console.warn('❌ Ошибка загрузки ' + comp.url + ':', err);
                container.innerHTML = `<div style="display:none;"></div>`;
                loaded++;
                if (loaded === total) {
                    console.log('✅ Все компоненты загружены (с ошибками)');
                    setTimeout(function() {
                        if (typeof translatePage === 'function') translatePage();
                        if (typeof updateUI === 'function') updateUI();
                        if (typeof loadNotifications === 'function') loadNotifications();
                        if (typeof updateNotifBadge === 'function') updateNotifBadge();
                        if (typeof initAudio === 'function') initAudio();
                        
                        var MY_UID = 'ANR62p3qcjOe2ALsdVvJHUNCCV42';
                        VIEWING_USER = MY_UID;
                        if (typeof loadProfile === 'function') {
                            loadProfile();
                        }
                    }, 300);
                }
            });
    });
})();
