// CPM2 is the second currency in the existing ambassador bank and transfer ledger.
(function() {
    'use strict';
    var site = 'www_metaimperiya_com';
    var bank = null;
    var users = {};
    var transfers = {};
    var refs = [];
    var profileTarget = '';
    var numberFormat = new Intl.NumberFormat('ru-RU');
    function money(value) { return numberFormat.format(Number(value) || 0); }
    function uid() { return window.USER_UID || (firebase.auth().currentUser && firebase.auth().currentUser.uid) || ''; }
    function stop() { refs.forEach(function(ref) { ref.off(); }); refs = []; }
    function start() {
        stop();
        if (!uid()) { bank = null; users = {}; transfers = {}; render(); return; }
        var root = 'sites/' + site + '/';
        var bankRef = db.ref(root + 'ambassador_bank');
        var usersRef = db.ref(root + 'all_users');
        var transfersRef = db.ref(root + 'ambassador_transfers');
        refs = [bankRef, usersRef, transfersRef];
        bankRef.on('value', function(snap) { bank = snap.val() || null; render(); });
        usersRef.on('value', function(snap) { users = snap.val() || {}; render(); });
        transfersRef.on('value', function(snap) { transfers = snap.val() || {}; render(); });
    }
    function balances() {
        var result = {};
        Object.keys(users).forEach(function(id) { result[id] = 0; });
        Object.keys(bank && bank.cpm2Grants || {}).forEach(function(id) {
            var grant = bank.cpm2Grants[id] || {};
            if (grant.toUid) result[grant.toUid] = Number(result[grant.toUid] || 0) + Number(grant.amount || 0);
        });
        Object.keys(transfers).forEach(function(id) {
            var tx = transfers[id] || {};
            if (tx.currency !== 'cpm2') return;
            if (tx.fromUid && Object.prototype.hasOwnProperty.call(result, tx.fromUid)) result[tx.fromUid] -= Number(tx.amount || 0);
            if (tx.toUid && Object.prototype.hasOwnProperty.call(result, tx.toUid)) result[tx.toUid] = Number(result[tx.toUid] || 0) + Number(tx.amount || 0);
        });
        return result;
    }
    function setText(id, value) { var node = document.getElementById(id); if (node) node.textContent = value; }
    function render() {
        var wallets = balances();
        var reserve = Number(bank && bank.cpm2Total || 0);
        var supply = Object.keys(wallets).reduce(function(sum, key) { return sum + Number(wallets[key] || 0); }, 0) + reserve;
        var self = uid();
        var admin = !!self && (window.ADMIN_UIDS || []).indexOf(self) !== -1;
        var owner = !!bank && bank.ownerUid === self;
        var canManageBank = owner || (!bank && admin);
        setText('cpm2Reserve', money(reserve));
        setText('cpm2Balance', self ? money(wallets[self] || 0) : 'Войди');
        setText('cpm2Supply', money(supply));
        var bankControls = document.getElementById('cpm2BankControls');
        if (bankControls) bankControls.hidden = !canManageBank;
        var bankInput = document.getElementById('cpm2BankInput');
        if (bankInput && document.activeElement !== bankInput) bankInput.value = reserve;
        var issue = document.getElementById('cpm2Issue');
        if (issue) issue.hidden = !owner;
        var audit = document.getElementById('cpm2Audit');
        if (audit) audit.hidden = !admin;
        var targetUid = profileTarget || window.VIEWING_USER || self;
        var profileWallet = document.getElementById('profileCpm2Wallet');
        var profileBalance = document.getElementById('profileCpm2Balance');
        var profileGrant = document.getElementById('profileCpm2Grant');
        if (profileWallet) profileWallet.hidden = !targetUid;
        if (profileBalance) profileBalance.textContent = money(wallets[targetUid] || 0);
        if (profileGrant) profileGrant.hidden = !owner || targetUid === self;
        renderLedger(admin);
    }
    function renderLedger(admin) {
        var list = document.getElementById('cpm2AuditRows');
        if (!list || !admin) return;
        var entries = [];
        Object.keys(bank && bank.cpm2Adjustments || {}).forEach(function(key) {
            var item = bank.cpm2Adjustments[key] || {};
            entries.push({ type: 'bank_adjustment', amount: Number(item.delta || 0), actor: item.byName || users[item.byUid] && users[item.byUid].name || item.byUid || 'Администратор', target: 'резерв', at: item.at || 0 });
        });
        Object.keys(bank && bank.cpm2Grants || {}).forEach(function(key) {
            var item = bank.cpm2Grants[key] || {};
            entries.push({ type: item.type === 'referral' ? 'referral' : 'grant', amount: Number(item.amount || 0), actor: item.type === 'referral' ? 'Реферальная награда' : users[item.byUid] && users[item.byUid].name || item.byUid || 'Банк', target: item.toName || users[item.toUid] && users[item.toUid].name || item.toUid || 'участник', at: item.at || 0 });
        });
        Object.keys(transfers).forEach(function(key) {
            var item = transfers[key] || {};
            if (item.currency !== 'cpm2') return;
            entries.push({ type: item.kind === 'post_tip' ? 'tip' : 'transfer', amount: Number(item.amount || 0), actor: users[item.fromUid] && users[item.fromUid].name || item.fromUid || 'участник', target: users[item.toUid] && users[item.toUid].name || item.toUid || 'участник', at: item.at || 0, postKey: item.postKey || '' });
        });
        entries.sort(function(a, b) { return Number(b.at) - Number(a.at); });
        list.replaceChildren();
        var labels = { bank_adjustment: 'Изменение резерва', grant: 'Выдача из резерва', referral: 'Награда за реферала', transfer: 'Перевод', tip: 'Поддержка поста' };
        entries.slice(0, 30).forEach(function(entry) {
            var row = document.createElement('div'); row.className = 'cpm2-audit-row';
            var text = document.createElement('span'); text.textContent = (labels[entry.type] || 'Операция') + ' · ' + entry.actor + ' → ' + entry.target;
            var amount = document.createElement('b'); amount.textContent = (entry.amount < 0 ? '−' : '+') + money(Math.abs(entry.amount));
            var time = document.createElement('small'); time.textContent = entry.at ? new Date(entry.at).toLocaleString('ru-RU') : '';
            row.append(text, amount, time); list.appendChild(row);
        });
        if (!entries.length) list.textContent = 'Операций пока нет.';
    }
    function report(message, error) {
        var node = document.getElementById('cpm2Feedback');
        if (node) { node.textContent = message; node.classList.toggle('is-error', !!error); }
    }
    window.loadCpm2ProfileBalance = function(profileUid) { profileTarget = profileUid || uid(); render(); };
    function init() {
        if (!document.getElementById('cpm2WalletPanel')) return;
        firebase.auth().onAuthStateChanged(start);
        document.getElementById('cpm2BankSave').addEventListener('click', function() {
            if (!window.setCpm2Bank) return report('Дождись загрузки банковского раздела.', true);
            window.setCpm2Bank(Number(document.getElementById('cpm2BankInput').value));
        });
        document.getElementById('cpm2Transfer').addEventListener('click', function() {
            var targetUid = document.getElementById('cpm2Recipient').value.trim();
            var amount = Number(document.getElementById('cpm2Amount').value);
            if (!targetUid || !Number.isSafeInteger(amount) || amount < 1) return report('Укажи UID получателя и целую сумму.', true);
            Promise.resolve(window.transferCpm2 && window.transferCpm2(targetUid, amount)).then(function(sent) {
                if (sent) report('Перевод CPM2 записан в общий журнал.', false);
                else report('Перевод не выполнен. Проверь баланс и участника.', true);
            });
        });
        var issue = document.getElementById('cpm2Issue');
        if (issue) issue.addEventListener('click', function() {
            var targetUid = document.getElementById('cpm2Recipient').value.trim();
            var amount = Number(document.getElementById('cpm2Amount').value);
            if (!targetUid || !Number.isSafeInteger(amount) || amount < 1) return report('Укажи UID получателя и целую сумму.', true);
            if (window.grantAmbassadorPoints) window.grantAmbassadorPoints(targetUid, amount, 'cpm2');
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
