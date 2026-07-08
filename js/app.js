// ================================================================
// ОСНОВНЫЕ ФУНКЦИИ ПРИЛОЖЕНИЯ
// ================================================================

// ===== ПЕРЕХОД НА ПЕРСОНАЛЬНУЮ СТРАНИЦУ =====

window.goToUserPage = function() {
    console.log('🔵 goToUserPage вызвана! USER_UID:', USER_UID);
    
    if (!USER_UID) {
        console.log('❌ Нет USER_UID, открываем окно входа');
        var loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.add('open');
        return;
    }
    
    // ПОЛУЧАЕМ SLUG ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
    db.ref('sites/' + SITE + '/users/' + USER_UID + '/slug').once('value', function(snap) {
        var slug = snap.val();
        console.log('🔵 Получен slug пользователя:', slug);
        
        if (slug) {
            // ЕСЛИ ЕСТЬ SLUG — ПЕРЕХОДИМ НА НЕГО
            window.location.href = '/' + slug + '/';
        } else {
            // ЕСЛИ НЕТ SLUG — ПЕРЕХОДИМ ПО UID
            window.location.href = '/user/' + USER_UID + '/';
        }
    }).catch(function(err) {
        console.error('❌ Ошибка получения slug:', err);
        // FALLBACK — ПО UID
        window.location.href = '/user/' + USER_UID + '/';
    });
};

// ===== ОБНОВЛЕНИЕ UI =====

function updateUI() {
    var topAvatar = document.getElementById('topAvatar');
    var sAvatar = document.getElementById('sAvatar');
    var name = document.getElementById('topName');
    var sName = document.getElementById('sName');
    var dot = document.getElementById('adminDot');

    if (USER && USER_UID) {
        db.ref('sites/' + SITE + '/users/' + USER_UID + '/name').once('value', function(snap) {
            var dbName = snap.val() || USER;
            
            if (dbName && dbName !== 'Гость' && dbName !== 'Anonymous') {
                if (name) name.textContent = dbName;
                if (sName) sName.textContent = dbName;
                localStorage.setItem('dc_u_' + SITE, dbName);
            } else {
                if (USER && USER !== 'Гость' && USER !== 'Anonymous') {
                    if (name) name.textContent = USER;
                    if (sName) sName.textContent = USER;
                } else {
                    if (name) name.textContent = '';
                    if (sName) sName.textContent = '';
                }
            }
        });
        
        renderAvatar(USER_UID, topAvatar, USER ? USER.charAt(0).toUpperCase() : '?');
        renderAvatar(USER_UID, sAvatar, USER ? USER.charAt(0).toUpperCase() : '?');
        
        isAdmin = ADMIN_UIDS.includes(USER_UID);
        if (isAdmin) {
            if (dot) dot.classList.add('active');
            localStorage.setItem('dc_admin_' + SITE, 'true');
        } else {
            if (dot) dot.classList.remove('active');
            localStorage.removeItem('dc_admin_' + SITE);
        }
        updateAdminMenu();
    } else {
        if (topAvatar) topAvatar.innerHTML = '<span class="letter">?</span>';
        if (sAvatar) sAvatar.innerHTML = '<span class="letter">?</span>';
        if (name) name.textContent = '';
        if (sName) sName.textContent = '';
        if (dot) dot.classList.remove('active');
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
        var url = snap.val() || null;
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
// ИНИЦИАЛИЗАЦИЯ
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

document.addEventListener('DOMContentLoaded', function() {
    if (USER_UID) {
        updateUI();
    }
});
