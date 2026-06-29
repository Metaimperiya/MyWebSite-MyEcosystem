// ================================================================
// ДРУЗЬЯ
// ================================================================

function checkFriend(uid) {
    if (!USER_UID) return false;
    return localStorage.getItem('fr_' + USER_UID + '_' + uid) === '1';
}

window.toggleFriend = function(uid) {
    if (!USER_UID) return;
    const isFriend = checkFriend(uid);
    if (isFriend) {
        if (!confirm('Удалить из друзей?')) return;
        localStorage.removeItem('fr_' + USER_UID + '_' + uid);
        db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + uid).remove();
        db.ref('sites/' + SITE + '/friends/' + uid + '/' + USER_UID).remove();
    } else {
        localStorage.setItem('fr_' + USER_UID + '_' + uid, '1');
        db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + uid).set(true);
        db.ref('sites/' + SITE + '/friends/' + uid + '/' + USER_UID).set(true);
    }
    loadProfile();
    if (VIEWING_USER) showProfileActions(VIEWING_USER);
};

function loadFriends(uid) {
    db.ref('sites/' + SITE + '/friends/' + uid).on('value', snap => {
        const data = snap.val() || {};
        const keys = Object.keys(data);
        document.getElementById('friendsCount').textContent = keys.length;
        const el = document.getElementById('friendList');
        if (!keys.length) {
            el.innerHTML = '<span style="color:#bbb;font-size:0.55rem;">Нет друзей</span>';
            return;
        }
        let html = '';
        let loaded = 0;
        keys.forEach(k => {
            db.ref('sites/' + SITE + '/users/' + k).once('value', usnap => {
                const u = usnap.val() || {};
                const name = u.name || 'Аноним';
                const letter = name.charAt(0).toUpperCase();
                html += `<span class="friend-item" onclick="viewUser('${k}')">
                    <span class="avatar-wrap" id="fava-${k}"><span class="letter">${letter}</span></span> ${esc(name)}
                </span>`;
                loaded++;
                if (loaded === keys.length) {
                    el.innerHTML = html;
                    keys.forEach(k2 => {
                        const el2 = document.getElementById('fava-' + k2);
                        if (el2) renderAvatar(k2, el2, '?');
                    });
                }
            });
        });
    });
}

function loadSubscribers(uid) {
    if (!uid) return;
    db.ref('sites/' + SITE + '/subscribers/' + uid).on('value', snap => {
        const data = snap.val() || {};
        document.getElementById('subscribersCount').textContent = Object.keys(data).length;
    });
}

function loadSubscriptions(uid) {
    if (!uid) return;
    db.ref('sites/' + SITE + '/subscriptions/' + uid).on('value', snap => {
        const data = snap.val() || {};
        document.getElementById('subscriptionsCount').textContent = Object.keys(data).length;
    });
}
