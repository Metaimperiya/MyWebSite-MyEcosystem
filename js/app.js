// ================================================================
// УТИЛИТЫ И ОСНОВНЫЕ ФУНКЦИИ
// ================================================================

const esc = s => s ? String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) : '';

function cancelRequest(key) {
    if (activeRequests.has(key)) {
        const fn = activeRequests.get(key);
        if (typeof fn === 'function') fn();
        activeRequests.delete(key);
        return true;
    }
    return false;
}

function safeFirebaseQuery(key, ref, callback) {
    cancelRequest(key);
    let cancelled = false;
    const cancelFn = () => { cancelled = true; activeRequests.delete(key); };
    activeRequests.set(key, cancelFn);
    ref.once('value', snap => {
        if (cancelled) return;
        activeRequests.delete(key);
        callback(snap);
    }).catch(err => {
        if (!cancelled) {
            activeRequests.delete(key);
            console.warn('Query error:', err);
        }
    });
    return cancelFn;
}

function checkAdminAccess(uid) {
    isAdmin = ADMIN_UIDS.includes(uid);
    document.body.classList.toggle('admin-mode', isAdmin);
    return isAdmin;
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
        if (isAdmin) dot.classList.add('active');
        else dot.classList.remove('active');
    } else {
        topAvatar.innerHTML = `<span class="letter">?</span>`;
        sAvatar.innerHTML = `<span class="letter">?</span>`;
        name.textContent = 'Гость';
        sName.textContent = 'Гость';
        dot.classList.remove('active');
    }
}

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
    if (chatUnsub) { if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value'); chatUnsub = null; }
    CURRENT_ROOM = null;
    loadFeed();
};

window.goToGroups = function() {
    if (!USER) { alert('Войдите!'); return; }
    setActivePage('groupsPage');
    document.getElementById('chatView').classList.remove('active');
    if (chatUnsub) { if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value'); chatUnsub = null; }
    CURRENT_ROOM = null;
    loadGroups();
};

window.goToPeople = function() {
    if (!USER) { alert('Войдите!'); return; }
    setActivePage('peoplePage');
    document.getElementById('chatView').classList.remove('active');
    if (chatUnsub) { if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value'); chatUnsub = null; }
    CURRENT_ROOM = null;
    loadPeople();
};

window.goToProfile = function() {
    if (!USER) { alert('Войдите!'); return; }
    viewingProfileUid = null;
    setActivePage('profilePage');
    document.getElementById('chatView').classList.remove('active');
    if (chatUnsub) { if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value'); chatUnsub = null; }
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
