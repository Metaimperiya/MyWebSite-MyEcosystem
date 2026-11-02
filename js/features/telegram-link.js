// One-time account pairing codes for the CPM2 Telegram bot.
(function() {
    'use strict';
    var alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    function randomCode() {
        var bytes = new Uint8Array(10);
        window.crypto.getRandomValues(bytes);
        return Array.from(bytes, function(value) { return alphabet[value % alphabet.length]; }).join('');
    }
    function init() {
        var panel = document.getElementById('cpm2TelegramConnect');
        if (!panel || typeof auth === 'undefined') return;
        auth.onAuthStateChanged(function(user) {
            panel.hidden = !user;
            var status = document.getElementById('cpm2TelegramLinkStatus');
            if (user && status) status.textContent = 'Открой бота и отправь ему команду /link КОД.';
        });
    }
    window.createCpm2TelegramLinkCode = function() {
        var button = document.getElementById('cpm2TelegramLinkButton');
        var status = document.getElementById('cpm2TelegramLinkStatus');
        var user = typeof auth !== 'undefined' ? auth.currentUser : null;
        if (!user || !USER_UID) { if (status) status.textContent = 'Сначала войди на сайт.'; return; }
        if (button) button.disabled = true;
        var code = randomCode();
        var now = Date.now();
        var oldCode = localStorage.getItem('telegram_link_code_' + user.uid);
        var codesRef = db.ref('sites/' + SITE + '/telegram_link_codes');
        var cleanup = oldCode ? codesRef.child(oldCode).once('value').then(function(snapshot) {
            var old = snapshot.val();
            if (old && old.uid === user.uid && Number(old.expiresAt) <= now) return snapshot.ref.remove();
        }).catch(function() {}) : Promise.resolve();
        cleanup.then(function() { return codesRef.child(code).set({
            uid: user.uid, createdAt: now, expiresAt: now + 10 * 60 * 1000
        }); }).then(function() {
            localStorage.setItem('telegram_link_code_' + user.uid, code);
            if (status) status.innerHTML = 'Код действует 10 минут. Открой Telegram-бота и отправь: <code>/link ' + code + '</code>';
            if (button) button.textContent = 'Создать новый код';
        }).catch(function(error) {
            if (status) status.textContent = 'Не получилось создать код: ' + (error.message || 'проверь Database Rules');
        }).finally(function() { if (button) button.disabled = false; });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
