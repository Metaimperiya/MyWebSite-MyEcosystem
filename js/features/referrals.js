// Реферальная система и лента команды. Атрибуцию и реферальные счётчики
// меняют только Cloud Functions; клиент получает только личную сводку.
(function() {
    'use strict';

    var referralFunctions = null;
    var referralDashboard = null;
    var referralBusy = false;
    var referralClaimInFlightFor = null;
    var referralTab = 'members';
    var REFERRAL_PENDING_KEY = 'mi_pending_referral_v1';

    function functionsApi() {
        if (!referralFunctions) referralFunctions = firebase.functions();
        return referralFunctions;
    }

    function referralEscape(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(char) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
        });
    }

    function referralStatus(message, isError) {
        var link = document.getElementById('referralLinkValue');
        if (!link) return;
        link.textContent = message;
        link.classList.toggle('referral-error', !!isError);
    }

    function rememberReferralCode() {
        var code = new URLSearchParams(window.location.search).get('ref');
        if (!code) return;
        code = code.trim().toUpperCase();
        if (/^[A-F0-9]{12}$/.test(code)) {
            try { localStorage.setItem(REFERRAL_PENDING_KEY, code); } catch (error) { console.warn('Не удалось сохранить приглашение в браузере.'); }
        }
    }

    window.handleReferralAfterLogin = function(user) {
        rememberReferralCode();
        var code = '';
        try { code = localStorage.getItem(REFERRAL_PENDING_KEY) || ''; } catch (error) { return; }
        if (!user || !code || !firebase.functions || referralClaimInFlightFor === user.uid) return;
        referralClaimInFlightFor = user.uid;
        functionsApi().httpsCallable('claimReferral')({ site: SITE, code: code }).then(function(result) {
            if (result.data && result.data.claimed) console.info('Приглашение закреплено.');
            else console.info('Реферальное приглашение не применено:', result.data && result.data.reason);
            localStorage.removeItem(REFERRAL_PENDING_KEY);
        }).catch(function(error) {
            console.warn('Не удалось проверить реферальное приглашение:', error);
            // Сохраняем код при временной сетевой ошибке, чтобы повторить при следующем входе.
            if (error.code === 'functions/invalid-argument' || error.code === 'functions/unauthenticated' || error.code === 'functions/permission-denied') {
                localStorage.removeItem(REFERRAL_PENDING_KEY);
            }
        }).finally(function() { referralClaimInFlightFor = null; });
    };

    function displayName(member, userData) {
        return (userData && (userData.name || userData.displayName)) || 'Участник METAIMPERIYA';
    }

    function renderMembers(members) {
        var container = document.getElementById('referralMembersList');
        if (!container) return;
        if (!members.length) {
            container.innerHTML = '<div class="referrals-empty"><strong>Пока никто не присоединился</strong><span>Скопируй приглашение и отправь его знакомым.</span></div>';
            return;
        }
        var recentMembers = members.slice(0, 60);
        Promise.all(recentMembers.map(function(member) {
            return db.ref('sites/' + SITE + '/all_users/' + member.uid).once('value').then(function(snapshot) {
                return { member: member, user: snapshot.val() || {} };
            }).catch(function() { return { member: member, user: {} }; });
        })).then(function(rows) {
            if (!container.isConnected) return;
            container.innerHTML = rows.map(function(row) {
                var member = row.member;
                var user = row.user;
                var name = displayName(member, user);
                var avatar = user.avatarUrl ? '<img src="' + referralEscape(user.avatarUrl) + '" alt="" loading="lazy">' : '<span>' + referralEscape(Array.from(name)[0] || '?') + '</span>';
                var joined = member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
                var relation = member.depth === 1 ? 'Приглашён тобой' : 'Уровень команды ' + member.depth;
                return '<article class="referral-member"><span class="referral-avatar">' + avatar + '</span><span class="referral-member-info"><strong>' + referralEscape(name) + '</strong><span>' + relation + (joined ? ' · ' + joined : '') + '</span></span><button type="button" data-referral-profile="' + referralEscape(member.uid) + '">Профиль</button></article>';
            }).join('');
            container.querySelectorAll('[data-referral-profile]').forEach(function(button) {
                button.addEventListener('click', function() {
                    if (typeof window.viewUserProfile === 'function') window.viewUserProfile(button.getAttribute('data-referral-profile'));
                    else if (typeof window.navigateToProfile === 'function') window.navigateToProfile(button.getAttribute('data-referral-profile'));
                });
            });
        });
    }

    function renderTeamFeed(items) {
        var container = document.getElementById('referralTeamFeed');
        if (!container) return;
        container.replaceChildren();
        if (!items.length) {
            container.innerHTML = '<div class="referrals-empty"><strong>В команде пока нет публикаций</strong><span>Публикации появятся здесь, когда участники начнут вести ленту.</span></div>';
            return;
        }
        var fragment = document.createDocumentFragment();
        items.forEach(function(item) {
            if (!item || !item.post) return;
            var post = Object.assign({}, item.post, { id: item.id });
            var card = typeof window.renderPost === 'function' ? window.renderPost(post, 'feed') : null;
            if (card) {
                if (item.teamDepth > 0) {
                    var badge = document.createElement('div');
                    badge.className = 'referral-post-source';
                    badge.textContent = 'Команда · уровень ' + item.teamDepth;
                    card.insertBefore(badge, card.firstChild);
                }
                fragment.appendChild(card);
            }
        });
        container.appendChild(fragment);
    }

    window.loadReferralDashboard = function() {
        if (!USER_UID || referralBusy) {
            if (!USER_UID) referralStatus('Войди, чтобы получить ссылку приглашения.', true);
            return;
        }
        referralBusy = true;
        referralStatus('Загружаем ссылку…');
        var dashboardCall = functionsApi().httpsCallable('getReferralDashboard');
        dashboardCall({ site: SITE }).then(function(result) {
            referralDashboard = result.data || {};
            referralStatus(referralDashboard.link || 'Не удалось подготовить ссылку.');
            var direct = document.getElementById('referralDirectCount');
            var total = document.getElementById('referralTeamCount');
            if (direct) direct.textContent = referralDashboard.directCount || 0;
            if (total) total.textContent = referralDashboard.teamCount || 0;
            renderMembers(referralDashboard.members || []);
            if (referralTab === 'feed') window.loadReferralFeed();
        }).catch(function(error) {
            console.error('Не удалось загрузить реферальную сводку:', error);
            referralStatus(error.code === 'functions/not-found'
                ? 'Функции приглашений ещё не опубликованы в Firebase.'
                : 'Не удалось загрузить ссылку. Проверь, опубликованы ли Cloud Functions.', true);
        }).finally(function() { referralBusy = false; });
    };

    window.copyReferralLink = function() {
        if (!referralDashboard || !referralDashboard.link) { window.loadReferralDashboard(); return; }
        navigator.clipboard.writeText(referralDashboard.link).then(function() {
            var button = document.getElementById('copyReferralLink');
            if (button) { button.textContent = '✓ Скопировано'; setTimeout(function() { button.textContent = '⧉ Скопировать'; }, 1600); }
        }).catch(function() {
            window.prompt('Скопируй свою ссылку:', referralDashboard.link);
        });
    };

    window.loadReferralFeed = function() {
        var container = document.getElementById('referralTeamFeed');
        if (!container || !USER_UID) return;
        container.innerHTML = '<div class="referrals-empty">Загружаем ленту команды…</div>';
        functionsApi().httpsCallable('getReferralFeed')({ site: SITE }).then(function(result) {
            renderTeamFeed(result.data || []);
        }).catch(function(error) {
            console.error('Не удалось загрузить ленту команды:', error);
            container.innerHTML = '<div class="referrals-empty">Не удалось загрузить ленту. Проверь доступность Cloud Functions.</div>';
        });
    };

    window.showReferralTab = function(tab) {
        referralTab = tab === 'feed' ? 'feed' : 'members';
        document.querySelectorAll('[data-referral-tab]').forEach(function(button) {
            button.classList.toggle('active', button.getAttribute('data-referral-tab') === referralTab);
        });
        var members = document.getElementById('referralMembersList');
        var feed = document.getElementById('referralTeamFeed');
        if (members) members.hidden = referralTab !== 'members';
        if (feed) feed.hidden = referralTab !== 'feed';
        if (referralTab === 'feed') window.loadReferralFeed();
    };

    rememberReferralCode();
    if (auth.currentUser) window.handleReferralAfterLogin(auth.currentUser);
    document.addEventListener('DOMContentLoaded', function() {
        if (USER_UID && document.getElementById('page-referrals').classList.contains('active')) window.loadReferralDashboard();
    });
})();
