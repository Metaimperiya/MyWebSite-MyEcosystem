// Общий демо-банк и кошельки участников хранятся в Realtime Database.
(function() {
    'use strict';
    var storageKey = 'mi_ambassador_board_demo_v1';
    var state;
    var sharedBank = null;
    var sharedParticipants = {};
    var sharedTransfers = {};
    var bankRef;
    var participantsRef;
    var transfersRef;
    var listenersStarted = false;
    var legacyBankCandidate = null;
    var bankReadError = false;
    var sampleState = {
        bank: 0,
        players: {},
        requests: [{ id: 'sample_request', title: 'Пример: нужны амбассадоры для приглашения участников', targetCount: 10, rate: 10, budget: 100, remaining: 100, completed: 0, ownerUid: 'sample_owner', ownerName: 'Образец заявки', status: 'open', isExample: true, createdAt: Date.now() - 3600000 }],
        ledger: [{ text: 'Демо-банк подготовлен для макета', amount: '+1 000 000', at: Date.now() }]
    };

    function readState() {
        try {
            var saved = localStorage.getItem(storageKey);
            if (saved) {
                var parsed = JSON.parse(saved);
                if (parsed && Array.isArray(parsed.requests)) {
                    if (Number.isInteger(parsed.bank) && parsed.bank >= 0 && parsed.bank <= 10000000) legacyBankCandidate = parsed.bank;
                    return { bank: 0, players: {}, requests: parsed.requests, ledger: Array.isArray(parsed.ledger) ? parsed.ledger : [] };
                }
            }
        } catch (error) { console.warn('Не удалось загрузить локальные данные демо-биржи.'); }
        return { bank: 0, players: {}, requests: JSON.parse(JSON.stringify(sampleState.requests)), ledger: [] };
    }
    function saveState() {
        try { localStorage.setItem(storageKey, JSON.stringify({ requests: state.requests, ledger: state.ledger })); }
        catch (error) { setFeedback('Браузер не сохранил демо-состояние.', true); }
    }
    function money(value) { return Math.max(0, Number(value) || 0).toLocaleString('ru-RU'); }
    function currentUid() { return typeof USER_UID !== 'undefined' && USER_UID ? USER_UID : 'guest'; }
    function currentName() { return typeof USER !== 'undefined' && USER ? USER : 'Ты'; }
    function player() { return state.players[currentUid()] || null; }
    function isBankOwner() { return !!sharedBank && sharedBank.ownerUid === currentUid(); }
    function canClaimBank() { return !sharedBank && typeof ADMIN_UIDS !== 'undefined' && ADMIN_UIDS.indexOf(currentUid()) !== -1; }
    function numberOrZero(value) { var number = Number(value); return Number.isFinite(number) ? number : 0; }
    function rebuildPlayers() {
        var players = {};
        Object.keys(sharedParticipants || {}).forEach(function(uid) {
            var participant = sharedParticipants[uid] || {};
            players[uid] = { name: participant.name || 'Участник', balance: 0, joinedAt: participant.joinedAt || 0 };
        });
        var grants = sharedBank && sharedBank.grants || {};
        Object.keys(grants).forEach(function(id) {
            var grant = grants[id] || {};
            if (players[grant.toUid]) players[grant.toUid].balance += numberOrZero(grant.amount);
        });
        Object.keys(sharedTransfers || {}).forEach(function(id) {
            var transfer = sharedTransfers[id] || {};
            if (players[transfer.fromUid]) players[transfer.fromUid].balance -= numberOrZero(transfer.amount);
            if (players[transfer.toUid]) players[transfer.toUid].balance += numberOrZero(transfer.amount);
        });
        state.players = players;
        state.bank = sharedBank ? numberOrZero(sharedBank.total) : 0;
    }
    function updateProfileWallet() {
        var targetUid = VIEWING_USER || USER_UID;
        var wallet = document.getElementById('profileGameWallet');
        var balance = document.getElementById('profileGameBalance');
        var join = document.getElementById('profileGameJoin');
        var grant = document.getElementById('profileGameGrant');
        var bankPanel = document.getElementById('profileGameBank');
        var bankAmount = document.getElementById('profileGameBankAmount');
        var bankInput = document.getElementById('profileBankAmount');
        var profilePlayer = state && state.players[targetUid];
        if (wallet) wallet.hidden = !targetUid || (!profilePlayer && targetUid !== USER_UID);
        if (balance) balance.textContent = money(profilePlayer ? profilePlayer.balance : 0);
        if (join) join.hidden = !(targetUid === USER_UID && !profilePlayer);
        if (grant) grant.hidden = !(targetUid && !!profilePlayer && isBankOwner());
        if (bankPanel) bankPanel.hidden = !(targetUid === USER_UID && (isBankOwner() || canClaimBank()));
        if (bankAmount) bankAmount.textContent = bankReadError ? 'нет доступа' : money(state ? state.bank : 0);
        if (bankInput && document.activeElement !== bankInput) bankInput.value = state ? state.bank : 0;
    }

    window.loadAmbassadorProfileBalance = function() { updateProfileWallet(); };
    window.joinAmbassadorGame = joinGame;
    window.grantProfileAmbassadorPoints = function() {
        var uid = VIEWING_USER || USER_UID;
        if (!uid || !isBankOwner()) return;
        var amount = Number(window.prompt('Сколько очков начислить этому участнику?', '100'));
        if (Number.isInteger(amount) && amount > 0) grantFromBank(uid, amount);
    };
    window.setAmbassadorBankFromProfile = function() {
        var input = document.getElementById('profileBankAmount');
        var amount = Number(input && input.value);
        if (!Number.isInteger(amount) || amount < 0 || amount > 10000000) { setFeedback('Укажи целое число от 0 до 10 000 000.', true); return; }
        setSharedBank(amount);
    };
    function subscribeSharedGame() {
        if (!USER_UID || !document.getElementById('ambassadorGame')) return;
        bankRef = db.ref('sites/' + SITE + '/ambassador_bank');
        participantsRef = db.ref('sites/' + SITE + '/ambassador_players');
        transfersRef = db.ref('sites/' + SITE + '/ambassador_transfers');
        if (listenersStarted) {
            bankRef.off('value'); participantsRef.off('value'); transfersRef.off('value');
        }
        listenersStarted = true;
        bankRef.on('value', function(snap) {
            bankReadError = false;
            sharedBank = snap.val() || null;
            rebuildPlayers(); refresh();
            if (!sharedBank && legacyBankCandidate !== null && canClaimBank()) {
                var amount = legacyBankCandidate;
                legacyBankCandidate = null;
                setSharedBank(amount);
            }
        }, function(error) {
            bankReadError = true;
            sharedBank = null;
            rebuildPlayers();
            refresh();
            setFeedback('Firebase отклонил чтение общего банка (' + error.message + '). Нужно опубликовать database.rules.json.', true);
        });
        participantsRef.on('value', function(snap) { sharedParticipants = snap.val() || {}; rebuildPlayers(); refresh(); }, function(error) { setFeedback('Не удалось загрузить список игроков: ' + error.message, true); });
        transfersRef.on('value', function(snap) { sharedTransfers = snap.val() || {}; rebuildPlayers(); refresh(); }, function(error) { setFeedback('Не удалось загрузить переводы: ' + error.message, true); });
    }
    function setFeedback(text, isError) {
        var node = document.getElementById('ambFeedback');
        if (node) { node.textContent = text || ''; node.classList.toggle('error', !!isError); }
        var profileNote = document.getElementById('profileGameFeedback');
        if (profileNote) { profileNote.textContent = text || ''; profileNote.classList.toggle('error', !!isError); }
    }
    function addLedger(text, amount) {
        state.ledger.unshift({ text: text, amount: amount || '', at: Date.now() });
        state.ledger = state.ledger.slice(0, 8);
    }
    function refresh() {
        var self = player();
        var bank = document.getElementById('ambBankTotal');
        var wallet = document.getElementById('ambMyBalance');
        var count = Object.keys(state.players).length;
        if (bank) bank.textContent = bankReadError ? 'Нет доступа' : money(state.bank);
        if (wallet) wallet.textContent = money(self ? self.balance : 0);
        var bankInput = document.getElementById('ambBankInput');
        if (bankInput && document.activeElement !== bankInput) bankInput.value = state.bank;
        var bankEdit = document.querySelector('.amb-bank-edit');
        if (bankEdit) bankEdit.hidden = !(isBankOwner() || canClaimBank());
        var bankNote = document.querySelector('.amb-bank-card > small');
        if (bankNote) bankNote.textContent = bankReadError ? 'Firebase отклонил чтение. Опубликуй database.rules.json.' : isBankOwner() ? 'Ты управляешь общим банком.' : canClaimBank() ? 'Задай общий банк — этот аккаунт станет банкиром.' : sharedBank ? 'Банк общий для всех участников.' : 'Ожидается настройка общего банка администратором.';
        var bankBadge = document.getElementById('ambBankBadge');
        if (bankBadge) bankBadge.textContent = bankReadError ? 'НЕТ ДОСТУПА' : sharedBank ? 'ОБЩИЙ' : 'ОЖИДАЕТ';
        updateProfileWallet();
        ['ambPlayerCount', 'ambPlayerCountAside'].forEach(function(id) { var node = document.getElementById(id); if (node) node.textContent = count; });
        var join = document.getElementById('ambJoinGame');
        if (join) { join.disabled = !!self || !USER_UID; join.textContent = self ? '✓ Ты в системе' : '＋ Войти в систему'; }
        renderPlayers();
        renderRequests();
        renderLedger();
        updateBudgetPreview();
        saveState();
    }
    function renderPlayers() {
        var list = document.getElementById('ambPlayerList');
        var select = document.getElementById('ambTransferTo');
        if (!list || !select) return;
        var players = Object.keys(state.players).map(function(uid) { return { uid: uid, data: state.players[uid] }; }).sort(function(a, b) { return b.data.balance - a.data.balance || b.data.joinedAt - a.data.joinedAt; });
        list.replaceChildren();
        players.forEach(function(entry) {
            var row = document.createElement('div'); row.className = 'amb-player-row';
            var avatar = document.createElement('span'); avatar.className = 'amb-player-avatar'; avatar.textContent = Array.from(entry.data.name || '?')[0] || '?';
            var copy = document.createElement('span'); copy.className = 'amb-player-copy';
            var name = document.createElement('strong'); name.textContent = entry.data.name || 'Игрок';
            var note = document.createElement('small'); note.textContent = entry.uid === currentUid() ? 'ты' : 'в игре';
            copy.append(name, note);
            var balance = document.createElement('b'); balance.textContent = money(entry.data.balance) + ' ◉';
            row.append(avatar, copy, balance);
            if (isBankOwner()) {
                var grant = document.createElement('button'); grant.type = 'button'; grant.className = 'amb-mini-grant'; grant.textContent = '＋'; grant.title = 'Выдать очки из общего банка';
                grant.addEventListener('click', function() {
                    var amount = Number(window.prompt('Сколько очков выдать пользователю ' + (entry.data.name || '') + '?', '100'));
                    if (Number.isInteger(amount) && amount > 0) grantFromBank(entry.uid, amount);
                });
                row.appendChild(grant);
            }
            list.appendChild(row);
        });
        if (!players.length) list.innerHTML = '<div class="amb-player-empty">Здесь появятся игроки, которые вступят в систему.</div>';
        var previous = select.value;
        select.innerHTML = '<option value="">Выбери игрока</option>' + players.filter(function(p) { return p.uid !== currentUid(); }).map(function(p) { return '<option value="' + encodeURIComponent(p.uid) + '">' + String(p.data.name || 'Участник').replace(/[&<>"']/g, '') + ' · ' + money(p.data.balance) + '</option>'; }).join('');
        if (previous) select.value = previous;
    }
    function requestCard(request) {
        var card = document.createElement('article'); card.className = 'amb-request-card';
        var top = document.createElement('div'); top.className = 'amb-request-top';
        var title = document.createElement('strong'); title.textContent = request.title;
        var status = document.createElement('span'); status.className = 'amb-request-status';
        status.textContent = request.status === 'done' ? 'ВЫПОЛНЕНО' : request.status === 'active' ? 'ЕСТЬ ИСПОЛНИТЕЛЬ' : 'ОТКРЫТА';
        top.append(title, status);
        var meta = document.createElement('div'); meta.className = 'amb-request-meta';
        var total = document.createElement('span'); total.innerHTML = 'Нужно: <b>' + money(request.targetCount) + '</b> приглашений';
        var rate = document.createElement('span'); rate.innerHTML = 'Награда: <b>' + money(request.rate) + '</b> очков / регистрация';
        var budget = document.createElement('span'); budget.innerHTML = 'Резерв: <b>' + money(request.remaining) + '</b> очков';
        meta.append(total, rate, budget);
        var foot = document.createElement('div'); foot.className = 'amb-request-foot';
        var owner = document.createElement('small'); owner.textContent = (request.ownerName || 'Игрок') + (request.isExample ? ' · демонстрационный пример' : '');
        var action = document.createElement('button'); action.type = 'button';
        if (request.status === 'done') { action.textContent = 'Выполнено'; action.disabled = true; }
        else if (request.ownerUid === currentUid()) { action.textContent = request.status === 'active' ? 'Ты заказчик · добавить пример' : 'Я заказчик'; action.disabled = request.status !== 'active'; }
        else if (request.status === 'active' && request.workerUid === currentUid()) action.textContent = '＋ Показать регистрацию';
        else { action.textContent = request.status === 'active' ? 'Уже принято' : 'Принять заявку'; action.disabled = request.status !== 'open' || !player(); }
        action.addEventListener('click', function() {
            if (!player()) { setFeedback('Сначала нажми «Войти в систему · +100».', true); return; }
            if (request.ownerUid === currentUid() && request.status === 'active') { completeReferral(request.id); return; }
            if (request.status === 'active' && request.workerUid === currentUid()) { completeReferral(request.id); return; }
            if (request.status !== 'open') return;
            request.status = 'active'; request.workerUid = currentUid(); request.workerName = currentName();
            request.demoLink = 'https://metaimperiya.com/?ref=DEMO-' + request.id;
            addLedger('Принята заявка «' + request.title.slice(0, 34) + '»', '');
            setFeedback('Заявка принята. Демонстрационная ссылка: ' + request.demoLink);
            refresh();
        });
        foot.append(owner, action);
        card.append(top, meta, foot);
        if (request.status === 'active' && request.workerUid === currentUid() && request.demoLink) {
            var link = document.createElement('small'); link.className = 'amb-demo-link'; link.textContent = 'Тестовая ссылка: ' + request.demoLink; card.appendChild(link);
        }
        return card;
    }
    function renderRequests() {
        var list = document.getElementById('ambRequestList');
        if (!list) return;
        list.replaceChildren();
        state.requests.slice().sort(function(a, b) { return b.createdAt - a.createdAt; }).forEach(function(item) { list.appendChild(requestCard(item)); });
    }
    function renderLedger() {
        var list = document.getElementById('ambLedger');
        if (!list) return;
        list.replaceChildren();
        var entries = (state.ledger || []).slice();
        Object.keys(sharedBank && sharedBank.grants || {}).forEach(function(id) {
            var grant = sharedBank.grants[id];
            entries.push({ text: 'Выдано ' + money(grant.amount) + ' очков · ' + (grant.toName || 'участнику'), amount: '−' + money(grant.amount), at: grant.at || 0 });
        });
        Object.keys(sharedTransfers || {}).forEach(function(id) {
            var transfer = sharedTransfers[id] || {};
            var from = state.players[transfer.fromUid] && state.players[transfer.fromUid].name || 'Участник';
            var to = state.players[transfer.toUid] && state.players[transfer.toUid].name || 'Участник';
            entries.push({ text: from + ' → ' + to, amount: money(transfer.amount), at: transfer.at || 0 });
        });
        entries.sort(function(a, b) { return Number(b.at || 0) - Number(a.at || 0); });
        if (!entries.length) { list.innerHTML = '<div class="amb-ledger-empty">Действий пока нет.</div>'; return; }
        entries.slice(0, 5).forEach(function(item) {
            var row = document.createElement('div'); row.className = 'amb-ledger-row';
            var text = document.createElement('span'); text.textContent = item.text;
            var amount = document.createElement('b'); amount.textContent = item.amount;
            row.append(text, amount); list.appendChild(row);
        });
    }
    function grantFromBank(uid, amount) {
        if (!isBankOwner() || !Number.isInteger(amount) || amount < 1 || !state.players[uid] || !bankRef) { setFeedback('Начислить очки может только банкир участнику системы.', true); return; }
        var grantId = bankRef.child('grants').push().key;
        bankRef.transaction(function(current) {
            if (!current || current.ownerUid !== currentUid() || Number(current.total) < amount) return;
            current.grants = current.grants || {};
            current.grants[grantId] = { toUid: uid, toName: state.players[uid].name, amount: amount, at: Date.now() };
            current.total = Number(current.total) - amount;
            current.updatedAt = Date.now();
            return current;
        }, function(error, committed) {
            if (error) setFeedback('Не удалось выдать очки: ' + error.message, true);
            else if (!committed) setFeedback('Банк не настроен или в нём недостаточно очков.', true);
            else setFeedback('Начислено ' + money(amount) + ' очков. Общий банк уменьшился на эту сумму.');
        });
    }

    window.grantAmbassadorPoints = function(uid, amount) { grantFromBank(uid, Number(amount)); };

    function setSharedBank(amount) {
        if ((!isBankOwner() && !canClaimBank()) || !bankRef) { setFeedback('Общим банком управляет только назначенный банкир.', true); return; }
        bankRef.transaction(function(current) {
            if (current && current.ownerUid !== currentUid()) return;
            current = current || { ownerUid: currentUid(), grants: {} };
            current.ownerUid = currentUid();
            current.grants = current.grants || {};
            current.total = amount;
            current.updatedAt = Date.now();
            return current;
        }, function(error, committed) {
            if (error) setFeedback('Не удалось сохранить общий банк: ' + error.message, true);
            else if (!committed) setFeedback('Этот общий банк уже закреплён за другим банкиром.', true);
            else setFeedback('Общий банк обновлён. Его новая сумма видна всем участникам.');
        });
    }

    function joinGame() {
        if (!USER_UID || player()) return;
        participantsRef.child(currentUid()).set({ name: currentName(), joinedAt: Date.now() })
            .then(function() { setFeedback('Ты вступил в систему. Начальный баланс — 0 очков.'); })
            .catch(function(error) { setFeedback('Не удалось вступить: ' + error.message, true); });
    }

    function transferPoints(uid, amount) {
        var self = player();
        if (!self || !uid || !state.players[uid]) { setFeedback('Вступи в игру и выбери участника.', true); return; }
        if (!Number.isInteger(amount) || amount < 1 || amount > self.balance) { setFeedback('Укажи целое число в пределах своего баланса.', true); return; }
        var transfer = { fromUid: currentUid(), toUid: uid, amount: amount, at: Date.now() };
        transfersRef.push().set(transfer).then(function() {
            var targetName = state.players[uid].name;
            setFeedback('Переведено ' + money(amount) + ' очков пользователю ' + targetName + '.');
        }).catch(function(error) { setFeedback('Перевод не прошёл: ' + error.message, true); });
    }
    function completeReferral(requestId) {
        var request = state.requests.find(function(item) { return item.id === requestId; });
        if (!request || request.status !== 'active' || !request.workerUid || request.remaining < request.rate) { setFeedback('Наградной резерв закончился.', true); return; }
        request.remaining -= request.rate; request.completed += 1;
        var worker = state.players[request.workerUid];
        if (worker) worker.balance += request.rate;
        if (request.completed >= request.targetCount || request.remaining < request.rate) request.status = 'done';
        addLedger('Пример регистрации по заявке', '+' + money(request.rate) + ' игроку');
        setFeedback('Демо-регистрация отмечена, награда добавлена к балансу исполнителя.'); refresh();
    }
    function updateBudgetPreview() {
        var count = Number(document.getElementById('ambRequestCount') && document.getElementById('ambRequestCount').value || 0);
        var rate = Number(document.getElementById('ambRequestRate') && document.getElementById('ambRequestRate').value || 0);
        var budget = document.getElementById('ambRequestBudget');
        if (budget) budget.value = money(count * rate) + ' очков';
    }
    function initialize() {
        if (!document.getElementById('ambassadorGame')) return;
        state = readState();
        state.bank = 0;
        state.players = {};
        var playerSlot = document.getElementById('ambPlayerSlot');
        var playerPanel = document.getElementById('ambPlayers');
        if (playerSlot && playerPanel) playerSlot.appendChild(playerPanel);
        var bankInput = document.getElementById('ambBankInput');
        if (bankInput) bankInput.value = state.bank;
        document.getElementById('ambBankSave').addEventListener('click', function() {
            var amount = Number(document.getElementById('ambBankInput').value);
            if (!Number.isInteger(amount) || amount < 0 || amount > 10000000) { setFeedback('Укажи целое число от 0 до 10 000 000.', true); return; }
            setSharedBank(amount);
        });
        document.getElementById('ambJoinGame').addEventListener('click', function() {
            joinGame();
        });
        document.getElementById('ambTransferButton').addEventListener('click', function() {
            var select = document.getElementById('ambTransferTo');
            var toUid = select.value ? decodeURIComponent(select.value) : '';
            var amount = Number(document.getElementById('ambTransferAmount').value);
            transferPoints(toUid, amount);
        });
        document.getElementById('ambCreateRequest').addEventListener('click', function() { document.getElementById('ambCreatePanel').hidden = false; document.getElementById('ambRequestTitle').focus(); });
        document.getElementById('ambCloseCreate').addEventListener('click', function() { document.getElementById('ambCreatePanel').hidden = true; });
        ['ambRequestCount', 'ambRequestRate'].forEach(function(id) { document.getElementById(id).addEventListener('input', updateBudgetPreview); });
        document.getElementById('ambPublishRequest').addEventListener('click', function() {
            var title = document.getElementById('ambRequestTitle').value.trim();
            var target = Number(document.getElementById('ambRequestCount').value);
            var rate = Number(document.getElementById('ambRequestRate').value);
            var self = player();
            if (!self) { setFeedback('Сначала вступи в демо-систему и получи стартовый баланс.', true); return; }
            if (title.length < 4 || !Number.isInteger(target) || target < 1 || !Number.isInteger(rate) || rate < 1) { setFeedback('Заполни описание и укажи целое число приглашений и награды.', true); return; }
            var budget = target * rate;
            if (budget > self.balance) { setFeedback('Не хватает очков: заявка резервирует ' + money(budget) + ', у тебя ' + money(self.balance) + '.', true); return; }
            self.balance -= budget;
            var request = { id: 'demo_' + Date.now().toString(36), title: title, targetCount: target, rate: rate, budget: budget, remaining: budget, completed: 0, ownerUid: currentUid(), ownerName: currentName(), status: 'open', createdAt: Date.now() };
            state.requests.unshift(request); addLedger('Опубликована заявка «' + title.slice(0, 34) + '»', 'зарезервировано ' + money(budget));
            document.getElementById('ambRequestTitle').value = ''; document.getElementById('ambCreatePanel').hidden = true;
            setFeedback('Заявка появилась на демо-бирже, очки зарезервированы локально.'); refresh();
        });
        document.getElementById('ambBoard').addEventListener('click', function(event) {
            var button = event.target.closest('[data-amb-tile]'); if (!button) return;
            var target = button.getAttribute('data-amb-tile');
            var lookup = { bank: '.amb-bank-card', referrals: '.amb-real-referrals', exchange: '#ambExchange', target: '#ambExchange', bonus: '#ambLedger', team: '#ambPlayers' };
            if (target === 'referrals') { var details = document.querySelector('.amb-real-referrals'); if (details) details.open = true; }
            var section = document.querySelector(lookup[target]); if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        document.getElementById('ambCopyAiBrief').addEventListener('click', function() {
            var brief = 'METAIMPERIYA: социальная платформа с реферальной программой и биржей амбассадорских заявок. Концепция в стиле настольной игры: администратор пополняет банк демо-очков, участники получают баланс, переводят очки и размещают заявки с наградой за подтверждённые регистрации. Оцени идею, предложи улучшения интерфейса и простые этапы реализации. Это пока визуальный прототип; начисления и регистрации не подключены к серверу.';
            navigator.clipboard.writeText(brief).then(function() { setFeedback('Вводные скопированы. Вставь их в ChatGPT, Gemini или DeepSeek.'); }).catch(function() { window.prompt('Скопируй вводные для ИИ:', brief); });
        });
        refresh();
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(function(user) {
                if (user) subscribeSharedGame();
                else {
                    if (bankRef) bankRef.off('value');
                    if (participantsRef) participantsRef.off('value');
                    if (transfersRef) transfersRef.off('value');
                    listenersStarted = false;
                    bankReadError = false;
                    sharedBank = null; sharedParticipants = {}; sharedTransfers = {};
                    rebuildPlayers(); refresh();
                }
            });
        }
    }
    document.addEventListener('DOMContentLoaded', initialize);
})();
