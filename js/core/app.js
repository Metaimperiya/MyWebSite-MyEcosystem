// ================================================================
// ОСНОВНЫЕ ФУНКЦИИ ПРИЛОЖЕНИЯ
// ================================================================

console.log('✅ app.js загружен, SITE =', SITE);

// ================================================================
// ПЕРЕКЛЮЧЕНИЕ МЕЖДУ ПК И МОБИЛЬНЫМ РЕЖИМОМ
// ================================================================

var viewMode = localStorage.getItem('viewMode') || 'pc';

window.toggleViewMode = function() {
    var newMode = (viewMode === 'pc') ? 'mobile' : 'pc';
    viewMode = newMode;
    localStorage.setItem('viewMode', viewMode);
    
    // Просто добавляем/удаляем класс на body
    if (viewMode === 'mobile') {
        document.body.classList.add('mobile-view');
        document.body.classList.remove('pc-view');
    } else {
        document.body.classList.add('pc-view');
        document.body.classList.remove('mobile-view');
    }
    
    updateViewModeDisplay();
    console.log('📱 Режим изменён на:', viewMode);
    
    // Перезагружаем ленту
    setTimeout(function() {
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadProfile === 'function') {
            var profilePage = document.getElementById('page-profile');
            if (profilePage && profilePage.classList.contains('active')) {
                loadProfile();
            }
        }
    }, 300);
};

function updateViewModeDisplay() {
    var display = document.getElementById('viewModeDisplay');
    if (display) {
        display.textContent = viewMode === 'pc' ? 'ПК' : 'Мобильный';
    }
}

// Применяем режим при загрузке
(function initViewMode() {
    var savedMode = localStorage.getItem('viewMode') || 'pc';
    viewMode = savedMode;
    
    if (viewMode === 'mobile') {
        document.body.classList.add('mobile-view');
        document.body.classList.remove('pc-view');
    } else {
        document.body.classList.add('pc-view');
        document.body.classList.remove('mobile-view');
    }
    
    updateViewModeDisplay();
    setTimeout(function() {
        if (typeof loadFeed === 'function') loadFeed();
    }, 300);
})();

// ================================================================
// ЕДИНЫЙ МЕХАНИЗМ НАВИГАЦИИ В ПРОФИЛЬ
// ================================================================

window.navigateToProfile = function(uid) {
    console.log('🔵 navigateToProfile вызвана с uid:', uid, 'USER_UID:', USER_UID);

    if (!window.checkAccess) {
        console.error('❌ checkAccess не определён!');
        return;
    }

    if (!window.checkAccess()) return;

    if (!uid) {
        uid = USER_UID;
        console.log('✅ uid не передан, используем USER_UID:', uid);
    }

    if (uid === USER_UID) {
        console.log('✅ Открываем свой профиль');
        VIEWING_USER = null;
        
        if (typeof window.setActivePage === 'function') {
            window.setActivePage('profile');
        }
        
        var chatView = document.getElementById('chatView');
        if (chatView) chatView.classList.remove('active');
        
        if (chatUnsub) {
            if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
            chatUnsub = null;
        }
        CURRENT_ROOM = null;
        
        if (typeof loadProfile === 'function') {
            loadProfile();
        }
        
        if (window.history && window.history.pushState) {
            window.history.pushState({}, '', '/');
        }
        return;
    }

    console.log('👤 Открываем профиль пользователя:', uid);
    VIEWING_USER = uid;
    
    if (typeof window.setActivePage === 'function') {
        window.setActivePage('profile');
    }
    
    var chatView = document.getElementById('chatView');
    if (chatView) chatView.classList.remove('active');
    
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    CURRENT_ROOM = null;
    
    if (typeof loadProfile === 'function') {
        loadProfile();
    }

    if (window.history && window.history.pushState) {
        db.ref('sites/' + SITE + '/users/' + uid + '/slug').once('value', function(snap) {
            var slug = snap.val();
            if (slug) {
                window.history.pushState({}, '', '/' + slug + '/');
            } else {
                window.history.pushState({}, '', '/?page=profile&user=' + uid);
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', function() {

    // ===== ШЛАГБАУМ =====
    window.checkAccess = function() {
        if (typeof USER_UID === 'undefined' || !USER_UID) {
            var loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.add('open');
            console.log('⛔ Шлагбаум закрыт!');
            return false;
        }
        console.log('✅ Шлагбаум открыт!');
        return true;
    };

    // ===== НАСТРОЙКИ =====
    window.toggleSettingsMenu = function() {
        var dropdown = document.getElementById('settingsDropdown');
        if (!dropdown) return;
        dropdown.classList.toggle('open');
    };

    window.closeSettingsMenu = function() {
        var dropdown = document.getElementById('settingsDropdown');
        if (!dropdown) return;
        dropdown.classList.remove('open');
    };

    document.addEventListener('click', function(e) {
        var dropdown = document.getElementById('settingsDropdown');
        if (!dropdown) return;
        if (!e.target.closest('.pc-topbar .right') && !e.target.closest('#settingsDropdown')) {
            dropdown.classList.remove('open');
        }
    });

    // ===== ОБНОВЛЕНИЕ UI =====
    window.updateUI = function() {
        var topAvatar = document.getElementById('topAvatar');
        var sAvatar = document.getElementById('sAvatar');
        var name = document.getElementById('topName');
        var sName = document.getElementById('sName');
        var dot = document.getElementById('adminDot');

        console.log('🔄 updateUI вызвана, topAvatar:', !!topAvatar, 'topName:', !!name);

        if (USER && USER_UID) {
            db.ref('sites/' + SITE + '/users/' + USER_UID + '/name').once('value', function(snap) {
                var dbName = snap.val() || USER;
                if (dbName && dbName !== 'Гость' && dbName !== 'Anonymous') {
                    if (name) name.textContent = dbName;
                    if (sName) sName.textContent = dbName;
                    localStorage.setItem('dc_u_' + SITE, dbName);
                } else {
                    if (name) name.textContent = USER;
                    if (sName) sName.textContent = USER;
                }
            });

            window.renderAvatar(USER_UID, topAvatar, USER ? USER.charAt(0).toUpperCase() : '?');
            window.renderAvatar(USER_UID, sAvatar, USER ? USER.charAt(0).toUpperCase() : '?');

            isAdmin = ADMIN_UIDS.includes(USER_UID);
            if (isAdmin) {
                if (dot) dot.classList.add('active');
                localStorage.setItem('dc_admin_' + SITE, 'true');
            } else {
                if (dot) dot.classList.remove('active');
                localStorage.removeItem('dc_admin_' + SITE);
            }
            window.updateAdminMenu();

            var mainContainer = document.getElementById('mainContainer');
            if (mainContainer) mainContainer.style.display = 'block';
            var loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.remove('open');

        } else {
            if (topAvatar) topAvatar.innerHTML = '<span class="letter">?</span>';
            if (sAvatar) sAvatar.innerHTML = '<span class="letter">?</span>';
            if (name) name.textContent = '';
            if (sName) sName.textContent = '';
            if (dot) dot.classList.remove('active');
            var item = document.getElementById('adminChatsMenuItem');
            if (item) item.style.display = 'none';

            var mainContainer = document.getElementById('mainContainer');
            if (mainContainer) mainContainer.style.display = 'none';
            var loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.add('open');
        }
    };

    // ===== АВАТАРКИ =====
    window.getUserAvatar = function(uid, callback) {
        if (avatarCache && avatarCache[uid]) {
            callback(avatarCache[uid]);
            return;
        }
        db.ref('sites/' + SITE + '/all_users/' + uid + '/avatarUrl').once('value', function(snap) {
            var url = snap.val() || null;
            if (!avatarCache) avatarCache = {};
            avatarCache[uid] = url;
            callback(url);
        });
    };

    window.renderAvatar = function(uid, container, letter) {
        if (!container) return;
        window.getUserAvatar(uid, function(url) {
            if (url) {
                container.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />';
            } else {
                container.innerHTML = '<span class="letter">' + (letter || '?') + '</span>';
            }
        });
    };

    // ===== НАВИГАЦИЯ =====
    window.setActivePage = function(pageId) {
        console.log('🔵 setActivePage: активирую', pageId);
        
        document.querySelectorAll('.page').forEach(function(el) {
            el.classList.remove('active');
            el.style.display = 'none';
        });
        
        var el = document.getElementById('page-' + pageId);
        if (el) {
            el.classList.add('active');
            el.style.display = 'block';
            console.log('✅ Успешно активирована:', pageId);
        } else {
            console.error('❌ Элемент с ID "page-' + pageId + '" не найден!');
        }
    };

    // ===== ПЕРЕХОДЫ =====
    window.goToHome = function() {
        if (!window.checkAccess()) return;
        window.location.href = '/';
    };

    window.goToFeed = function() {
        if (!window.checkAccess()) return;
        if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
            window.location.href = '/';
            return;
        }
        window.setActivePage('feed');
        document.getElementById('chatView').classList.remove('active');
        if (chatUnsub) {
            if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
            chatUnsub = null;
        }
        CURRENT_ROOM = null;
        if (typeof loadFeed === 'function') {
            loadFeed();
        }
    };

    window.goToProfile = function() {
        console.log('🔵 goToProfile вызвана!');
        window.navigateToProfile(null);
    };

    window.viewUserProfile = function(uid) {
        console.log('🔵 viewUserProfile вызвана с uid:', uid);
        window.navigateToProfile(uid);
    };

    window.goToPeople = function() {
        if (!window.checkAccess()) return;
        if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
            window.location.href = '/?page=people';
            return;
        }
        window.setActivePage('people');
        document.getElementById('chatView').classList.remove('active');
        if (chatUnsub) {
            if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
            chatUnsub = null;
        }
        CURRENT_ROOM = null;
        if (typeof loadPeople === 'function') loadPeople();
    };

    window.goToGroups = function() {
        if (!window.checkAccess()) return;
        if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
            window.location.href = '/?page=groups';
            return;
        }
        window.setActivePage('groups');
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
        if (!window.checkAccess()) return;
        var sidebar = document.getElementById('sidebar');
        var overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('show');
    };

    window.closeSidebar = function() {
        var sidebar = document.getElementById('sidebar');
        var overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('show');
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
        if (!window.checkAccess()) return;
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

            var chats = [];
            var loaded = 0;

            friendIds.forEach(function(uid) {
                db.ref('sites/' + SITE + '/all_users/' + uid).once('value', function(usnap) {
                    var u = usnap.val() || {};
                    var name = u.name || 'Аноним';
                    var letter = name.charAt(0).toUpperCase();

                    var chatId = [USER_UID, uid].sort().join('_');
                    var path = 'dms/' + SITE + '/' + chatId + '/messages';

                    db.ref(path).once('value', function(msgSnap) {
                        var messages = msgSnap.val() || {};
                        var messageIds = Object.keys(messages).sort(function(a, b) {
                            return (messages[b].timestamp || 0) - (messages[a].timestamp || 0);
                        });
                        var last = messageIds.length ? messages[messageIds[0]] : null;
                        var unread = messageIds.filter(function(id) {
                            var message = messages[id];
                            return message.senderUid && message.senderUid !== USER_UID &&
                                (!message.readBy || message.readBy[USER_UID] !== true);
                        }).length;
                        chats.push({ uid: uid, name: name, letter: letter, last: last, unread: unread });

                        loaded++;
                        if (loaded === friendIds.length) {
                            chats.sort(function(a, b) {
                                return ((b.last && b.last.timestamp) || 0) - ((a.last && a.last.timestamp) || 0);
                            });
                            container.innerHTML = chats.map(function(chat) {
                                var preview = chat.last ? chat.last.text || '' : 'Нет сообщений';
                                return '<button type="button" class="chat-list-item' + (chat.unread ? ' unread' : '') + '" onclick="openPrivateChat(\'' + chat.uid + '\');closeChatList();">' +
                                    '<span class="avatar-wrap" id="clava-' + chat.uid + '"><span class="letter">' + esc(chat.letter) + '</span></span>' +
                                    '<span class="chat-list-info"><span class="chat-list-name">' + esc(chat.name) + '</span>' +
                                    '<span class="chat-list-last">' + esc(preview.slice(0, 44)) + '</span></span>' +
                                    (chat.unread ? '<span class="chat-list-unread">' + (chat.unread > 99 ? '99+' : chat.unread) + '</span>' : '') +
                                    '</button>';
                            }).join('');
                            chats.forEach(function(chat) {
                                var el = document.getElementById('clava-' + chat.uid);
                                if (el) renderAvatar(chat.uid, el, '?');
                            });
                        }
                    });
                });
            });
        });
    }

    // ================================================================
    // ОТКРЫТИЕ СТРАНИЦ
    // ================================================================

    window.openPage = function(pageId) {
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
    };

    // ================================================================
    // ИНИЦИАЛИЗАЦИЯ
    // ================================================================

    var originalUpdateUI = window.updateUI || function() {};
    window.updateUI = function() {
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

    if (typeof USER_UID === 'undefined' || !USER_UID) {
        var mainContainer = document.getElementById('mainContainer');
        if (mainContainer) mainContainer.style.display = 'none';
        var loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.add('open');
    }

    var urlParams = new URLSearchParams(window.location.search);
    var userParam = urlParams.get('user');
    var pageParam = urlParams.get('page');

    if (userParam && pageParam === 'profile') {
        VIEWING_USER = userParam;
        setTimeout(function() {
            window.setActivePage('profile');
            if (typeof loadProfile === 'function') loadProfile();
        }, 1000);
    }

    console.log('✅ app.js загружен! SITE =', SITE);
    console.log('✅ navigateToProfile доступна:', typeof window.navigateToProfile);
    console.log('✅ goToProfile доступна:', typeof window.goToProfile);

});

// ================================================================
// updateNotifBadge
// ================================================================

window.updateNotifBadge = function() {
    if (!USER_UID) {
        var badge = document.getElementById('notifBadge');
        if (badge) badge.style.display = 'none';
        return;
    }
    var badge = document.getElementById('notifBadge');
    if (!badge) return;
    db.ref('sites/' + SITE + '/notifications/' + USER_UID).orderByChild('read').equalTo(false).once('value', function(snap) {
        var count = snap.numChildren();
        if (count > 0) {
            badge.style.display = 'inline';
            badge.textContent = count;
        } else {
            badge.style.display = 'none';
        }
    });
};

// ================================================================
// ОБНОВЛЕНИЕ ТОП-БАРА
// ================================================================

function updatePcTopbar() {
    var pcAvatar = document.getElementById('topAvatar');
    var pcName = document.getElementById('topName');
    var sAvatar = document.getElementById('sAvatar');
    var sName = document.getElementById('sName');
    var sEmail = document.getElementById('sEmail');

    console.log('🔄 updatePcTopbar вызвана! USER =', USER, 'USER_UID =', USER_UID);

    if (USER && USER_UID) {
        db.ref('sites/' + SITE + '/users/' + USER_UID + '/name').once('value', function(snap) {
            var dbName = snap.val() || USER;
            if (pcName) {
                pcName.textContent = dbName;
                console.log('✅ Имя в топ-баре обновлено:', dbName);
            }
            if (sName) {
                sName.textContent = dbName;
            }
        });

        db.ref('sites/' + SITE + '/users/' + USER_UID + '/avatarUrl').once('value', function(snap) {
            var avatarUrl = snap.val();
            var letter = (USER || '?').charAt(0).toUpperCase();

            if (pcAvatar) {
                if (avatarUrl) {
                    pcAvatar.innerHTML = '<img src="' + avatarUrl + '" alt="аватар" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />';
                } else {
                    pcAvatar.innerHTML = '<span class="letter">' + letter + '</span>';
                }
            }

            if (sAvatar) {
                if (avatarUrl) {
                    sAvatar.innerHTML = '<img src="' + avatarUrl + '" alt="аватар" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />';
                } else {
                    sAvatar.innerHTML = '<span class="letter">' + letter + '</span>';
                }
            }
        });

        if (sEmail) {
            db.ref('sites/' + SITE + '/users/' + USER_UID + '/email').once('value', function(snap) {
                sEmail.textContent = snap.val() || '';
            });
        }
    } else {
        if (pcAvatar) pcAvatar.innerHTML = '<span class="letter">?</span>';
        if (pcName) pcName.textContent = '';
        if (sAvatar) sAvatar.innerHTML = '<span class="letter">?</span>';
        if (sName) sName.textContent = 'Гость';
        if (sEmail) sEmail.textContent = '';
    }
}

function updateLangDisplay() {
    var display = document.getElementById('langDisplay');
    if (display) {
        display.textContent = currentLang === 'ru' ? 'Русский' : 'English';
    }
}

setTimeout(function() {
    console.log('🔄 Принудительный вызов updatePcTopbar()');
    updatePcTopbar();
}, 1000);

if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(function(user) {
        setTimeout(function() {
            console.log('🔄 Авторизация изменилась, обновляем топ-бар');
            updatePcTopbar();
            if (typeof updateUI === 'function') updateUI();
        }, 500);
    });
}

console.log('✅ app.js загружен! SITE =', SITE);
