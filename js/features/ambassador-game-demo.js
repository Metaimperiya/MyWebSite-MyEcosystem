// Интерактивный локальный макет биржи амбассадоров. Не пишет данные в Firebase.
(function() {
    'use strict';
    var storageKey = 'mi_ambassador_board_demo_v1';
    var state;
    var sampleState = {
        bank: 999940,
        players: {
            'sample_01': { name: 'Игрок-пример 01', balance: 40, joinedAt: Date.now() - 86400000, sample: true },
            'sample_02': { name: 'Игрок-пример 02', balance: 20, joinedAt: Date.now() - 43200000, sample: true }
        },
        requests: [{ id: 'sample_request', title: 'Пример: нужны амбассадоры для приглашения участников', targetCount: 10, rate: 10, budget: 100, remaining: 100, completed: 0, ownerUid: 'sample_owner', ownerName: 'Образец заявки', status: 'open', isExample: true, createdAt: Date.now() - 3600000 }],
        ledger: [{ text: 'Демо-банк подготовлен для макета', amount: '+1 000 000', at: Date.now() }]
    };

    function readState() {
        try {
            var saved = localStorage.getItem(storageKey);
            if (saved) {
                var parsed = JSON.parse(saved);
                if (parsed && typeof parsed.bank === 'number' && parsed.players && Array.isArray(parsed.requests)) return parsed;
            }
        } catch (error) { console.warn('Не удалось загрузить локальные данные демо-биржи.'); }
        return JSON.parse(JSON.stringify(sampleState));
    }
    function saveState() {
        try { localStorage.setItem(storageKey, JSON.stringify(state)); }
        catch (error) { setFeedback('Браузер не сохранил демо-состояние.', true); }
    }
    function money(value) { return Math.max(0, Number(value) || 0).toLocaleString('ru-RU'); }
    function currentUid() { return typeof USER_UID !== 'undefined' && USER_UID ? USER_UID : 'guest'; }
    function currentName() { return typeof USER !== 'undefined' && USER ? USER : 'Ты'; }
    function player() { return state.players[currentUid()] || null; }
    function setFeedback(text, isError) {
        var node = document.getElementById('ambFeedback');
        if (node) { node.textContent = text || ''; node.classList.toggle('error', !!isError); }
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
        if (bank) bank.textContent = money(state.bank);
        if (wallet) wallet.textContent = money(self ? self.balance : 0);
        ['ambPlayerCount', 'ambPlayerCountAside'].forEach(function(id) { var node = document.getElementById(id); if (node) node.textContent = count; });
        var join = document.getElementById('ambJoinGame');
        if (join) { join.disabled = !!self; join.textContent = self ? '✓ Ты в системе' : '＋ Войти в систему · +100'; }
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
        var players = Object.keys(state.players).map(function(uid) { return { uid: uid, data: state.players[uid] }; });
        list.replaceChildren();
        players.forEach(function(entry) {
            var row = document.createElement('div'); row.className = 'amb-player-row';
            var avatar = document.createElement('span'); avatar.className = 'amb-player-avatar'; avatar.textContent = Array.from(entry.data.name || '?')[0] || '?';
            var copy = document.createElement('span'); copy.className = 'amb-player-copy';
            var name = document.createElement('strong'); name.textContent = entry.data.name || 'Игрок';
            var note = document.createElement('small'); note.textContent = entry.data.sample ? 'демо-образец' : (entry.uid === currentUid() ? 'ты' : 'в игре');
            copy.append(name, note);
            var balance = document.createElement('b'); balance.textContent = money(entry.data.balance) + ' ◉';
            row.append(avatar, copy, balance);
            if (entry.uid !== currentUid()) {
                var grant = document.createElement('button'); grant.type = 'button'; grant.className = 'amb-mini-grant'; grant.textContent = '+100'; grant.title = 'Демо: выдать 100 очков из банка';
                grant.addEventListener('click', function() { grantFromBank(entry.uid, 100); });
                row.appendChild(grant);
            }
            list.appendChild(row);
        });
        if (!players.length) list.innerHTML = '<div class="amb-player-empty">Здесь появятся игроки, которые вступят в систему.</div>';
        var previous = select.value;
        select.innerHTML = '<option value="">Выбери игрока</option>' + players.filter(function(p) { return p.uid !== currentUid(); }).map(function(p) { return '<option value="' + encodeURIComponent(p.uid) + '">' + p.data.name.replace(/[&<>"']/g, '') + ' · ' + money(p.data.balance) + '</option>'; }).join('');
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
        if (!state.ledger.length) { list.innerHTML = '<div class="amb-ledger-empty">Действий пока нет.</div>'; return; }
        state.ledger.slice(0, 5).forEach(function(item) {
            var row = document.createElement('div'); row.className = 'amb-ledger-row';
            var text = document.createElement('span'); text.textContent = item.text;
            var amount = document.createElement('b'); amount.textContent = item.amount;
            row.append(text, amount); list.appendChild(row);
        });
    }
    function grantFromBank(uid, amount) {
        if (state.bank < amount || !state.players[uid]) { setFeedback('В банке недостаточно демо-очков.', true); return; }
        state.bank -= amount; state.players[uid].balance += amount;
        addLedger('Начислено ' + amount + ' игроку ' + state.players[uid].name, '−' + money(amount));
        setFeedback('Демо-очки выданы из банка.'); refresh();
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
        var playerSlot = document.getElementById('ambPlayerSlot');
        var playerPanel = document.getElementById('ambPlayers');
        if (playerSlot && playerPanel) playerSlot.appendChild(playerPanel);
        document.getElementById('ambBankInput').value = state.bank;
        document.getElementById('ambBankSave').addEventListener('click', function() {
            var amount = Number(document.getElementById('ambBankInput').value);
            if (!Number.isInteger(amount) || amount < 0 || amount > 10000000) { setFeedback('Укажи целое число от 0 до 10 000 000.', true); return; }
            state.bank = amount; addLedger('Размер общего демо-банка изменён', money(amount)); setFeedback('Банк обновлён только в этом браузере.'); refresh();
        });
        document.getElementById('ambJoinGame').addEventListener('click', function() {
            if (player()) return;
            if (state.bank < 100) { setFeedback('В банке не хватает 100 демо-очков для стартового баланса.', true); return; }
            state.bank -= 100; state.players[currentUid()] = { name: currentName(), balance: 100, joinedAt: Date.now(), sample: false };
            addLedger(currentName() + ' вступил(а) в демо-систему', '−100 из банка'); setFeedback('Ты в системе. Тебе начислен тестовый баланс 100 очков.'); refresh();
        });
        document.getElementById('ambTransferButton').addEventListener('click', function() {
            var select = document.getElementById('ambTransferTo');
            var toUid = select.value ? decodeURIComponent(select.value) : '';
            var amount = Number(document.getElementById('ambTransferAmount').value);
            var self = player();
            if (!self || !toUid || !state.players[toUid]) { setFeedback('Вступи в игру и выбери участника.', true); return; }
            if (!Number.isInteger(amount) || amount < 1 || amount > self.balance) { setFeedback('Укажи сумму в пределах своего баланса.', true); return; }
            self.balance -= amount; state.players[toUid].balance += amount;
            addLedger(currentName() + ' перевёл(а) ' + amount + ' игроку ' + state.players[toUid].name, '−' + money(amount));
            setFeedback('Демо-перевод выполнен.'); refresh();
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
    }
    document.addEventListener('DOMContentLoaded', initialize);
})();
