(function () {
    'use strict';
    window.renderDossNotifications = function (root) {
        if (!root) return;
        root.innerHTML =
            '<section class="doss-module">' +
                '<h1>🔔 Notifications</h1>' +
                '<p class="doss-module__stub">Модуль в разработке. Структура данных: <code>doss/users/{uid}/notifications</code>.</p>' +
            '</section>';
    };
    console.log('✅ DOSS notifications (stub) загружен');
})();
