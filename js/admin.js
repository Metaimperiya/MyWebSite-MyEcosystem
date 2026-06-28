// ===== АДМИН-ПАНЕЛЬ =====

function adminDeleteUser(uid) {
    if (!isAdmin || !uid || uid === USER_UID) return;
    if (!confirm('Удалить пользователя? Это необратимо!')) return;
    
    const updates = {};
    ['users', 'all_users', 'friends', 'followers', 'notifications'].forEach(p => {
        updates['sites/' + SITE + '/' + p + '/' + uid] = null;
    });
    
    db.ref().update(updates).then(() => {
        loadPeople();
        loadRooms();
        alert('✅ Пользователь удален');
    }).catch(err => {
        console.error('Ошибка:', err);
        alert('Ошибка удаления');
    });
}

function adminDeleteAllUsers() {
    if (!isAdmin) return;
    if (!confirm('Удалить ВСЕХ пользователей, кроме админов? Это НЕОБРАТИМО!')) return;
    
    db.ref('sites/' + SITE + '/all_users').once('value', snap => {
        const users = snap.val() || {};
        const updates = {};
        
        Object.keys(users).forEach(uid => {
            if (!ADMIN_UIDS.includes(uid) && uid !== USER_UID) {
                ['users', 'all_users', 'friends', 'followers', 'notifications'].forEach(p => {
                    updates['sites/' + SITE + '/' + p + '/' + uid] = null;
                });
            }
        });
        updates['sites/' + SITE + '/room_users'] = null;
        
        db.ref().update(updates).then(() => {
            loadPeople();
            loadRooms();
            alert('✅ Все пользователи удалены');
        }).catch(err => {
            console.error('Ошибка:', err);
            alert('Ошибка удаления');
        });
    });
}

function adminClearRooms() {
    if (!isAdmin) return;
    if (!confirm('Очистить все комнаты?')) return;
    
    db.ref('sites/' + SITE + '/rooms').remove();
    db.ref('sites/' + SITE + '/room_users').remove();
    loadRooms();
    alert('✅ Комнаты очищены');
}

function adminClearNotifications() {
    if (!isAdmin) return;
    if (!confirm('Очистить все уведомления?')) return;
    
    db.ref('sites/' + SITE + '/notifications').remove();
    alert('✅ Уведомления очищены');
}

function adminExportData() {
    if (!isAdmin) return;
    
    db.ref('sites/' + SITE).once('value', snap => {
        const data = snap.val();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'metaimperiya_export_' + Date.now() + '.json';
        a.click();
        URL.revokeObjectURL(url);
    });
}

// Обновляем UI админки
document.addEventListener('DOMContentLoaded', function() {
    // Обновляем админ-кнопки в списке пользователей
    const observer = new MutationObserver(() => {
        if (isAdmin) {
            document.querySelectorAll('.user-item').forEach(item => {
                const uid = item.id?.replace('user-item-', '');
                if (uid && uid !== USER_UID) {
                    const actions = item.querySelector('.actions');
                    if (actions && !item.querySelector('.admin-delete-btn')) {
                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'btn-action admin-delete-btn';
                        deleteBtn.style.cssText = 'background:#e74c3c;color:white;min-width:32px;padding:4px 8px;';
                        deleteBtn.innerHTML = '🗑';
                        deleteBtn.title = 'Удалить пользователя';
                        deleteBtn.onclick = (e) => {
                            e.stopPropagation();
                            if (confirm('Удалить пользователя?')) {
                                adminDeleteUser(uid);
                            }
                        };
                        actions.appendChild(deleteBtn);
                    }
                }
            });
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});
