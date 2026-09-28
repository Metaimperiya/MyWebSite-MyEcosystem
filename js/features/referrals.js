// Реферальная система и лента команды. Атрибуцию и реферальные счётчики
// меняют только Cloud Functions; клиент получает только личную сводку.
(function() {
    'use strict';

    var referralFunctions = null;
    var referralDashboard = null;
    var referralBusy = false;
    var referralClaimInFlightFor = null;
    var referralTab = 'members';
    var referralAdminRows = [];
    var referralAdminTimer = null;
    var referralUserDirectoryPromise = null;
    var REFERRAL_PENDING_KEY = 'mi_pending_referral_v1';
    var DEMO_REFERRAL_POINTS = 1;

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
        code = code.trim();
        if (/^[A-Za-z0-9_-]{10,128}$/.test(code)) {
            if (/^[a-f0-9]{12}$/i.test(code)) code = code.toUpperCase();
            try { localStorage.setItem(REFERRAL_PENDING_KEY, code); } catch (error) { console.warn('Не удалось сохранить приглашение в браузере.'); }
        }
    }

    window.handleReferralAfterLogin = function(user) {
        rememberReferralCode();
        var code = '';
        try { code = localStorage.getItem(REFERRAL_PENDING_KEY) || ''; } catch (error) { return; }
        if (!user || !code || referralClaimInFlightFor === user.uid) return;
        referralClaimInFlightFor = user.uid;
        claimDemoReferral(user, code).then(function(result) {
            if (result && result.claimed) console.info('Демо-приглашение закреплено.');
            if (result && result.reason !== 'retry') localStorage.removeItem(REFERRAL_PENDING_KEY);
        }).catch(function(error) {
            console.warn('Не удалось сохранить демо-приглашение:', error);
        }).finally(function() { referralClaimInFlightFor = null; });
    };

    function walletPath(uid) { return 'sites/' + SITE + '/referral_wallets/' + uid; }

    function addDemoPoints(uid, amount, event) {
        if (!uid || !amount) return Promise.resolve();
        var ref = db.ref(walletPath(uid));
        var eventId = db.ref('sites/' + SITE + '/referral_wallet_events').push().key;
        return ref.transaction(function(current) {
            current = current || { balance: 0, transactions: {} };
            current.balance = Math.max(0, Number(current.balance || 0) + amount);
            current.transactions = current.transactions || {};
            current.transactions[eventId] = Object.assign({ amount: amount, at: Date.now() }, event || {});
            return current;
        }).then(function(result) {
            if (!result.committed) throw new Error('Не удалось начислить демо-очки.');
            return result.snapshot.val();
        });
    }

    function claimDemoReferral(user, code) {
        var createdAt = Date.parse(user.metadata && user.metadata.creationTime || '');
        if (!createdAt || Date.now() - createdAt > 7 * 24 * 60 * 60 * 1000) return Promise.resolve({ claimed: false, reason: 'account_not_new' });
        var referrerPromise = db.ref('sites/' + SITE + '/referral_codes/' + code).once('value').then(function(snapshot) {
            if (snapshot.exists()) return snapshot.child('uid').val();
            return code;
        });
        return referrerPromise.then(function(referrerUid) {
            if (!referrerUid || referrerUid === user.uid) return { claimed: false, reason: 'invalid_code' };
            return db.ref('sites/' + SITE + '/all_users/' + referrerUid).once('value').then(function(ownerSnapshot) {
                if (!ownerSnapshot.exists()) return { claimed: false, reason: 'invalid_code' };
                var attributionRef = db.ref('sites/' + SITE + '/referred_by/' + user.uid);
                return attributionRef.transaction(function(current) {
                    return current || { referrerUid: referrerUid, code: code, joinedAt: createdAt };
                }).then(function(result) {
                    var attribution = result.snapshot.val();
                    if (!result.committed || !attribution || attribution.referrerUid !== referrerUid) return { claimed: false, reason: 'already_attributed' };
                    return db.ref('sites/' + SITE + '/referral_ancestors/' + referrerUid).once('value').then(function(ancestorSnapshot) {
                        var ancestors = ancestorSnapshot.val() || {};
                        var ancestorUids = Object.keys(ancestors).sort(function(a, b) { return Number(ancestors[a]) - Number(ancestors[b]); }).slice(0, 100);
                        var updates = {};
                        var newAncestors = {};
                        newAncestors[referrerUid] = 1;
                        updates['sites/' + SITE + '/referrals/' + referrerUid + '/' + user.uid] = { joinedAt: createdAt };
                        updates['sites/' + SITE + '/referral_team/' + referrerUid + '/' + user.uid] = { depth: 1, joinedAt: createdAt, directReferrerUid: referrerUid };
                        ancestorUids.forEach(function(ancestorUid) {
                            var depth = Number(ancestors[ancestorUid] || 1) + 1;
                            newAncestors[ancestorUid] = depth;
                            updates['sites/' + SITE + '/referral_team/' + ancestorUid + '/' + user.uid] = { depth: depth, joinedAt: createdAt, directReferrerUid: referrerUid };
                        });
                        updates['sites/' + SITE + '/referral_ancestors/' + user.uid] = newAncestors;
                        return db.ref().update(updates).then(function() {
                            return Promise.all([referrerUid].concat(ancestorUids).map(function(ancestorUid) {
                                return addDemoPoints(ancestorUid, DEMO_REFERRAL_POINTS, { type: 'referral', referredUid: user.uid, directReferrerUid: referrerUid });
                            }));
                        }).then(function() { return { claimed: true, referrerUid: referrerUid }; });
                    });
                });
            });
        });
    }

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
        var userUids = Array.from(new Set(recentMembers.reduce(function(ids, member) { ids.push(member.uid); if (member.directReferrerUid) ids.push(member.directReferrerUid); return ids; }, [])));
        Promise.all(userUids.map(function(uid) {
            return db.ref('sites/' + SITE + '/all_users/' + uid).once('value').then(function(snapshot) {
                return [uid, snapshot.val() || {}];
            }).catch(function() { return [uid, {}]; });
        })).then(function(userRows) {
            if (!container.isConnected) return;
            var usersByUid = {};
            userRows.forEach(function(row) { usersByUid[row[0]] = row[1]; });
            container.innerHTML = recentMembers.map(function(member) {
                var user = usersByUid[member.uid] || {};
                var name = displayName(member, user);
                var avatar = user.avatarUrl ? '<img src="' + referralEscape(user.avatarUrl) + '" alt="" loading="lazy">' : '<span>' + referralEscape(Array.from(name)[0] || '?') + '</span>';
                var joined = member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
                var sourceName = member.depth === 1 ? 'ты' : displayName({ uid: member.directReferrerUid }, usersByUid[member.directReferrerUid] || {});
                var relation = member.depth === 1 ? 'Приглашён тобой' : 'Приглашён: ' + sourceName + ' · уровень ' + member.depth;
                return '<article class="referral-member"><span class="referral-avatar">' + avatar + '</span><span class="referral-member-info"><strong>' + referralEscape(name) + '</strong><span>' + referralEscape(relation) + (joined ? ' · ' + joined : '') + '</span></span><button type="button" data-referral-profile="' + referralEscape(member.uid) + '">Профиль</button></article>';
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
        referralStatus('Готовим ссылку…');
        var code = USER_UID;
        var link = 'https://metaimperiya.com/?ref=' + encodeURIComponent(code);
        db.ref('sites/' + SITE + '/referral_codes/' + code).transaction(function(current) { return current || { uid: USER_UID, createdAt: Date.now() }; })
        .then(function() {
            return Promise.all([
                db.ref('sites/' + SITE + '/referrals/' + USER_UID).once('value'),
                db.ref('sites/' + SITE + '/referral_team/' + USER_UID).once('value'),
                db.ref(walletPath(USER_UID)).once('value')
            ]);
        }).then(function(snapshots) {
            var direct = snapshots[0].val() || {};
            var team = snapshots[1].val() || {};
            var members = Object.keys(team).map(function(uid) { return Object.assign({ uid: uid }, team[uid] || {}); }).sort(function(a, b) { return Number(b.joinedAt || 0) - Number(a.joinedAt || 0); });
            var wallet = snapshots[2].val() || {};
            referralDashboard = { code: code, link: link, directCount: Object.keys(direct).length, teamCount: Object.keys(team).length, members: members, balance: Number(wallet.balance || 0) };
            referralStatus(referralDashboard.link || 'Не удалось подготовить ссылку.');
            var direct = document.getElementById('referralDirectCount');
            var total = document.getElementById('referralTeamCount');
            if (direct) direct.textContent = referralDashboard.directCount || 0;
            if (total) total.textContent = referralDashboard.teamCount || 0;
            var points = document.getElementById('referralPointsBalance');
            if (points) points.textContent = referralDashboard.balance;
            renderMembers(referralDashboard.members || []);
            if (referralTab === 'feed') window.loadReferralFeed();
            var adminPanel = document.getElementById('referralAdminPanel');
            if (adminPanel) adminPanel.hidden = !ADMIN_UIDS.includes(USER_UID);
            if (ADMIN_UIDS.includes(USER_UID)) window.loadReferralAdminPanel();
        }).catch(function(error) {
            console.error('Не удалось загрузить реферальную сводку:', error);
            referralStatus('Не удалось загрузить демо-кабинет: ' + (error.message || 'проверь подключение к Firebase.'), true);
        }).finally(function() { referralBusy = false; });
    };

    window.transferReferralPoints = function() {
        if (!USER_UID) return alert('Войди в аккаунт.');
        var uidInput = document.getElementById('referralTransferUid');
        var amountInput = document.getElementById('referralTransferAmount');
        var recipientUid = uidInput ? uidInput.value.trim() : '';
        var amount = Number(amountInput ? amountInput.value : 0);
        if (!recipientUid || recipientUid === USER_UID) return alert('Укажи UID другого участника.');
        if (!Number.isInteger(amount) || amount < 1 || amount > 1000000) return alert('Укажи количество от 1 до 1 000 000 демо-очков.');
        db.ref('sites/' + SITE + '/all_users/' + recipientUid).once('value').then(function(snapshot) {
            if (!snapshot.exists()) throw new Error('Пользователь с таким UID не найден.');
            var transferId = db.ref('sites/' + SITE + '/referral_wallet_events').push().key;
            return db.ref('sites/' + SITE + '/referral_wallets').transaction(function(wallets) {
                wallets = wallets || {};
                var sender = wallets[USER_UID] || { balance: 0, transactions: {} };
                var recipient = wallets[recipientUid] || { balance: 0, transactions: {} };
                if (Number(sender.balance || 0) < amount) return;
                sender.balance = Number(sender.balance || 0) - amount;
                recipient.balance = Number(recipient.balance || 0) + amount;
                sender.transactions = sender.transactions || {};
                recipient.transactions = recipient.transactions || {};
                var event = { type: 'transfer', amount: amount, fromUid: USER_UID, toUid: recipientUid, at: Date.now() };
                sender.transactions[transferId] = event;
                recipient.transactions[transferId] = event;
                wallets[USER_UID] = sender;
                wallets[recipientUid] = recipient;
                return wallets;
            });
        }).then(function(result) {
            if (!result.committed) throw new Error('Недостаточно демо-очков.');
            if (uidInput) uidInput.value = '';
            return window.loadReferralDashboard();
        }).catch(function(error) { alert('Перевод не выполнен: ' + (error.message || error)); });
    };

    var referralRecipientTimer = null;
    function loadReferralUserDirectory() {
        if (!referralUserDirectoryPromise) {
            referralUserDirectoryPromise = db.ref('sites/' + SITE + '/all_users').once('value').then(function(snapshot) {
                var users = [];
                snapshot.forEach(function(child) { users.push({ uid: child.key, user: child.val() || {} }); });
                return users;
            }).catch(function(error) { referralUserDirectoryPromise = null; throw error; });
        }
        return referralUserDirectoryPromise;
    }

    window.searchReferralRecipient = function(query) {
        clearTimeout(referralRecipientTimer);
        var list = document.getElementById('referralRecipientOptions');
        query = String(query || '').trim().toLocaleLowerCase('ru');
        if (!list || query.length < 2) { if (list) list.innerHTML = ''; return; }
        referralRecipientTimer = setTimeout(function() {
            loadReferralUserDirectory().then(function(users) {
                var matches = users.filter(function(entry) { return entry.uid !== USER_UID && (String(entry.user.name || '').toLocaleLowerCase('ru').includes(query) || entry.uid.toLocaleLowerCase('ru').includes(query)); }).map(function(entry) { return { uid: entry.uid, name: entry.user.name || 'Участник' }; });
                list.innerHTML = matches.slice(0, 12).map(function(user) { return '<option value="' + referralEscape(user.uid) + '" label="' + referralEscape(user.name) + '"></option>'; }).join('');
            }).catch(function(error) { console.warn('Не удалось найти получателя демо-очков:', error); });
        }, 250);
    };

    window.loadReferralAdminPanel = function() {
        if (!ADMIN_UIDS.includes(USER_UID)) return;
        var list = document.getElementById('referralAdminList');
        if (list) list.innerHTML = '<div class="referrals-empty">Собираю демо-цепочки…</div>';
        Promise.all([
            db.ref('sites/' + SITE + '/all_users').once('value'),
            db.ref('sites/' + SITE + '/referred_by').once('value'),
            db.ref('sites/' + SITE + '/referrals').once('value'),
            db.ref('sites/' + SITE + '/referral_wallets').once('value')
        ]).then(function(snapshots) {
            var users = snapshots[0].val() || {};
            var referredBy = snapshots[1].val() || {};
            var referrals = snapshots[2].val() || {};
            var wallets = snapshots[3].val() || {};
            referralAdminRows = Object.keys(users).map(function(uid) {
                var inviterUid = (referredBy[uid] || {}).referrerUid || '';
                var inviter = users[inviterUid] || {};
                return { uid: uid, name: users[uid].name || 'Участник', inviterUid: inviterUid, inviterName: inviter.name || '', joinedAt: Number((referredBy[uid] || {}).joinedAt || 0), directCount: Object.keys(referrals[uid] || {}).length, balance: Number((wallets[uid] || {}).balance || 0), transactions: (wallets[uid] || {}).transactions || {} };
            });
            renderReferralAdminRows();
        }).catch(function(error) {
            console.error('Не удалось загрузить кабинет амбассадоров:', error);
            if (list) list.innerHTML = '<div class="referrals-empty">Не удалось загрузить демо-кабинет. Проверь правила Realtime Database.</div>';
        });
    };

    function renderReferralAdminRows() {
        var list = document.getElementById('referralAdminList');
        var summary = document.getElementById('referralAdminSummary');
        if (!list) return;
        var input = document.getElementById('referralAdminSearch');
        var filter = document.getElementById('referralAdminFilter');
        var query = (input ? input.value : '').trim().toLocaleLowerCase('ru');
        var mode = filter ? filter.value : 'all';
        var ambassadors = referralAdminRows.filter(function(row) { return row.directCount > 0; }).length;
        var referralCount = referralAdminRows.filter(function(row) { return !!row.inviterUid; }).length;
        var pointTotal = referralAdminRows.reduce(function(sum, row) { return sum + row.balance; }, 0);
        if (summary) summary.textContent = 'Амбассадоров: ' + ambassadors + ' · регистраций по ссылке: ' + referralCount + ' · очков в прототипе: ' + pointTotal;
        var rows = referralAdminRows.filter(function(row) {
            if (mode === 'ambassadors' && !row.directCount) return false;
            if (mode === 'referred' && !row.inviterUid) return false;
            return !query || [row.name, row.uid, row.inviterName, row.inviterUid].join(' ').toLocaleLowerCase('ru').includes(query);
        }).sort(function(a, b) { return b.joinedAt - a.joinedAt || b.directCount - a.directCount; }).slice(0, 300);
        if (!rows.length) { list.innerHTML = '<div class="referrals-empty">Ничего не найдено.</div>'; return; }
        list.innerHTML = rows.map(function(row) {
            var ledger = Object.keys(row.transactions || {}).map(function(id) { return row.transactions[id]; }).sort(function(a, b) { return Number(b.at || 0) - Number(a.at || 0); }).slice(0, 8);
            var ledgerHtml = ledger.map(function(entry) {
                var description = entry.type === 'referral' ? 'Приглашён участник ' + (entry.referredUid || '') : entry.type === 'admin_grant' ? 'Начисление администратором ' + (entry.byUid || '') : entry.type === 'transfer' ? (entry.fromUid === row.uid ? 'Перевод пользователю ' + entry.toUid : 'Получено от пользователя ' + entry.fromUid) : 'Операция';
                var amountLabel = entry.type === 'transfer' && entry.fromUid === row.uid ? '−' + entry.amount : '+' + entry.amount;
                return '<div><span>' + referralEscape(description) + '</span><b>' + amountLabel + '</b><time>' + (entry.at ? new Date(entry.at).toLocaleString('ru-RU') : '') + '</time></div>';
            }).join('') || '<span class="referral-admin-no-ledger">Операций пока нет</span>';
            return '<article class="referral-admin-row"><div class="referral-admin-person"><strong>' + referralEscape(row.name) + '</strong><span>UID: ' + referralEscape(row.uid) + '</span><span>' + (row.inviterUid ? 'Пригласил: ' + referralEscape(row.inviterName || row.inviterUid) + ' · ' + referralEscape(row.inviterUid) : 'Пришёл без реферальной ссылки') + '</span><details class="referral-admin-ledger"><summary>История очков</summary>' + ledgerHtml + '</details></div><div class="referral-admin-stats"><span>Приглашено: <b>' + row.directCount + '</b></span><span>Очки: <b>' + row.balance + '</b></span><button type="button" data-referral-grant="' + referralEscape(row.uid) + '">＋ Начислить</button></div></article>';
        }).join('');
        list.querySelectorAll('[data-referral-grant]').forEach(function(button) {
            button.addEventListener('click', function() {
                var amountRaw = window.prompt('Сколько демо-очков начислить?', '10');
                if (amountRaw === null) return;
                var amount = Number(amountRaw);
                if (!Number.isInteger(amount) || amount < 1 || amount > 1000000) return alert('Укажи целое число от 1 до 1 000 000.');
                var targetUid = button.getAttribute('data-referral-grant');
                addDemoPoints(targetUid, amount, { type: 'admin_grant', byUid: USER_UID }).then(function() { if (targetUid === USER_UID) window.loadReferralDashboard(); else window.loadReferralAdminPanel(); }).catch(function(error) { alert('Не удалось начислить очки: ' + (error.message || error)); });
            });
        });
    }

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
        var adminSearch = document.getElementById('referralAdminSearch');
        var adminFilter = document.getElementById('referralAdminFilter');
        if (adminSearch) adminSearch.addEventListener('input', function() { clearTimeout(referralAdminTimer); referralAdminTimer = setTimeout(renderReferralAdminRows, 180); });
        if (adminFilter) adminFilter.addEventListener('change', renderReferralAdminRows);
    });
})();
