// ================================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ================================================================
const SITE = 'default';
let USER = null;
let USER_UID = null;
let isAdmin = false;
let currentLang = 'ru';
let avatarCache = {};
let CURRENT_ROOM = null;
let chatUnsub = null;

// ================================================================
// ЗАГРУЗКА КОМПОНЕНТОВ С ПОВТОРНЫМ ВЫЗОВОМ updateUI
// ================================================================
function loadComponent(name, containerId) {
    fetch('/components/' + name + '.html')
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        })
        .then(html => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = html;
                console.log('✅ Загружен компонент:', name);
                
                // 👇 ВАЖНО: обновляем UI после загрузки шапки
                if (name === 'topbar' || name === 'sidebar') {
                    setTimeout(() => {
                        updateUI();
                        console.log('🔄 UI обновлён после загрузки', name);
                    }, 50);
                }
                
                // Если есть специфичная инициализация для компонента
                if (name === 'topbar') {
                    initTopbar();
                }
            }
        })
        .catch(err => console.error('❌ Ошибка загрузки компонента:', name, err));
}

// Инициализация после загрузки topbar
function initTopbar() {
    // Навешиваем обработчики на кнопки в шапке
    const chatBtn = document.querySelector('.chat-btn');
    if (chatBtn) {
        chatBtn.onclick = function(e) {
            e.preventDefault();
            openChatList();
        };
    }
    
    const notifBtn = document.querySelector('.notif-btn');
    if (notifBtn) {
        notifBtn.onclick = function(e) {
            e.preventDefault();
            openNotifications();
        };
    }
    
    const dotsBtn = document.querySelector('.menu-dots');
    if (dotsBtn) {
        dotsBtn.onclick = function(e) {
            e.preventDefault();
            toggleSettingsMenu();
        };
    }
    
    // Обновляем бейджи
    updateNotifBadge();
    updateChatBadge();
}

// ================================================================
// ОСНОВНАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ UI (БЕЗОПАСНАЯ)
// ================================================================
function updateUI() {
    console.log('🔄 updateUI вызван, USER:', USER, 'USER_UID:', USER_UID);
    
    // ---- ВЕРХНЯЯ ШАПКА (topbar) ----
    const topAvatar = document.getElementById('topAvatar');
    const topName = document.getElementById('topName');
    const adminDot = document.getElementById('adminDot');
    const chatBadge = document.getElementById('chatBadge');
    const notifBadge = document.getElementById('notifBadge');
    
    if (topAvatar && topName) {
        if (USER && USER_UID) {
            topName.textContent = USER;
            renderAvatar(USER_UID, topAvatar, USER.charAt(0).toUpperCase());
            
            if (adminDot) {
                if (isAdmin) {
                    adminDot.classList.add('active');
                    adminDot.style.display = 'inline-block';
                } else {
                    adminDot.classList.remove('active');
                    adminDot.style.display = 'none';
                }
            }
        } else {
            topName.textContent = 'Гость';
            topAvatar.innerHTML = '<span class="letter">?</span>';
            
            if (adminDot) {
                adminDot.classList.remove('active');
                adminDot.style.display = 'none';
            }
        }
    }
    
    // ---- САЙДБАР (sidebar) ----
    const sAvatar = document.getElementById('sAvatar');
    const sName = document.getElementById('sName');
    
    if (sAvatar && sName) {
        if (USER && USER_UID) {
            sName.textContent = USER;
            renderAvatar(USER_UID, sAvatar, USER.charAt(0).toUpperCase());
        } else {
            sName.textContent = 'Гость';
            sAvatar.innerHTML = '<span class="letter">?</span>';
        }
    }
    
    // ---- АДМИН-МЕНЮ ----
    updateAdminMenu();
    
    // ---- БЕЙДЖИКИ ----
    if (chatBadge) {
        updateChatBadge();
    }
    if (notifBadge) {
        updateNotifBadge();
    }
    
    // ---- ПЕРЕВОД ----
    setTimeout(() => {
        if (typeof translatePage === 'function') {
            translatePage();
        }
        updateLangDisplay();
    }, 100);
}

// ================================================================
// АВАТАРКИ (С КЕШЕМ)
// ================================================================
function getUserAvatar(uid, callback) {
    if (avatarCache && avatarCache[uid]) {
        callback(avatarCache[uid]);
        return;
    }
    
    if (!uid) {
        callback(null);
        return;
    }
    
    db.ref('sites/' + SITE + '/users/' + uid + '/avatarUrl').once('value')
        .then(snap => {
            const url = snap.val() || null;
            if (!avatarCache) avatarCache = {};
            avatarCache[uid] = url;
            callback(url);
        })
        .catch(() => callback(null));
}

function renderAvatar(uid, container, letter) {
    if (!container) return;
    if (!uid) {
        container.innerHTML = '<span class="letter">' + (letter || '?') + '</span>';
        return;
    }
    
    getUserAvatar(uid, function(url) {
        if (url) {
            container.innerHTML = '<img src="' + url + '" alt="аватар" />';
        } else {
            container.innerHTML = '<span class="letter">' + (letter || '?') + '</span>';
        }
    });
}

// ================================================================
// НАВИГАЦИЯ
// ================================================================
function setActivePage(pageId) {
    document.querySelectorAll('.page').forEach(el => {
        el.classList.remove('active');
    });
    
    if (pageId) {
        const el = document.getElementById('page-' + pageId);
        if (el) el.classList.add('active');
    }
    
    document.querySelectorAll('.tab-bar .tab').forEach(el => {
        el.classList.remove('active');
    });
    
    const tabs = document.querySelectorAll('.tab-bar .tab');
    const map = { feed: 0, groups: 1, people: 2, profile: 3 };
    if (tabs[map[pageId]]) {
        tabs[map[pageId]].classList.add('active');
    }
}

// ================================================================
// КНОПКИ НАВИГАЦИИ
// ================================================================
window.goToFeed = function() {
    if (!USER) {
        openLoginModal();
        return;
    }
    window.location.href = '/';
};

window.goToProfile = function() {
    if (!USER) {
        openLoginModal();
        return;
    }
    if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
        window.location.href = '/?page=profile';
        return;
    }
    VIEWING_USER = null;
    setActivePage('profile');
    document.getElementById('chatView')?.classList.remove('active');
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    CURRENT_ROOM = null;
    if (typeof loadProfile === 'function') loadProfile();
};

window.goToPeople = function() {
    if (!USER) {
        openLoginModal();
        return;
    }
    if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
        window.location.href = '/?page=people';
        return;
    }
    setActivePage('people');
    document.getElementById('chatView')?.classList.remove('active');
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    CURRENT_ROOM = null;
    if (typeof loadPeople === 'function') loadPeople();
};

window.goToGroups = function() {
    if (!USER) {
        openLoginModal();
        return;
    }
    if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
        window.location.href = '/?page=groups';
        return;
    }
    setActivePage('groups');
    document.getElementById('chatView')?.classList.remove('active');
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    CURRENT_ROOM = null;
    if (typeof loadGroups === 'function') loadGroups();
};

window.goToHome = function() {
    if (!USER) {
        openLoginModal();
        return;
    }
    window.location.href = '/';
};

function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('open');
}

// ================================================================
// САЙДБАР
// ================================================================
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
};

window.closeSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
};

// ================================================================
// АДМИН-МЕНЮ
// ================================================================
function updateAdminMenu() {
    const item = document.getElementById('adminChatsMenuItem');
    if (item) {
        item.style.display = isAdmin ? 'block' : 'none';
    }
}

window.openAdminChats = function() {
    if (!isAdmin) {
        alert('Только для администратора!');
        return;
    }
    const modal = document.getElementById('adminChatsModal');
    if (modal) modal.classList.add('open');
    loadAdminChats();
};

window.closeAdminChats = function() {
    const modal = document.getElementById('adminChatsModal');
    if (modal) modal.classList.remove('open');
};

function loadAdminChats() {
    const container = document.getElementById('adminChatsList');
    if (!container) return;
    
    container.innerHTML = '<div style="color:#bbb;text-align:center;padding:12px;font-size:0.75rem;">⏳ Загрузка...</div>';
    
    db.ref('dms/' + SITE).once('value', snap => {
        const dms = snap.val() || {};
        const chatIds = Object.keys(dms);
        
        if (!chatIds.length) {
            container.innerHTML = '<div style="color:#bbb;text-align:center;padding:12px;font-size:0.75rem;">Нет личных чатов</div>';
            return;
        }
        
        let html = '';
        let loaded = 0;
        
        chatIds.forEach(chatId => {
            const uids = chatId.split('_');
            const promises = uids.map(uid => 
                db.ref('sites/' + SITE + '/users/' + uid + '/name').once('value')
            );
            
            Promise.all(promises).then(results => {
                const names = results.map(r => r.val() || 'Аноним');
                const chatName = names.join(' ⬄ ');
                const path = 'dms/' + SITE + '/' + chatId + '/messages';
                
                db.ref(path).once('value', msgSnap => {
                    const count = msgSnap.numChildren();
                    let lastMsg = '';
                    msgSnap.orderByChild('timestamp').limitToLast(1).forEach(m => {
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
    const path = 'dms/' + SITE + '/' + chatId + '/messages';
    closeAdminChats();
    CURRENT_ROOM = chatId;
    document.getElementById('chatView')?.classList.add('active');
    setActivePage(null);
    loadChat(path);
};

// ================================================================
// СПИСОК ЧАТОВ
// ================================================================
window.openChatList = function() {
    if (!USER_UID) {
        alert('Войдите!');
        return;
    }
    const modal = document.getElementById('chatListModal');
    if (modal) modal.classList.add('open');
    loadChatList();
};

window.closeChatList = function() {
    const modal = document.getElementById('chatListModal');
    if (modal) modal.classList.remove('open');
};

function loadChatList() {
    const container = document.getElementById('chatListContainer');
    if (!container) return;
    
    container.innerHTML = '<div style="color:#bbb;text-align:center;padding:12px;font-size:0.75rem;">⏳ Загрузка...</div>';
    
    db.ref('sites/' + SITE + '/friends/' + USER_UID).once('value', snap => {
        const friends = snap.val() || {};
        const friendIds = Object.keys(friends).filter(k => friends[k] === true);
        
        if (!friendIds.length) {
            container.innerHTML = '<div style="color:#bbb;text-align:center;padding:12px;font-size:0.75rem;">🤝 Добавьте друзей, чтобы начать общение</div>';
            return;
        }
        
        let html = '';
        let loaded = 0;
        
        friendIds.forEach(uid => {
            db.ref('sites/' + SITE + '/users/' + uid).once('value', usnap => {
                const u = usnap.val() || {};
                const name = u.name || 'Аноним';
                const letter = name.charAt(0).toUpperCase();
                
                const chatId = [USER_UID, uid].sort().join('_');
                const path = 'dms/' + SITE + '/' + chatId + '/messages';
                
                db.ref(path).orderByChild('timestamp').limitToLast(1).once('value', msgSnap => {
                    let lastMsg = '';
                    msgSnap.forEach(m => {
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
                        friendIds.forEach(k => {
                            const el = document.getElementById('clava-' + k);
                            if (el) renderAvatar(k, el, '?');
                        });
                    }
                });
            });
        });
    });
}

// ================================================================
// БЕЙДЖИКИ
// ================================================================
function updateNotifBadge() {
    if (!USER_UID) return;
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    
    db.ref('sites/' + SITE + '/notifications/' + USER_UID)
        .orderByChild('read').equalTo(false)
        .once('value', snap => {
            const count = snap.numChildren();
            if (count > 0) {
                badge.style.display = 'inline';
                badge.textContent = count;
            } else {
                badge.style.display = 'none';
            }
        });
}

function updateChatBadge() {
    const badge = document.getElementById('chatBadge');
    if (!badge) return;
    if (!USER_UID) {
        badge.style.display = 'none';
        return;
    }
    
    // Проверяем непрочитанные сообщения
    db.ref('dms/' + SITE).once('value', snap => {
        const dms = snap.val() || {};
        let unread = 0;
        let checked = 0;
        const keys = Object.keys(dms);
        
        if (!keys.length) {
            badge.style.display = 'none';
            return;
        }
        
        keys.forEach(chatId => {
            if (!chatId.includes(USER_UID)) {
                checked++;
                if (checked === keys.length) {
                    if (unread > 0) {
                        badge.style.display = 'inline';
                        badge.textContent = unread;
                    } else {
                        badge.style.display = 'none';
                    }
                }
                return;
            }
            
            db.ref('dms/' + SITE + '/' + chatId + '/messages')
                .orderByChild('read').equalTo(false)
                .once('value', msgSnap => {
                    msgSnap.forEach(msg => {
                        const val = msg.val();
                        if (val && val.from !== USER_UID) {
                            unread++;
                        }
                    });
                    
                    checked++;
                    if (checked === keys.length) {
                        if (unread > 0) {
                            badge.style.display = 'inline';
                            badge.textContent = unread;
                        } else {
                            badge.style.display = 'none';
                        }
                    }
                });
        });
    });
}

// ================================================================
// НАБОР ТЕКСТА
// ================================================================
let typingTimeout = null;

function setupTypingIndicator(chatId) {
    const typingRef = db.ref('dms/' + SITE + '/' + chatId + '/typing');
    const input = document.getElementById('chatInput');
    if (!input) return;
    
    if (window._typingHandler) {
        input.removeEventListener('keydown', window._typingHandler);
    }
    
    window._typingHandler = function() {
        typingRef.set({ [USER_UID]: true });
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            typingRef.set(null);
        }, 2000);
    };
    input.addEventListener('keydown', window._typingHandler);
    
    typingRef.on('value', snap => {
        const data = snap.val() || {};
        const isTyping = Object.keys(data).some(key => {
            return data[key] === true && key !== USER_UID;
        });
        
        const indicator = document.getElementById('typingIndicator');
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
// ЯЗЫК
// ================================================================
window.toggleLanguage = function() {
    const newLang = currentLang === 'ru' ? 'en' : 'ru';
    setLanguage(newLang);
};

function updateLangDisplay() {
    const display = document.getElementById('langDisplay');
    if (display) {
        display.textContent = currentLang === 'ru' ? 'Русский' : 'English';
    }
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('language', lang);
    updateLangDisplay();
    if (typeof translatePage === 'function') {
        translatePage();
    }
}

// ================================================================
// НАСТРОЙКИ (меню с тремя точками)
// ================================================================
window.toggleSettingsMenu = function() {
    const menu = document.getElementById('settingsMenu');
    if (menu) {
        menu.classList.toggle('open');
    }
};

// Закрываем меню при клике вне его
document.addEventListener('click', function(e) {
    const menu = document.getElementById('settingsMenu');
    const dots = document.querySelector('.menu-dots');
    if (menu && dots && !menu.contains(e.target) && !dots.contains(e.target)) {
        menu.classList.remove('open');
    }
});

// ================================================================
// УВЕДОМЛЕНИЯ
// ================================================================
window.openNotifications = function() {
    if (!USER_UID) {
        alert('Войдите!');
        return;
    }
    // Открываем модалку с уведомлениями
    const modal = document.getElementById('notificationsModal');
    if (modal) {
        modal.classList.add('open');
        loadNotifications();
    }
};

function loadNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    container.innerHTML = '<div style="color:#bbb;text-align:center;padding:12px;">⏳ Загрузка...</div>';
    
    db.ref('sites/' + SITE + '/notifications/' + USER_UID)
        .orderByChild('timestamp').limitToLast(50)
        .once('value', snap => {
            const notifs = snap.val() || {};
            const keys = Object.keys(notifs);
            
            if (!keys.length) {
                container.innerHTML = '<div style="color:#bbb;text-align:center;padding:12px;">Нет уведомлений</div>';
                return;
            }
            
            let html = '';
            keys.reverse().forEach(key => {
                const n = notifs[key];
                html += '<div class="notif-item' + (n.read ? '' : ' unread') + '">';
                html += '<div class="notif-text">' + esc(n.text || '') + '</div>';
                html += '<div class="notif-time">' + (n.time || '') + '</div>';
                html += '</div>';
                
                // Отмечаем как прочитанное
                if (!n.read) {
                    db.ref('sites/' + SITE + '/notifications/' + USER_UID + '/' + key + '/read').set(true);
                }
            });
            
            container.innerHTML = html;
            updateNotifBadge();
        });
}

// ================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ================================================================
function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ================================================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM загружен');
    
    // Загружаем сохранённый язык
    const savedLang = localStorage.getItem('language') || 'ru';
    currentLang = savedLang;
    
    // Загружаем компоненты
    loadComponent('topbar', 'topbar-container');
    loadComponent('sidebar', 'sidebar-container');
    
    // Пытаемся обновить UI сразу (если данные уже есть)
    setTimeout(() => {
        updateUI();
    }, 100);
});

// ================================================================
// АВТООБНОВЛЕНИЕ UI ПРИ ПОЯВЛЕНИИ ЭЛЕМЕНТОВ В DOM
// ================================================================
const uiObserver = new MutationObserver(function(mutations) {
    let shouldUpdate = false;
    
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
                // Проверяем, не появилась ли шапка или сайдбар
                if (node.id === 'topbar' || 
                    node.id === 'sidebar' ||
                    node.querySelector('#topName') ||
                    node.querySelector('#sName')) {
                    shouldUpdate = true;
                }
            }
        });
    });
    
    if (shouldUpdate) {
        console.log('🔄 DOM изменился, обновляем UI');
        setTimeout(() => updateUI(), 50);
    }
});

// Начинаем следить за изменениями
uiObserver.observe(document.body, {
    childList: true,
    subtree: true
});

// ================================================================
// ОБНОВЛЯЕМ UI КАЖДЫЕ 5 СЕКУНД (для бейджиков)
// ================================================================
setInterval(() => {
    updateNotifBadge();
    updateChatBadge();
}, 5000);

console.log('✅ app.js полностью загружен');
