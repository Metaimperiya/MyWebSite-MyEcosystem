// ================================================================
// 100% РАБОЧЕЕ ОБНОВЛЕНИЕ ШАПКИ
// ================================================================

(function() {
    console.log('🔥 ЗАПУСКАЕМ 100% ОБНОВЛЕНИЕ ШАПКИ');
    
    function forceUpdateTopbar() {
        // Пытаемся получить имя отовсюду
        var name = null;
        
        // 1. Из localStorage
        try {
            name = localStorage.getItem('dc_u_default') || 
                   localStorage.getItem('dc_u_') || 
                   null;
        } catch(e) {}
        
        // 2. Из глобальной переменной
        if (!name && typeof USER !== 'undefined') {
            name = window.USER || null;
        }
        
        // 3. Из Firebase (если есть uid)
        var uid = localStorage.getItem('dc_uid_default') || 
                  localStorage.getItem('dc_uid_') || 
                  (typeof USER_UID !== 'undefined' ? window.USER_UID : null);
        
        if (!name && uid) {
            try {
                db.ref('sites/default/users/' + uid + '/name').once('value')
                    .then(function(snap) {
                        var val = snap.val();
                        if (val) {
                            localStorage.setItem('dc_u_default', val);
                            name = val;
                            window.USER = val;
                            applyUpdate(name);
                        }
                    });
            } catch(e) {}
        }
        
        function applyUpdate(username) {
            if (!username) {
                username = 'Гость';
            }
            
            console.log('👤 Устанавливаем имя:', username);
            
            // Обновляем шапку
            var topName = document.getElementById('topName');
            if (topName) {
                topName.textContent = username;
            }
            
            var topAvatarLetter = document.getElementById('topAvatarLetter');
            if (topAvatarLetter) {
                topAvatarLetter.textContent = username === 'Гость' ? '?' : username.charAt(0).toUpperCase();
            }
            
            // Обновляем сайдбар
            var sName = document.getElementById('sName');
            if (sName) {
                sName.textContent = username;
            }
            
            var sAvatar = document.getElementById('sAvatar');
            if (sAvatar) {
                var letterSpan = sAvatar.querySelector('.letter');
                if (letterSpan) {
                    letterSpan.textContent = username === 'Гость' ? '?' : username.charAt(0).toUpperCase();
                }
            }
            
            // Если есть функция updateUI - вызываем
            if (typeof updateUI === 'function') {
                try { updateUI(); } catch(e) {}
            }
            if (typeof updateUISafe === 'function') {
                try { updateUISafe(); } catch(e) {}
            }
        }
        
        // Применяем имя если есть
        if (name) {
            applyUpdate(name);
        } else {
            // Если нет имени - пробуем через 500мс
            setTimeout(function() {
                var name2 = localStorage.getItem('dc_u_default') || 
                           localStorage.getItem('dc_u_') || 
                           window.USER || 
                           null;
                if (name2) {
                    applyUpdate(name2);
                }
            }, 500);
        }
    }
    
    // Запускаем много раз
    setTimeout(forceUpdateTopbar, 100);
    setTimeout(forceUpdateTopbar, 300);
    setTimeout(forceUpdateTopbar, 500);
    setTimeout(forceUpdateTopbar, 1000);
    setTimeout(forceUpdateTopbar, 2000);
    
    // Каждые 2 секунды проверяем
    var attempts = 0;
    var interval = setInterval(function() {
        attempts++;
        var topName = document.getElementById('topName');
        var name = localStorage.getItem('dc_u_default') || 
                   localStorage.getItem('dc_u_') || 
                   window.USER || 
                   null;
        
        if (topName && name && topName.textContent === 'Гость') {
            console.log('🔄 Попытка #' + attempts + ' - меняем Гость на', name);
            forceUpdateTopbar();
        }
        
        if (topName && name && topName.textContent !== 'Гость') {
            console.log('✅ Шапка обновлена! Имя:', topName.textContent);
            // Не останавливаем, продолжаем проверять
        }
        
        if (attempts > 30) {
            console.log('⚠️ Останавливаем проверку');
            clearInterval(interval);
        }
    }, 1000);
    
    // MutationObserver
    try {
        var observer = new MutationObserver(function() {
            var topName = document.getElementById('topName');
            if (topName) {
                var name = localStorage.getItem('dc_u_default') || 
                           localStorage.getItem('dc_u_') || 
                           window.USER || 
                           null;
                if (name && topName.textContent === 'Гость') {
                    forceUpdateTopbar();
                }
            }
        });
        
        setTimeout(function() {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            console.log('✅ MutationObserver запущен');
        }, 500);
    } catch(e) {
        console.warn('MutationObserver ошибка:', e);
    }
    
    console.log('✅ 100% обновление шапки запущено!');
})();

// Добавляем глобальную функцию для ручного вызова
window.forceUpdateTopbar = function() {
    var name = localStorage.getItem('dc_u_default') || 
               localStorage.getItem('dc_u_') || 
               window.USER || 
               'Гость';
    
    var topName = document.getElementById('topName');
    if (topName) {
        topName.textContent = name;
        console.log('👤 Ручное обновление:', name);
    }
    
    var topAvatarLetter = document.getElementById('topAvatarLetter');
    if (topAvatarLetter) {
        topAvatarLetter.textContent = name === 'Гость' ? '?' : name.charAt(0).toUpperCase();
    }
};
