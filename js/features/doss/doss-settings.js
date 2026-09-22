(function () {
    'use strict';
    window.renderDossSettings = function (root) {
        if (!root) return;
        root.innerHTML =
            '<section class="doss-module">' +
                '<h1>⚙️ Settings</h1>' +
                '<p class="doss-module__stub">Модуль в разработке. Структура данных: <code>doss/users/{uid}/settings</code>.</p>' +
                '<p class="doss-module__stub">Текущий пользователь: <code>' + (typeof USER_UID !== 'undefined' ? USER_UID : '—') + '</code></p>' +
            '</section>';
    };
    console.log('✅ DOSS settings (stub) загружен');
})();
