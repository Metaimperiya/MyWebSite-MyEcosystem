(function () {
    'use strict';
    window.renderDossFiles = function (root) {
        if (!root) return;
        root.innerHTML =
            '<section class="doss-module">' +
                '<h1>📁 Files</h1>' +
                '<p class="doss-module__stub">Модуль в разработке. Структура данных: <code>doss/users/{uid}/files</code>.</p>' +
            '</section>';
    };
    console.log('✅ DOSS files (stub) загружен');
})();
