(function () {
    'use strict';
    window.renderDossTasks = function (root) {
        if (!root) return;
        root.innerHTML =
            '<section class="doss-module">' +
                '<h1>✅ Tasks</h1>' +
                '<p class="doss-module__stub">Модуль в разработке. Структура данных: <code>doss/users/{uid}/tasks</code>.</p>' +
            '</section>';
    };
    console.log('✅ DOSS tasks (stub) загружен');
})();
