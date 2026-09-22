(function () {
    'use strict';
    window.renderDossContacts = function (root) {
        if (!root) return;
        root.innerHTML =
            '<section class="doss-module">' +
                '<h1>👤 Contacts</h1>' +
                '<p class="doss-module__stub">Модуль в разработке. Структура данных: <code>doss/users/{uid}/contacts</code>.</p>' +
            '</section>';
    };
    console.log('✅ DOSS contacts (stub) загружен');
})();
