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
    } else {
        topAvatar.innerHTML = '<span class="letter">?</span>';
        sAvatar.innerHTML = '<span class="letter">?</span>';
        name.textContent = 'Гость';
        sName.textContent = 'Гость';
        dot.classList.remove('active');
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

// ===== НАВИГАЦИЯ ПО СТРАНИЦАМ =====

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

window.goToFeed = function() {
    if (!USER) { alert('Войдите!'); return; }
    setActivePage('feed');
    document.getElementById('chatView').classList.remove('active');
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    CURRENT_ROOM = null;
    loadFeed();
};

window.goToGroups = function() {
    if (!USER) { alert('Войдите!'); return; }
    setActivePage('groups');
    document.getElementById('chatView').classList.remove('active');
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    CURRENT_ROOM = null;
    loadGroups();
};

window.goToPeople = function() {
    if (!USER) { alert('Войдите!'); return; }
    setActivePage('people');
    document.getElementById('chatView').classList.remove('active');
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    CURRENT_ROOM = null;
    loadPeople();
};

window.goToProfile = function() {
    if (!USER) { alert('Войдите!'); return; }
    VIEWING_USER = null;
    setActivePage('profile');
    document.getElementById('chatView').classList.remove('active');
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    CURRENT_ROOM = null;
    loadProfile();
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

// ================================================================
// АККОРДЕОН В САЙДБАРЕ (НОВАЯ ФУНКЦИЯ)
// ================================================================

window.toggleAccordion = function(header) {
    var item = header.parentElement;
    var body = item.querySelector('.accordion-body');
    var arrow = header.querySelector('.accordion-arrow');
    
    if (body.style.maxHeight) {
        // Закрываем
        body.style.maxHeight = null;
        body.style.padding = '0 16px';
        if (arrow) arrow.textContent = '▾';
    } else {
        // Открываем
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
