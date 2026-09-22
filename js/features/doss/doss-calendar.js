(function () {
    'use strict';
    window.renderDossCalendar = function (root) {
        if (!root) return;
        root.innerHTML =
            '<section class="doss-module">' +
                '<h1>📅 Calendar</h1>' +
                '<p class="doss-module__stub">Модуль в разработке. Структура данных: <code>doss/users/{uid}/calendar</code>.</p>' +
            '</section>';
    };
    console.log('✅ DOSS calendar (stub) загружен');
})();
