(function () {
    'use strict';
    window.renderDossCharts = function (root) {
        if (!root) return;
        root.innerHTML =
            '<section class="doss-module">' +
                '<h1>📊 Charts</h1>' +
                '<p class="doss-module__stub">Модуль в разработке.</p>' +
            '</section>';
    };
    console.log('✅ DOSS charts (stub) загружен');
})();
