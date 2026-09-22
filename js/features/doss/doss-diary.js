(function () {
    'use strict';
    window.renderDossDiary = function (root) {
        if (!root) return;
        root.innerHTML =
            '<section class="doss-module">' +
                '<h1>📔 Diary</h1>' +
                '<p class="doss-module__stub">Модуль в разработке. Структура данных: <code>doss/users/{uid}/diary</code>.</p>' +
            '</section>';
    };
    console.log('✅ DOSS diary (stub) загружен');
})();
