<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Фото — METAIMPERIYA</title>
    <meta name="description" content="Всё о фотографии: советы, техника, вдохновение">
    <meta name="keywords" content="фото, фотография, снимки, камера">
    <link rel="stylesheet" href="../../css/style.css">
    <link rel="stylesheet" href="../../css/components.css">
    <link rel="stylesheet" href="../../css/mobile.css">
</head>
<body>
<div class="app">

    <!-- ===== КОНТЕЙНЕРЫ ДЛЯ КОМПОНЕНТОВ ===== -->
    <div id="topbarContainer"></div>
    <div id="settingsContainer"></div>
    <div id="sidebarContainer"></div>
    <div id="modalsContainer"></div>

    <!-- ===== КОНТЕНТ ===== -->
    <div class="container" style="padding-top:10px;">
        <button onclick="window.location.href='/'">← Назад</button>
        <h1>📸 Фото</h1>
        <p style="color:#888;">Всё о фотографии: советы, техника, вдохновение</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
            <div style="background:var(--input-bg);padding:16px;border-radius:12px;text-align:center;">📷 Советы по съёмке</div>
            <div style="background:var(--input-bg);padding:16px;border-radius:12px;text-align:center;">📸 Лучшие камеры</div>
            <div style="background:var(--input-bg);padding:16px;border-radius:12px;text-align:center;">🎨 Обработка фото</div>
            <div style="background:var(--input-bg);padding:16px;border-radius:12px;text-align:center;">🌟 Вдохновение</div>
        </div>
    </div>

    <!-- ===== ПЛЕЕР ===== -->
    <div id="playerContainer"></div>

</div>

<!-- ===== СКРИПТЫ В ПРАВИЛЬНОМ ПОРЯДКЕ ===== -->
<script src="../../js/firebase.js"></script>
<script src="../../js/lang.js"></script>
<script src="../../js/auth.js"></script>
<script src="../../js/player.js"></script>
<script src="../../js/app.js"></script>
<script src="../../js/feed.js"></script>
<script src="../../js/profile.js"></script>
<script src="../../js/friends.js"></script>
<script src="../../js/groups.js"></script>
<script src="../../js/chat.js"></script>
<script src="../../js/notifications.js"></script>
<script src="../../js/admin.js"></script>

<script>
// ================================================================
// ЗАГРУЗКА КОМПОНЕНТОВ (ШАПКА, САЙДБАР, МОДАЛКИ, ПЛЕЕР)
// ================================================================

(function() {
    const components = [
        { id: 'topbarContainer', url: '../../topbar.html' },
        { id: 'settingsContainer', url: '../../settings.html' },
        { id: 'sidebarContainer', url: '../../sidebar.html' },
        { id: 'modalsContainer', url: '../../modals.html' },
        { id: 'playerContainer', url: '../../player.html' }
    ];

    let loaded = 0;
    const total = components.length;

    components.forEach(function(comp) {
        const container = document.getElementById(comp.id);
        if (!container) return;

        fetch(comp.url)
            .then(response => {
                if (!response.ok) throw new Error('Не удалось загрузить ' + comp.url);
                return response.text();
            })
            .then(html => {
                container.innerHTML = html;
                loaded++;
                if (loaded === total) {
                    console.log('✅ Все компоненты загружены!');
                    setTimeout(function() {
                        try {
                            if (typeof updateUI === 'function') updateUI();
                            if (typeof loadNotifications === 'function') loadNotifications();
                            if (typeof updateNotifBadge === 'function') updateNotifBadge();
                            if (typeof initAudio === 'function') initAudio();
                            if (typeof translatePage === 'function') translatePage();
                        } catch(e) {
                            console.warn('Ошибка инициализации:', e);
                        }
                    }, 500);
                }
            })
            .catch(err => {
                console.warn('❌ Ошибка загрузки ' + comp.url + ':', err);
                container.innerHTML = `<div style="display:none;"></div>`;
                loaded++;
                if (loaded === total) {
                    console.log('✅ Все компоненты загружены (с ошибками)');
                    setTimeout(function() {
                        try {
                            if (typeof updateUI === 'function') updateUI();
                            if (typeof loadNotifications === 'function') loadNotifications();
                            if (typeof updateNotifBadge === 'function') updateNotifBadge();
                            if (typeof initAudio === 'function') initAudio();
                            if (typeof translatePage === 'function') translatePage();
                        } catch(e) {
                            console.warn('Ошибка инициализации:', e);
                        }
                    }, 500);
                }
            });
    });
})();

// ================================================================
// АВТО-СКРЫТИЕ ШАПКИ
// ================================================================

(function() {
    var lastScrollY = 0;
    var topbar = document.getElementById('topbar');
    var playerHandle = document.getElementById('playerHandle');
    var playerDrawer = document.getElementById('playerDrawer');
    var isPlayerOpen = false;
    var ticking = false;

    setTimeout(function() {
        topbar = document.getElementById('topbar');
        if (!topbar) return;
        console.log('✅ Авто-скрытие шапки работает');
    }, 1000);

    function checkPlayerState() {
        if (playerDrawer) {
            isPlayerOpen = playerDrawer.classList.contains('open');
        }
    }

    function updateHeader() {
        var currentScrollY = window.scrollY;
        checkPlayerState();

        if (isPlayerOpen) {
            showAll();
            lastScrollY = currentScrollY;
            return;
        }

        if (currentScrollY < lastScrollY || currentScrollY < 30) {
            showAll();
        } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
            hideAll();
        }

        lastScrollY = currentScrollY;
    }

    function showAll() {
        if (topbar) {
            topbar.style.transform = 'translateY(0)';
            topbar.style.opacity = '1';
        }
        if (playerHandle) {
            playerHandle.style.transform = 'translateY(0)';
            playerHandle.style.opacity = '1';
        }
    }

    function hideAll() {
        if (topbar) {
            topbar.style.transform = 'translateY(-100%)';
            topbar.style.opacity = '0';
            topbar.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        }
        if (playerHandle) {
            playerHandle.style.transform = 'translateY(-100%)';
            playerHandle.style.opacity = '0';
            playerHandle.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        }
    }

    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                updateHeader();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    if (playerDrawer) {
        var observer = new MutationObserver(function() {
            checkPlayerState();
            if (isPlayerOpen) {
                showAll();
            }
        });
        observer.observe(playerDrawer, { attributes: true, attributeFilter: ['class'] });
    }

    if (playerHandle) {
        playerHandle.addEventListener('click', function() {
            setTimeout(function() {
                checkPlayerState();
                if (isPlayerOpen) {
                    showAll();
                }
            }, 150);
        });
    }
})();
</script>
</body>
</html>
