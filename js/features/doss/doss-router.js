/* ================================================================
 * DOSS OS — INTERNAL ROUTER
 * ================================================================ */

(function () {
    'use strict';

    var ROUTES = {
        dashboard:     { title: 'Dashboard',     render: 'renderDossDashboard' },
        calendar:      { title: 'Calendar',      render: 'renderDossCalendar' },
        tasks:         { title: 'Tasks',         render: 'renderDossTasks' },
        notes:         { title: 'Notes',         render: 'renderDossNotes' },
        diary:         { title: 'Diary',         render: 'renderDossDiary' },
        contacts:      { title: 'Contacts',      render: 'renderDossContacts' },
        alarms:        { title: 'Alarms',        render: 'renderDossAlarms' },
        calculator:    { title: 'Calculator',    render: 'renderDossCalculator' },
        charts:        { title: 'Charts',        render: 'renderDossCharts' },
        finance:       { title: 'Finance',       render: 'renderDossFinance' },
        files:         { title: 'Files',         render: 'renderDossFiles' },
        bookmarks:     { title: 'Bookmarks',     render: 'renderDossBookmarks' },
        notifications: { title: 'Notifications', render: 'renderDossNotifications' },
        settings:      { title: 'Settings',      render: 'renderDossSettings' }
    };

    var DEFAULT_ROUTE = 'dashboard';

    function currentRoute() {
        var hash = (window.location.hash || '').replace(/^#\/?/, '');
        return ROUTES[hash] ? hash : DEFAULT_ROUTE;
    }

    function setActiveNav(route) {
        document.querySelectorAll('.doss-nav__item').forEach(function (el) {
            el.classList.toggle('is-active', el.getAttribute('data-doss-route') === route);
        });
    }

    function renderRoute() {
        var route = currentRoute();
        var def = ROUTES[route];
        var main = document.getElementById('dossMain');
        if (!main || !def) return;

        setActiveNav(route);
        document.title = 'DOSS OS — ' + def.title;

        var fn = window[def.render];
        if (typeof fn === 'function') {
            try {
                fn(main);
            } catch (e) {
                console.error('DOSS router: ошибка рендера ' + route, e);
                main.innerHTML = '<div class="doss-error">Ошибка модуля: ' + route + '</div>';
            }
        } else {
            main.innerHTML = '<div class="doss-error">Модуль «' + route + '» не подключён</div>';
        }
    }

    window.DossRouter = {
        go: function (route) {
            if (!ROUTES[route]) route = DEFAULT_ROUTE;
            if (('#/' + route) !== window.location.hash) {
                window.location.hash = '#/' + route;
            } else {
                renderRoute();
            }
        },
        current: currentRoute,
        render: renderRoute,
        routes: ROUTES
    };

    window.addEventListener('hashchange', renderRoute);

    console.log('✅ DOSS router готов');
})();
