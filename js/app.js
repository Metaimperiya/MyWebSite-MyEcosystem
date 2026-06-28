function esc(s) {
    return s ? String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])) : '';
}

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

let darkTheme = localStorage.getItem('dc_theme_'+SITE) === 'dark';
function toggleTheme() {
    darkTheme = !darkTheme;
    document.body.classList.toggle('dark', darkTheme);
    localStorage.setItem('dc_theme_'+SITE, darkTheme ? 'dark' : 'light');
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.textContent = darkTheme ? '☀️' : '🌙';
}
if (darkTheme) {
    document.body.classList.add('dark');
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.textContent = '☀️';
}

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

function navigateToFeed() {
    viewingProfileUid = null;
    activeStatToggle = null;
    closeProfileDropdown();
    document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
    document.getElementById('feedPage').classList.remove('hidden');
    document.getElementById('feedPage').classList.add('active');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const tabs = document.querySelectorAll('.tab');
    if (tabs.length > 0) tabs[0].classList.add('active');
    currentTab = 'feed';
    loadFeed();
}

function showTab(tab) {
    if (viewingProfileUid) {
        navigateToFeed();
        setTimeout(() => showTabInternal(tab), 100);
        return;
    }
    showTabInternal(tab);
}

function showTabInternal(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => {
        const txt = t.textContent.trim();
        if ((tab === 'feed' && txt.includes('Лента')) ||
            (tab === 'groups' && txt.includes('Группы')) ||
            (tab === 'people' && txt.includes('Люди'))) {
            t.classList.add('active');
        }
    });
    document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
    const pageMap = { feed:'feedPage', groups:'groupsPage', people:'peoplePage' };
    const page = document.getElementById(pageMap[tab]);
    if (page) { page.classList.remove('hidden'); page.classList.add('active'); }
    viewingProfileUid = null;
    activeStatToggle = null;
    closeProfileDropdown();
    if (tab === 'feed') loadFeed();
    if (tab === 'groups') loadRooms();
    if (tab === 'people') loadPeople();
}

function navigateToProfile(uid) {
    if (!USER_UID) { alert('Войдите!'); return; }
    if (!uid) return;
    viewingProfileUid = uid;
    activeStatToggle = null;
    closeProfileDropdown();
    document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
    document.getElementById('profilePage').classList.remove('hidden');
    document.getElementById('profilePage').classList.add('active');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    renderProfile(uid);
}

function loadData() {
    if (!USER_UID) return;
    loadPeople();
    loadRooms();
    loadFeed();
    loadNotifications();
}
