// ===== УТИЛИТЫ =====
function esc(s) { return s ? String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])) : ''; }

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

// ===== АДМИН-ПРОВЕРКА =====
function checkAdminAccess(uid) {
    isAdmin = ADMIN_UIDS.includes(uid);
    document.body.classList.toggle('admin-mode', isAdmin);
    return isAdmin;
}

// ===== ТЁМНАЯ ТЕМА =====
let darkTheme = localStorage.getItem('dc_theme_'+SITE) === 'dark';
function toggleTheme() {
    darkTheme = !darkTheme;
    document.body.classList.toggle('dark', darkTheme);
    localStorage.setItem('dc_theme_'+SITE, darkTheme ? 'dark' : 'light');
    document.querySelector('.theme-toggle').textContent = darkTheme ? '☀️' : '🌙';
}
if (darkTheme) { document.body.classList.add('dark'); document.querySelector('.theme-toggle').textContent = '☀️'; }

// ===== AUTH =====
auth.onAuthStateChanged(user => {
    if (user) {
        if (!USER_UID) {
            USER_UID = user.uid;
            USER = user.displayName || user.email || user.uid.slice(0,8);
            localStorage.setItem('dc_u_'+SITE, USER);
            checkAdminAccess(USER_UID);
            saveProfileToList(USER_UID, USER, user.email, user.photoURL);
            const data = { name: USER, email: user.email || 'anon', uid: USER_UID, lastLogin: Date.now(), avatarUrl: user.photoURL || null };
            db.ref('sites/'+SITE+'/users/'+USER_UID).update(data);
            db.ref('sites/'+SITE+'/all_users/'+USER_UID).set(data);
            if (isAdmin) db.ref('sites/'+SITE+'/users/'+USER_UID+'/isAdmin').set(true);
        }
        document.getElementById('loginModal').classList.remove('open');
        updateUI();
        loadData();
        navigateToFeed();
        loadNotifications();
    } else {
        USER = null; USER_UID = null; avatarCache = null; isAdmin = false;
        document.body.classList.remove('admin-mode');
        if (notifUnsub) { notifUnsub(); notifUnsub = null; }
        Object.values(friendListeners).forEach(fn => { if (typeof fn === 'function') fn(); });
        friendListeners = {};
        document.getElementById('loginModal').classList.add('open');
        loadSavedProfiles();
        updateUI();
    }
});

document.getElementById('googleBtn').addEventListener('click', () => {
    auth.signInWithPopup(provider).catch(e => {
        if (e.code === 'auth/popup-blocked') auth.signInWithRedirect(provider);
        else alert('Ошибка: '+e.message);
    });
});

function loginName() {
    const name = document.getElementById('nameInput').value.trim();
    if (!name) { alert('Введите имя'); return; }
    auth.signInAnonymously().then(() => {
        USER = name;
        USER_UID = 'anon_'+Date.now();
        localStorage.setItem('dc_u_'+SITE, USER);
        const data = { name: USER, email: 'anon_'+Date.now()+'@anon.com', uid: USER_UID, lastLogin: Date.now() };
        db.ref('sites/'+SITE+'/users/'+USER_UID).update(data);
        db.ref('sites/'+SITE+'/all_users/'+USER_UID).set(data);
        saveProfileToList(USER_UID, USER, data.email);
        document.getElementById('loginModal').classList.remove('open');
        updateUI();
        loadData();
        navigateToFeed();
        loadNotifications();
    }).catch(e => alert('Ошибка: '+e.message));
}

function logout() {
    if (!confirm('Выйти?')) return;
    closeContextMenu();
    if (notifUnsub) { notifUnsub(); notifUnsub = null; }
    Object.values(friendListeners).forEach(fn => { if (typeof fn === 'function') fn(); });
    friendListeners = {};
    auth.signOut().then(() => {
        localStorage.removeItem('dc_u_'+SITE);
        USER = null; USER_UID = null; avatarCache = null; isAdmin = false;
        document.body.classList.remove('admin-mode');
        document.getElementById('loginModal').classList.add('open');
        loadSavedProfiles();
        navigateToFeed();
    });
}

// ===== СОХРАНЕННЫЕ ПРОФИЛИ =====
function loadSavedProfiles() {
    try {
        SAVED_PROFILES = JSON.parse(localStorage.getItem('dc_profiles_'+SITE) || '[]');
    } catch(e) { SAVED_PROFILES = []; }
    renderSavedProfiles();
}

function saveProfileToList(uid, name, email, avatarUrl) {
    const existing = SAVED_PROFILES.find(p => p.uid === uid);
    if (!existing) {
        SAVED_PROFILES.push({ uid, name, email: email || 'anon', avatarUrl: avatarUrl || null, lastUsed: Date.now() });
    } else {
        existing.name = name;
        existing.email = email || 'anon';
        existing.avatarUrl = avatarUrl || null;
        existing.lastUsed = Date.now();
    }
    localStorage.setItem('dc_profiles_'+SITE, JSON.stringify(SAVED_PROFILES));
    renderSavedProfiles();
}

function renderSavedProfiles() {
    const container = document.getElementById('profileSelector');
    if (!container) return;
    if (!SAVED_PROFILES.length) {
        container.innerHTML = '<div style="color:#65676b;text-align:center;padding:8px;font-size:13px;">Нет сохраненных профилей</div>';
        return;
    }
    const sorted = [...SAVED_PROFILES].sort((a,b) => (b.lastUsed||0) - (a.lastUsed||0));
    container.innerHTML = sorted.map(p => {
        const letter = (p.name || '?').charAt(0).toUpperCase();
        const avatarHtml = p.avatarUrl ? `<img src="${p.avatarUrl}">` : `<span>${letter}</span>`;
        return `
            <div class="profile-option" onclick="loginWithSavedProfile('${p.uid}')">
                <div class="avatar">${avatarHtml}</div>
                <div class="info"><div class="name">${p.name || 'Аноним'}</div><div class="email">${p.email || ''}</div></div>
                <button class="remove-btn" onclick="event.stopPropagation();removeSavedProfile('${p.uid}')">✕</button>
            </div>
        `;
    }).join('');
}

function removeSavedProfile(uid) {
    if (!confirm('Удалить сохраненный профиль?')) return;
    SAVED_PROFILES = SAVED_PROFILES.filter(p => p.uid !== uid);
    localStorage.setItem('dc_profiles_'+SITE, JSON.stringify(SAVED_PROFILES));
    renderSavedProfiles();
}

function loginWithSavedProfile(uid) {
    const profile = SAVED_PROFILES.find(p => p.uid === uid);
    if (!profile) return;
    auth.signInAnonymously().then(() => {
        USER = profile.name;
        USER_UID = uid;
        localStorage.setItem('dc_u_'+SITE, USER);
        const data = { name: profile.name, email: profile.email || 'anon', uid: uid, lastLogin: Date.now(), avatarUrl: profile.avatarUrl || null };
        db.ref('sites/'+SITE+'/users/'+uid).update(data);
        db.ref('sites/'+SITE+'/all_users/'+uid).set(data);
        profile.lastUsed = Date.now();
        localStorage.setItem('dc_profiles_'+SITE, JSON.stringify(SAVED_PROFILES));
        document.getElementById('loginModal').classList.remove('open');
        updateUI();
        loadData();
        navigateToFeed();
        loadNotifications();
    }).catch(e => alert('Ошибка: '+e.message));
}

// ===== UI =====
function updateUI() {
    const avatar = document.getElementById('headerAvatar');
    if (!avatar) return;
    if (USER && USER_UID) {
        if (avatarCache === 'default' || !avatarCache) {
            avatar.innerHTML = `<span>${USER.charAt(0).toUpperCase()}</span>`;
        } else if (avatarCache && avatarCache !== 'default') {
            avatar.innerHTML = `<img src="${avatarCache}">`;
        }
        if (!avatarCache) {
            safeFirebaseQuery('avatar', db.ref('sites/'+SITE+'/users/'+USER_UID+'/avatarUrl'), snap => {
                const url = snap.val();
                avatarCache = url || 'default';
                updateUI();
            });
        }
    } else {
        avatar.innerHTML = '<span>?</span>';
    }
}

// ===== НАВИГАЦИЯ =====
function navigateToFeed() {
    viewingProfileUid = null;
    activeStatToggle = null;
    document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
    document.getElementById('feedPage').classList.remove('hidden');
    document.getElementById('feedPage').classList.add('active');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab')[0].classList.add('active');
    currentTab = 'feed';
    loadFeed();
}

function showTab(tab) {
    if (viewingProfileUid) { navigateToFeed(); setTimeout(() => showTabInternal(tab), 100); return; }
    showTabInternal(tab);
}

function showTabInternal(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => {
        const txt = t.textContent.trim();
        if ((tab === 'feed' && txt.includes('Лента')) ||
            (tab === 'groups' && txt.includes('Группы')) ||
            (tab === 'people' && txt.includes('Люди'))) t.classList.add('active');
    });
    document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
    const pageMap = { feed:'feedPage', groups:'groupsPage', people:'peoplePage' };
    const page = document.getElementById(pageMap[tab]);
    if (page) { page.classList.remove('hidden'); page.classList.add('active'); }
    viewingProfileUid = null;
    activeStatToggle = null;
    if (tab === 'feed') loadFeed();
    if (tab === 'groups') loadRooms();
    if (tab === 'people') loadPeople();
}

function navigateToProfile(uid) {
    if (!USER_UID) { alert('Войдите!'); return; }
    if (!uid) return;
    viewingProfileUid = uid;
    activeStatToggle = null;
    document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
    document.getElementById('profilePage').classList.remove('hidden');
    document.getElementById('profilePage').classList.add('active');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    renderProfile(uid);
}

// ===== ЗАГРУЗКА ДАННЫХ =====
function loadData() {
    if (!USER_UID) return;
    loadPeople();
    loadRooms();
    loadFeed();
    loadNotifications();
}

// Остальные функции (profile, friends, chat, groups, notifications, feed, admin) 
// подключаются из отдельных файлов
