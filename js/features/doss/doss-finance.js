(function () {
    'use strict';
    window.renderDossFinance = function (root) {
        if (!root) return;
        root.innerHTML =
            '<section class="doss-module">' +
                '<h1>💰 Finance</h1>' +
                '<p class="doss-module__stub">Модуль в разработке. Структура данных: <code>doss/users/{uid}/finance</code>.</p>' +
            '</section>';
    };
    console.log('✅ DOSS finance (stub) загружен');
})();
