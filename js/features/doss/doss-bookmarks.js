(function () {
    'use strict';
    window.renderDossBookmarks = function (root) {
        if (!root) return;
        root.innerHTML =
            '<section class="doss-module">' +
                '<h1>🔖 Bookmarks</h1>' +
                '<p class="doss-module__stub">Модуль в разработке. Структура данных: <code>doss/users/{uid}/bookmarks</code>.</p>' +
            '</section>';
    };
    console.log('✅ DOSS bookmarks (stub) загружен');
})();
