/* ================================================================
 * DOSS OS — CORE
 * ================================================================ */

(function () {
    'use strict';

    var authGuard = null;
    var appRoot = null;
    var loading = null;

    function showLoading(show) {
        if (!loading) loading = document.getElementById('dossLoading');
        if (loading) loading.style.display = show ? 'flex' : 'none';
    }

    function showAuthGuard(show) {
        if (!authGuard) authGuard = document.getElementById('dossAuthGuard');
        // Guard расположен внутри dossApp: скрытие родителя скрывает и сам guard.
        // Оверлей сам перекрывает интерфейс, поэтому контейнер оставляем видимым.
        if (authGuard) authGuard.hidden = !show;
    }

    function startClock() {
        var dateEl = document.getElementById('dossTopbarDate');
        var timeEl = document.getElementById('dossTopbarTime');
        function tick() {
            var d = new Date();
            if (dateEl) dateEl.textContent = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
            if (timeEl) timeEl.textContent = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        }
        tick();
        setInterval(tick, 30000);
    }

    function renderAvatar() {
        var el = document.getElementById('dossTopAvatar');
        if (!el || !USER_UID) return;
        if (typeof window.renderAvatar === 'function') {
            window.renderAvatar(USER_UID, el, (USER || '?').charAt(0).toUpperCase());
        } else {
            el.innerHTML = '<span class="letter">' + ((USER || '?').charAt(0).toUpperCase()) + '</span>';
        }
    }

    window.dossToggleSidebar = function () {
        var sb = document.getElementById('dossSidebar');
        var ov = document.getElementById('dossSidebarOverlay');
        if (sb) sb.classList.toggle('is-open');
        if (ov) ov.classList.toggle('is-visible');
    };

    window.dossCloseSidebar = function () {
        var sb = document.getElementById('dossSidebar');
        var ov = document.getElementById('dossSidebarOverlay');
        if (sb) sb.classList.remove('is-open');
        if (ov) ov.classList.remove('is-visible');
    };

    window.dossGoToLogin = function () {
        window.location.href = '/?returnTo=' + encodeURIComponent('/doss/');
    };

    function boot() {
        appRoot = document.getElementById('dossApp');
        loading = document.getElementById('dossLoading');
        showLoading(true);

        if (typeof auth === 'undefined' || !auth) {
            console.error('DOSS: Firebase Auth недоступен');
            showAuthGuard(true);
            return;
        }

        auth.onAuthStateChanged(function (user) {
            if (!user) {
                console.log('DOSS: гость → auth-guard');
                showLoading(false);
                showAuthGuard(true);
                return;
            }

            // Общий auth.js обычно уже заполнил USER_UID, но порядок колбэков
            // не должен влиять на запуск отдельной страницы DOSS.
            USER_UID = user.uid;
            if (!USER) USER = user.displayName || user.email || 'User';

            console.log('DOSS: пользователь', user.uid);
            showAuthGuard(false);

            setTimeout(function () {
                try {
                    if (window.DossData && typeof window.DossData.ensureProfile === 'function') {
                        window.DossData.ensureProfile({ name: USER || user.displayName }).catch(function (e) {
                            console.warn('DOSS: ensureProfile ошибка', e);
                        });
                    }
                } catch (e) {
                    console.warn('DOSS: ensureProfile исключение', e);
                }

                renderAvatar();
                startClock();

                if (window.DossRouter) {
                    window.DossRouter.render();
                }
                showLoading(false);
            }, 200);
        });

        document.querySelectorAll('.doss-nav__item').forEach(function (a) {
            a.addEventListener('click', function () {
                if (window.innerWidth <= 1024) window.dossCloseSidebar();
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    console.log('✅ DOSS core загружен');
})();
