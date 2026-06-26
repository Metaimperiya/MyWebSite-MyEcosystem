// ================================================================
// FIREBASE
// ================================================================
const FB_CONFIG = {
    apiKey: "AIzaSyDCx2wLK2EZJOrUNoXEdWDlYY0e8cOHhtY",
    authDomain: "myecosystem-e6414.firebaseapp.com",
    databaseURL: "https://myecosystem-e6414-default-rtdb.firebaseio.com",
    projectId: "myecosystem-e6414",
    storageBucket: "myecosystem-e6414.firebasestorage.app",
    messagingSenderId: "426302111033",
    appId: "1:426302111033:web:7b39e7026e94f528a13ce8"
};

firebase.initializeApp(FB_CONFIG);
const db = firebase.database();

// ================================================================
// ОПРЕДЕЛЕНИЕ СТРАНИЦЫ
// ================================================================

function getPageType() {
    const path = window.location.pathname;
    if (path.includes('/user/')) return 'user';
    if (path.includes('/group/')) return 'group';
    if (path.includes('/admin/')) return 'admin';
    return 'home';
}

function getSlug() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(p => p);
    return parts.length > 1 ? parts[1] : null;
}

// ================================================================
// ЗАГРУЗКА ДАННЫХ ДЛЯ СТРАНИЦЫ
// ================================================================

function loadPageData() {
    const type = getPageType();
    const slug = getSlug();
    
    if (type === 'user' && slug) {
        // Загружаем данные пользователя из Firebase
        db.ref('sites/' + window.location.hostname.replace(/\./g, '_') + '/users_by_name/' + slug).once('value', snap => {
            const uid = snap.val();
            if (uid) {
                db.ref('sites/' + window.location.hostname.replace(/\./g, '_') + '/all_users/' + uid).once('value', userSnap => {
                    const user = userSnap.val();
                    if (user) {
                        updateUserPage(user);
                    }
                });
            }
        });
    }
    
    if (type === 'group' && slug) {
        db.ref('sites/' + window.location.hostname.replace(/\./g, '_') + '/groups/' + slug).once('value', snap => {
            const group = snap.val();
            if (group) {
                updateGroupPage(group);
            }
        });
    }
}

function updateUserPage(user) {
    // Обновляем данные на странице
    const nameEl = document.querySelector('.profile-name');
    const usernameEl = document.querySelector('.profile-username');
    const bioEl = document.querySelector('.profile-bio');
    const avatarEl = document.querySelector('.profile-avatar');
    
    if (nameEl) nameEl.textContent = user.name || 'Аноним';
    if (usernameEl) usernameEl.textContent = '@' + (user.username || '');
    if (bioEl) bioEl.textContent = user.bio || 'Привет! 👋';
    if (avatarEl) {
        if (user.avatarUrl) {
            avatarEl.innerHTML = `<img src="${user.avatarUrl}" style="width:100%;height:100%;object-fit:cover;">`;
        } else {
            avatarEl.innerHTML = `<span>${(user.name || '?').charAt(0).toUpperCase()}</span>`;
        }
    }
    
    // Обновляем мета-теги
    document.title = `${user.name || 'Пользователь'} | METAIMPERIYA`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.content = `Профиль пользователя ${user.name || ''} в METAIMPERIYA`;
}

function updateGroupPage(group) {
    const nameEl = document.querySelector('.group-name');
    const descEl = document.querySelector('.group-description');
    
    if (nameEl) nameEl.textContent = group.name || 'Группа';
    if (descEl) descEl.textContent = group.description || 'Группа в METAIMPERIYA';
    
    document.title = `${group.name || 'Группа'} | METAIMPERIYA`;
}

// ================================================================
// ЗАПУСК
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    loadPageData();
});

console.log('✅ METAIMPERIYA - СТАТИЧЕСКАЯ СТРУКТУРА ГОТОВА!');
console.log('📁 Каждая страница — отдельный HTML-файл');
console.log('🔥 Firebase только для интерактивности');
console.log('🎯 Полный контроль над SEO и контентом');
