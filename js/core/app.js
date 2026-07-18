// ================================================================
// ОСНОВНЫЕ ФУНКЦИИ ПРИЛОЖЕНИЯ
// ================================================================

// Проверяем, что SITE определён
if (typeof SITE === 'undefined') {
    var SITE = 'www_metaimperiya_com'; // Твой SITE из firebase.js
    console.warn('⚠️ SITE не был определён, установлено значение по умолчанию:', SITE);
} else {
    console.log('✅ SITE определён:', SITE);
}

document.addEventListener('DOMContentLoaded', function() {

    // ===== ШЛАГБАУМ — ПРОВЕРКА ДОСТУПА =====
    window.checkAccess = function() {
        if (typeof USER_UID === 'undefined' || !USER_UID) {
            var loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.add('open');
            console.log('⛔ Шлагбаум закрыт! Гость, иди нахуй!');
            return false;
        }
        console.log('✅ Шлагбаум открыт! Проходи, братан!');
        return true;
    };

    // ===== ДЕБАГ-ФУНКЦИЯ =====
    window.debugDatabaseConnection = function() {
        if (!USER_UID) {
            console.warn("⛔ DEBUG: Пользователь не авторизован, база не будет грузиться.");
            return;
        }

        const testPath = 'sites/' + SITE + '/users/' + USER_UID;
        console.log("🔍 DEBUG: Пробую прочитать путь:", testPath);

        db.ref(testPath).once('value')
            .then(function(snapshot) {
                if (snapshot.exists()) {
                    console.log("✅ DEBUG: Данные в базе найдены:", snapshot.val());
                } else {
                    console.error("❌ DEBUG: ОШИБКА! В базе данных по пути " + testPath + " НИЧЕГО НЕТ.");
                }
            })
            .catch(function(error) {
                console.error("❌ DEBUG: ОШИБКА ДОСТУПА К БАЗЕ:", error);
            });
    };

    // ================================================================
    // НАСТРОЙКИ (ВЫПАДАЮЩЕЕ МЕНЮ)
    // ================================================================

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

    // ЗАКРЫВАЕМ МЕНЮ ПРИ КЛИКЕ ВНЕ ЕГО
    document.addEventListener('click', function(e) {
        var dropdown = document.getElementById('settingsDropdown');
        if (!dropdown) return;
        if (!e.target.closest('.topbar .right') && !e.target.closest('#settingsDropdown')) {
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

            setTimeout(window.debugDatabaseConnection, 1000);
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
        db.ref('sites/' + SITE + '/users/' + uid + '/avatarUrl').once('value', function(snap) {
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
    };

    // ===== КНОПКА "ГЛАВНАЯ" =====
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
        if (typeof loadFeed === 'function') loadFeed();
    };

    // ===== ПЕРЕХОД В ПРОФИЛЬ (SPA) =====
    window.goToProfile = function() {
        if (!window.checkAccess()) return;

        if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
            window.location.href = '/?page=profile';
            return;
        }

        VIEWING_USER = null;
        window.setActivePage('profile');
        document.getElementById('chatView').classList.remove('active');
        if (chatUnsub) {
            if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
            chatUnsub = null;
        }
        CURRENT_ROOM = null;
        if (typeof loadProfile === 'function') loadProfile();
    };

    // ===== ПРОСМОТР ПРОФИЛЯ ДРУГОГО ПОЛЬЗОВАТЕЛЯ (SPA) =====
    window.viewUserProfile = function(uid) {
        if (!window.checkAccess()) return;

        if (uid === USER_UID) {
            goToProfile();
            return;
        }

        VIEWING_USER = uid;

        db.ref('sites/' + SITE + '/users/' + uid + '/slug').once('value', function(snap) {
            var slug = snap.val();

            if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
                if (slug) {
                    window.location.href = '/' + slug + '/';
                } else {
                    window.location.href = '/?page=profile&user=' + uid;
                }
                return;
            }

            if (window.history && window.history.pushState) {
                if (slug) {
                    window.history.pushState({}, '', '/' + slug + '/');
                } else {
                    window.history.pushState({}, '', '/?page=profile&user=' + uid);
                }
            }

            window.setActivePage('profile');
            document.getElementById('chatView').classList.remove('active');

            if (chatUnsub) {
                if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
                chatUnsub = null;
            }
            CURRENT_ROOM = null;

            if (typeof loadProfile === 'function') loadProfile();
        });
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
    // ОТКРЫТИЕ СТРАНИЦ (SPA)
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

    // ЕСЛИ НЕТ ПОЛЬЗОВАТЕЛЯ — СКРЫВАЕМ ВСЁ
    if (typeof USER_UID === 'undefined' || !USER_UID) {
        var mainContainer = document.getElementById('mainContainer');
        if (mainContainer) mainContainer.style.display = 'none';
        var loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.add('open');
    }

    // Проверяем URL-параметры при загрузке
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

    console.log('✅ app.js загружен с жесткой проверкой доступа! SITE =', SITE);

});

// ================================================================
// updateNotifBadge — ОБНОВЛЕНИЕ БЕЙДЖА УВЕДОМЛЕНИЙ
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
// ОБНОВЛЕНИЕ ТОП-БАРА (АВАТАРКА + НИКНЕЙМ)
// ================================================================

function updatePcTopbar() {
    var pcAvatar = document.getElementById('pcAvatar');
    var pcName = document.getElementById('pcName');
    var sAvatar = document.getElementById('sAvatar');
    var sName = document.getElementById('sName');
    var sEmail = document.getElementById('sEmail');

    console.log('🔄 updatePcTopbar вызвана! USER =', USER, 'USER_UID =', USER_UID, 'SITE =', SITE);

    if (USER && USER_UID) {
        // Загружаем имя
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

        // Загружаем аватарку
        db.ref('sites/' + SITE + '/users/' + USER_UID + '/avatarUrl').once('value', function(snap) {
            var avatarUrl = snap.val();
            var letter = (USER || '?').charAt(0).toUpperCase();

            if (pcAvatar) {
                if (avatarUrl) {
                    pcAvatar.innerHTML = '<img src="' + avatarUrl + '" alt="аватар" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />';
                    console.log('✅ Аватарка в топ-баре обновлена (URL)');
                } else {
                    pcAvatar.innerHTML = '<span class="letter">' + letter + '</span>';
                    console.log('✅ Аватарка в топ-баре обновлена (буква)');
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

        // Загружаем email
        if (sEmail) {
            db.ref('sites/' + SITE + '/users/' + USER_UID + '/email').once('value', function(snap) {
                sEmail.textContent = snap.val() || '';
            });
        }
    } else {
        // Если пользователь не залогинен
        if (pcAvatar) pcAvatar.innerHTML = '<span class="letter">?</span>';
        if (pcName) pcName.textContent = '';
        if (sAvatar) sAvatar.innerHTML = '<span class="letter">?</span>';
        if (sName) sName.textContent = 'Гость';
        if (sEmail) sEmail.textContent = '';
        console.log('⚠️ Пользователь не залогинен, топ-бар очищен');
    }
}

// ================================================================
// ФУНКЦИЯ ДЛЯ ОБНОВЛЕНИЯ ЯЗЫКА
// ================================================================

function updateLangDisplay() {
    var display = document.getElementById('langDisplay');
    if (display) {
        display.textContent = currentLang === 'ru' ? 'Русский' : 'English';
    }
}

// ================================================================
// ПРИНУДИТЕЛЬНЫЙ ВЫЗОВ updatePcTopbar ПОСЛЕ ЗАГРУЗКИ
// ================================================================

// Вызываем сразу после загрузки страницы
setTimeout(function() {
    console.log('🔄 Принудительный вызов updatePcTopbar()');
    updatePcTopbar();
}, 1000);

// Вызываем после авторизации
if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(function(user) {
        setTimeout(function() {
            console.log('🔄 Авторизация изменилась, обновляем топ-бар');
            updatePcTopbar();
            if (typeof updateUI === 'function') updateUI();
        }, 500);
    });
}

// Вызываем после каждого переключения страницы
document.addEventListener('click', function() {
    setTimeout(function() {
        updatePcTopbar();
    }, 300);
});

console.log('✅ app.js загружен! SITE =', SITE);
