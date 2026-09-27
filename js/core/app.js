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

    // ===== РЕДАКТОР ПОСТА =====
    window.sanitizePostHtml = function(html) {
        var doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
        var allowed = { A: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, STRIKE: 1, P: 1, DIV: 1, BR: 1, H1: 1, H2: 1, BLOCKQUOTE: 1, PRE: 1, CODE: 1, UL: 1, OL: 1, LI: 1 };
        Array.from(doc.body.querySelectorAll('*')).reverse().forEach(function(el) {
            if (!allowed[el.tagName]) { el.replaceWith.apply(el, Array.from(el.childNodes)); return; }
            var rawHref = el.tagName === 'A' ? el.getAttribute('href') || '' : '';
            Array.from(el.attributes).forEach(function(attr) { el.removeAttribute(attr.name); });
            if (el.tagName === 'A') {
                try {
                    var url = new URL(rawHref, window.location.href);
                    if (url.protocol === 'http:' || url.protocol === 'https:') {
                        el.setAttribute('href', url.href);
                        el.setAttribute('target', '_blank');
                        el.setAttribute('rel', 'noopener noreferrer');
                    } else el.replaceWith.apply(el, Array.from(el.childNodes));
                } catch (_) { el.replaceWith.apply(el, Array.from(el.childNodes)); }
            }
        });
        return doc.body.innerHTML;
    };

    function getSelectedPostEditor() {
        var selection = window.getSelection();
        var node = selection && selection.anchorNode;
        var element = node && (node.nodeType === 1 ? node : node.parentElement);
        return element && element.closest ? element.closest('.post-editor') : null;
    }

    window.formatText = function(type) {
        var editor = getSelectedPostEditor();
        if (!editor) return;
        editor.focus();
        var selection = window.getSelection();
        if (!selection || !selection.rangeCount || !editor.contains(selection.anchorNode)) {
            editor.focus();
            selection = window.getSelection();
        }
        if (type === 'bold') document.execCommand('bold', false);
        else if (type === 'italic') document.execCommand('italic', false);
        else if (type === 'underline') document.execCommand('underline', false);
        else if (type === 'strike') document.execCommand('strikeThrough', false);
        else if (type === 'h1' || type === 'h2') document.execCommand('formatBlock', false, type.toUpperCase());
        else if (type === 'quote') document.execCommand('formatBlock', false, 'BLOCKQUOTE');
        else if (type === 'code') {
            var range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
            var code = document.createElement('code');
            if (range && !range.collapsed && editor.contains(range.commonAncestorContainer)) {
                code.appendChild(range.extractContents());
                range.insertNode(code);
                range.selectNodeContents(code);
                selection.removeAllRanges(); selection.addRange(range);
            } else {
                document.execCommand('insertHTML', false, '<pre><code>код</code></pre><p><br></p>');
            }
        }
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    };

    window.insertLink = function() {
        var editor = getSelectedPostEditor();
        if (!editor) return;
        var rawUrl = prompt('Введите ссылку (https://…):');
        if (!rawUrl) return;
        var url;
        try { url = new URL(rawUrl.trim()); } catch (_) { alert('Введите полный адрес ссылки, начиная с https://'); return; }
        if (url.protocol !== 'http:' && url.protocol !== 'https:') { alert('Разрешены только ссылки http:// и https://'); return; }
        editor.focus();
        var selection = window.getSelection();
        if (selection && selection.rangeCount && editor.contains(selection.anchorNode) && !selection.isCollapsed) {
            document.execCommand('createLink', false, url.href);
        } else {
            document.execCommand('insertHTML', false, '<a href="' + url.href.replace(/&/g, '&amp;').replace(/\"/g, '&quot;') + '" target="_blank" rel="noopener noreferrer">' + url.hostname + '</a>');
        }
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    };

    document.addEventListener('mousedown', function(event) {
        if (event.target.closest('.editor-toolbar button')) event.preventDefault();
    });

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

        // Входящие диалоги не обязаны быть от друзей. Раньше здесь читался
        // только список друзей, из-за чего уведомление приходило, а сам чат
        // в разделе «Чаты» не показывался.
        db.ref('dms/' + SITE).once('value', function(snap) {
            var rawChats = [];
            snap.forEach(function(chatSnap) {
                var chatId = chatSnap.key || '';
                var participants = chatId.split('_');
                if (participants.indexOf(USER_UID) === -1) return;

                var uid = participants[0] === USER_UID ? participants[1] : participants[0];
                if (!uid) return;

                var messages = chatSnap.child('messages').val() || {};
                var messageIds = Object.keys(messages).sort(function(a, b) {
                    return (messages[b].timestamp || 0) - (messages[a].timestamp || 0);
                });
                var last = messageIds.length ? messages[messageIds[0]] : null;
                var unread = messageIds.filter(function(id) {
                    var message = messages[id];
                    return message.senderUid && message.senderUid !== USER_UID &&
                        (!message.readBy || message.readBy[USER_UID] !== true);
                }).length;
                rawChats.push({ uid: uid, last: last, unread: unread });
            });

            if (!rawChats.length) {
                container.innerHTML = '<div style="color:#bbb;text-align:center;padding:12px;font-size:0.75rem;">💬 Сообщений пока нет</div>';
                return;
            }

            var chats = [];
            var loaded = 0;
            rawChats.forEach(function(chat) {
                db.ref('sites/' + SITE + '/all_users/' + chat.uid).once('value', function(userSnap) {
                    var user = userSnap.val() || {};
                    var name = user.name || 'Аноним';
                    chats.push({
                        uid: chat.uid,
                        name: name,
                        letter: name.charAt(0).toUpperCase(),
                        last: chat.last,
                        unread: chat.unread
                    });

                    loaded++;
                    if (loaded !== rawChats.length) return;

                    chats.sort(function(a, b) {
                        return ((b.last && b.last.timestamp) || 0) - ((a.last && a.last.timestamp) || 0);
                    });
                    container.innerHTML = chats.map(function(item) {
                        var preview = item.last ? item.last.text || '' : 'Нет сообщений';
                        return '<button type="button" class="chat-list-item' + (item.unread ? ' unread' : '') + '" onclick="openPrivateChat(\'' + item.uid + '\');closeChatList();">' +
                            '<span class="avatar-wrap" id="clava-' + item.uid + '"><span class="letter">' + esc(item.letter) + '</span></span>' +
                            '<span class="chat-list-info"><span class="chat-list-name">' + esc(item.name) + '</span>' +
                            '<span class="chat-list-last">' + esc(preview.slice(0, 44)) + '</span></span>' +
                            (item.unread ? '<span class="chat-list-unread">' + (item.unread > 99 ? '99+' : item.unread) + '</span>' : '') +
                            '</button>';
                    }).join('');
                    chats.forEach(function(item) {
                        var avatar = document.getElementById('clava-' + item.uid);
                        if (avatar) renderAvatar(item.uid, avatar, '?');
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
