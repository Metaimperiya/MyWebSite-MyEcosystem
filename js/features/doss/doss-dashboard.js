/* ================================================================
 * DOSS OS — DASHBOARD
 * ================================================================ */

(function () {
    'use strict';

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function todayKey() {
        var d = new Date();
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    window.renderDossDashboard = function (root) {
        if (!root) return;

        root.innerHTML =
            '<section class="doss-dashboard">' +
                '<header class="doss-dashboard__hero">' +
                    '<h1>🧠 DOSS OS</h1>' +
                    '<p class="doss-dashboard__subtitle" id="dossDashHello">Добро пожаловать</p>' +
                '</header>' +

                '<div class="doss-grid">' +
                    '<div class="doss-card" id="dossDashDate">' +
                        '<div class="doss-card__title">📅 Сегодня</div>' +
                        '<div class="doss-card__value" id="dossDashDateValue">—</div>' +
                    '</div>' +
                    '<div class="doss-card" id="dossDashTasks">' +
                        '<div class="doss-card__title">✅ Задачи</div>' +
                        '<div class="doss-card__value" id="dossDashTasksValue">0</div>' +
                    '</div>' +
                    '<div class="doss-card" id="dossDashEvents">' +
                        '<div class="doss-card__title">📅 События</div>' +
                        '<div class="doss-card__value" id="dossDashEventsValue">0</div>' +
                    '</div>' +
                    '<div class="doss-card" id="dossDashReminders">' +
                        '<div class="doss-card__title">⏰ Напоминания</div>' +
                        '<div class="doss-card__value" id="dossDashRemindersValue">0</div>' +
                    '</div>' +
                '</div>' +

                '<div class="doss-card doss-card--wide">' +
                    '<div class="doss-card__title">⚡ Быстрые действия</div>' +
                    '<div class="doss-quick-actions">' +
                        '<a class="doss-btn" href="#/calculator">🧮 Калькулятор</a>' +
                        '<a class="doss-btn" href="#/tasks">✅ Новая задача</a>' +
                        '<a class="doss-btn" href="#/notes">📝 Новая заметка</a>' +
                        '<a class="doss-btn" href="#/settings">⚙️ Настройки</a>' +
                    '</div>' +
                '</div>' +

                '<div class="doss-card doss-card--wide">' +
                    '<div class="doss-card__title">📌 Статус DOSS</div>' +
                    '<div class="doss-dashboard__status" id="dossDashStatus">Загрузка данных…</div>' +
                '</div>' +
            '</section>';

        var hello = document.getElementById('dossDashHello');
        if (hello) {
            var name = (typeof USER !== 'undefined' && USER) ? USER : 'пользователь';
            hello.textContent = 'Привет, ' + name + '!';
        }

        var dateEl = document.getElementById('dossDashDateValue');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('ru-RU', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            });
        }

        if (!window.DossData || typeof USER_UID === 'undefined' || !USER_UID) {
            var st = document.getElementById('dossDashStatus');
            if (st) st.textContent = '⚠️ Нет авторизации — данные недоступны';
            return;
        }

        window.DossData.get('tasks').then(function (tasks) {
            var arr = tasks ? Object.keys(tasks) : [];
            var el = document.getElementById('dossDashTasksValue');
            if (el) el.textContent = String(arr.length);
        }).catch(function () {});

        window.DossData.get('calendar').then(function (cal) {
            var arr = cal ? Object.keys(cal) : [];
            var el = document.getElementById('dossDashEventsValue');
            if (el) el.textContent = String(arr.length);
        }).catch(function () {});

        window.DossData.get('alarms').then(function (al) {
            var arr = al ? Object.keys(al) : [];
            var el = document.getElementById('dossDashRemindersValue');
            if (el) el.textContent = String(arr.length);
        }).catch(function () {});

        var status = document.getElementById('dossDashStatus');
        if (status) {
            status.textContent = '✅ DOSS подключён · uid: ' + (USER_UID || '').slice(0, 8) + '… · ' + todayKey();
        }
    };

    console.log('✅ DOSS dashboard загружен');
})();
