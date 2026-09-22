(function () {
    'use strict';
    window.renderDossNotes = function (root) {
        if (!root) return;
        root.innerHTML =
            '<section class="doss-module">' +
                '<h1>📝 Notes</h1>' +
                '<p class="doss-module__stub">Модуль в разработке. Структура данных: <code>doss/users/{uid}/notes</code>.</p>' +
            '</section>';
    };
    console.log('✅ DOSS notes (stub) загружен');
})();
