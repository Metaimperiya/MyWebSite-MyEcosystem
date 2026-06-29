// ================================================================
// АВТОРИЗАЦИЯ
// ================================================================

auth.onAuthStateChanged(user => {
    if (user) {
        USER_UID = user.uid;
        USER = user.displayName || user.email || 'User';
        localStorage.setItem('dc_u_' + SITE, USER);
        db.ref('sites/' + SITE + '/users/' + USER_UID).update({
            name: USER,
            email: user.email || 'anon',
            uid: USER_UID,
            lastLogin: Date.now(),
            avatarUrl: user.photoURL || null
        });
        db.ref('sites/' + SITE + '/all_users/' + USER_UID).set({
            name: USER,
            email: user.email || 'anon',
            uid: USER_UID,
            avatarUrl: user.photoURL || null
        });
        document.getElementById('loginModal').classList.remove('open');
        updateUI();
        loadFeed();
        loadGroups();
        loadPeople();
        loadProfile();
    } else {
        USER = null;
        USER_UID = null;
        document.getElementById('loginModal').classList.add('open');
        updateUI();
    }
});

document.getElementById('googleBtn').addEventListener('click', function() {
    auth.signInWithPopup(provider).catch(err => {
        if (err.code === 'auth/popup-blocked') {
            auth.signInWithRedirect(provider);
        } else {
            alert('Ошибка входа: ' + err.message);
        }
    });
});

window.closeLogin = function() {
    document.getElementById('loginModal').classList.remove('open');
};

window.loginName = function() {
    const n = document.getElementById('nameInput').value.trim();
    if (!n) { alert('Введите имя'); return; }
    auth.signInAnonymously().then(() => {
        USER = n.slice(0, 24);
        USER_UID = 'anon_' + Date.now();
        localStorage.setItem('dc_u_' + SITE, USER);
        db.ref('sites/' + SITE + '/users/' + USER_UID).update({
            name: USER,
            email: 'anon@anon.com',
            uid: USER_UID,
            lastLogin: Date.now()
        });
        db.ref('sites/' + SITE + '/all_users/' + USER_UID).set({
            name: USER,
            email: 'anon@anon.com',
            uid: USER_UID
        });
        document.getElementById('loginModal').classList.remove('open');
        updateUI();
        loadFeed();
        loadGroups();
        loadPeople();
        loadProfile();
    }).catch(e => alert('Ошибка: ' + e.message));
};

window.logout = function() {
    if (!confirm('Выйти из аккаунта?')) return;
    auth.signOut();
    localStorage.removeItem('dc_u_' + SITE);
    USER = null;
    USER_UID = null;
    updateUI();
    document.getElementById('loginModal').classList.add('open');
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    document.getElementById('chatView').classList.remove('active');
};
