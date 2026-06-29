// ================================================================
// СОСТОЯНИЕ, УТИЛИТЫ, НАВИГАЦИЯ
// ================================================================

let USER = null;
let USER_UID = null;
let IS_ADMIN = localStorage.getItem('dc_admin_' + SITE) === '1';
let CURRENT_ROOM = null;
let chatUnsub = null;
let VIEWING_USER = null;
let avatarUrlCache = {};
let pendingImage = null;
let pendingImageFile = null;
let EDITING_ID = null;
let showStat = 'friends';
let currentFrameSize = 'small';

// ===== УТИЛИТЫ =====
const esc = s => s ? String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) : '';

// ===== АВАТАРКИ =====
function getUserAvatar(uid, callback) {
    if (avatarUrlCache[uid]) {
        callback(avatarUrlCache[uid]);
        return;
    }
    db.ref('sites/' + SITE + '/users/' + uid + '/avatarUrl').once('value', snap => {
        const url = snap.val() || null;
        avatarUrlCache[uid] = url;
        callback(url);
    });
}

function renderAvatar(uid, container, letter) {
    if (!container) return;
    getUserAvatar(uid, function(url) {
        if (url) {
            container.innerHTML = `<img src="${url}" />`;
        } else {
            container.innerHTML = `<span class="letter">${letter || '?'}</span>`;
        }
    });
}

// ===== UI =====
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
        if (IS_ADMIN) dot.classList.add('active');
        else dot.classList.remove('active');
    } else {
        topAvatar.innerHTML = `<span class="letter">?</span>`;
        sAvatar.innerHTML = `<span class="letter">?</span>`;
        name.textContent = 'Гость';
        sName.textContent = 'Гость';
        dot.classList.remove('active');
    }
}

// ===== АВАТАРКА ПРОФИЛЯ =====
window.uploadAvatar = function() {
    if (!USER_UID) {
        alert('Сначала войдите!');
        return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert('Максимум 5 МБ');
            return;
        }
        const ref = storage.ref('avatars/' + USER_UID + '/' + Date.now() + '_' + file.name);
        ref.put(file).then(snap => snap.ref.getDownloadURL()).then(url => {
            db.ref('sites/' + SITE + '/users/' + USER_UID + '/avatarUrl').set(url);
            db.ref('sites/' + SITE + '/all_users/' + USER_UID + '/avatarUrl').set(url);
            avatarUrlCache[USER_UID] = url;
            updateUI();
            loadProfile();
            loadFeed();
            alert('✅ Аватарка обновлена!');
        });
    };
    input.click();
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

// ===== НАВИГАЦИЯ =====
function setActivePage(pageId) {
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    if (pageId) document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.tab-bar .tab').forEach(el => el.classList.remove('active'));
    const map = { feedPage: 0, groupsPage: 1, peoplePage: 2, profilePage: 3 };
    const tabs = document.querySelectorAll('.tab-bar .tab');
    if (tabs[map[pageId]]) tabs[map[pageId]].classList.add('active');
}

window.goToFeed = function() {
    if (!USER) { alert('Войдите!'); return; }
    setActivePage('feedPage');
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
    setActivePage('groupsPage');
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
    setActivePage('peoplePage');
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
    setActivePage('profilePage');
    document.getElementById('chatView').classList.remove('active');
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    CURRENT_ROOM = null;
    loadProfile();
};

// ===== РАЗМЕР ФРЕЙМА =====
function setFrameSize(size) {
    currentFrameSize = size;
    document.querySelectorAll('.frame-size-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (size === 'small') {
        const btn = document.getElementById('frameSizeSmall');
        if (btn) btn.classList.add('active');
    } else {
        const btn = document.getElementById('frameSizeLarge');
        if (btn) btn.classList.add('active');
    }
}
