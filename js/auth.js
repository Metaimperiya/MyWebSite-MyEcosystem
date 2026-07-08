// ================================================================
// СОХРАНЕНИЕ ИМЕНИ
// ================================================================

function setUserName(name) {
    if (!name) return;
    localStorage.setItem('dc_u_', name);
    localStorage.setItem('dc_u_default', name);
    window.USER = name;
    
    // Обновляем шапку сразу
    var el = document.getElementById('topName');
    if (el) el.textContent = name;
    var av = document.getElementById('topAvatarLetter');
    if (av) av.textContent = name.charAt(0).toUpperCase();
}

// ================================================================
// ВХОД ПО ИМЕНИ
// ================================================================

window.loginWithName = function() {
    var input = document.getElementById('nameInput');
    if (!input) return;
    var name = input.value.trim();
    if (!name) { alert('Введите имя'); return; }
    
    setUserName(name);
    
    var uid = 'user_' + Date.now();
    localStorage.setItem('dc_uid_', uid);
    window.USER_UID = uid;
    
    var modal = document.getElementById('loginModal');
    if (modal) modal.classList.remove('open');
    
    if (typeof loadFeed === 'function') loadFeed();
    if (typeof updateUI === 'function') updateUI();
};

// ================================================================
// ВЫХОД
// ================================================================

window.logout = function() {
    if (!confirm('Выйти?')) return;
    localStorage.removeItem('dc_u_');
    localStorage.removeItem('dc_u_default');
    localStorage.removeItem('dc_uid_');
    window.USER = null;
    window.USER_UID = null;
    
    document.getElementById('topName').textContent = 'Гость';
    document.getElementById('topAvatarLetter').textContent = '?';
    
    var modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('open');
};

// ================================================================
// ВОССТАНОВЛЕНИЕ ПРИ ЗАГРУЗКЕ
// ================================================================

(function() {
    var name = localStorage.getItem('dc_u_') || localStorage.getItem('dc_u_default');
    if (name) {
        window.USER = name;
        setTimeout(function() {
            var el = document.getElementById('topName');
            if (el) el.textContent = name;
            var av = document.getElementById('topAvatarLetter');
            if (av) av.textContent = name.charAt(0).toUpperCase();
        }, 100);
    }
})();

console.log('✅ auth.js загружен');
