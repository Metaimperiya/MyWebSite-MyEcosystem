(function () {
    'use strict';
    window.renderDossAlarms = function (root) {
        if (!root) return;
        root.innerHTML =
            '<section class="doss-module">' +
                '<h1>⏰ Alarms & Reminders</h1>' +
                '<p class="doss-module__stub">Модуль в разработке. Структура данных: <code>doss/users/{uid}/alarms</code>.</p>' +
            '</section>';
    };
    console.log('✅ DOSS alarms (stub) загружен');
})();
