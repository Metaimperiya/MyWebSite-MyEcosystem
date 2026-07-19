// ================================================================ */
// ОСНОВНЫЕ ФУНКЦИИ ПРИЛОЖЕНИЯ
// ================================================================ */

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

    // ================================================================ */
    // НАСТРОЙКИ (ВЫПАДАЮЩЕЕ МЕНЮ)
    // ================================================================ */

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
        if (!e.target.closest('.topbar .right') && !e.target.closest('#settingsDropdown')) {
            dropdown.classList.remove('open');
        }
    });

    // ================================================================ */
    // ОБНОВЛЕНИЕ UI
    // ================================================================ */

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

    // ================================================================ */
    // АВАТАРКИ
    // ================================================================ */

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
                container.innerHTML = '<img src="' + url + '" />';
            } else {
                container.innerHTML = '<span class="letter">' + (letter || '?') + '</span>';
            }
        });
    };

    // ================================================================ */
    // НАВИГАЦИЯ
    // ================================================================ */

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

    // ================================================================ */
    // САЙДБАР
    // ================================================================ */

    window.toggleSidebar = function() {
        if (!window.checkAccess()) return;
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('overlay').classList.toggle('show');
    };

    window.closeSidebar = function() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('show');
    };

    // ================================================================ */
    // РЕДАКТОР
    // ================================================================ */

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

    // ================================================================ */
    // ОТКРЫТИЕ СТРАНИЦ (SPA)
    // ================================================================ */

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

    // ================================================================ */
    // updateNotifBadge — ОБНОВЛЕНИЕ БЕЙДЖА УВЕДОМЛЕНИЙ
    // ================================================================ */

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

    // ================================================================ */
    // ИНИЦИАЛИЗАЦИЯ
    // ================================================================ */

    setTimeout(function() {
        if (typeof updateUI === 'function') updateUI();
        if (typeof updateNotifBadge === 'function') updateNotifBadge();
    }, 500);

    setInterval(function() {
        if (typeof updateNotifBadge === 'function') updateNotifBadge();
    }, 5000);

    // ЕСЛИ НЕТ ПОЛЬЗОВАТЕЛЯ — ПОКАЗЫВАЕМ ВХОД
    if (typeof USER_UID === 'undefined' || !USER_UID) {
        var mainContainer = document.getElementById('mainContainer');
        if (mainContainer) mainContainer.style.display = 'none';
        var loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.add('open');
    }

    console.log('✅ app.js загружен!');
});

// ================================================================ */
// ФУНКЦИЯ ОБНОВЛЕНИЯ ТОП-БАРА
// ================================================================ */

function updatePcTopbar() {
    var pcAvatar = document.getElementById('pcAvatar');
    var pcName = document.getElementById('pcName');
    var sAvatar = document.getElementById('sAvatar');
    var sName = document.getElementById('sName');
    var sEmail = document.getElementById('sEmail');

    if (USER && USER_UID) {
        db.ref('sites/' + SITE + '/users/' + USER_UID + '/name').once('value', function(snap) {
            var dbName = snap.val() || USER;
            if (pcName) pcName.textContent = dbName;
            if (sName) sName.textContent = dbName;
        });

        db.ref('sites/' + SITE + '/users/' + USER_UID + '/avatarUrl').once('value', function(snap) {
            var avatarUrl = snap.val();
            var letter = (USER || '?').charAt(0).toUpperCase();

            if (pcAvatar) {
                if (avatarUrl) {
                    pcAvatar.innerHTML = '<img src="' + avatarUrl + '" />';
                } else {
                    pcAvatar.innerHTML = '<span class="letter">' + letter + '</span>';
                }
            }

            if (sAvatar) {
                if (avatarUrl) {
                    sAvatar.innerHTML = '<img src="' + avatarUrl + '" />';
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
