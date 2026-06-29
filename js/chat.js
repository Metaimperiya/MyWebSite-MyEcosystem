// ================================================================
// ЧАТ
// ================================================================

function loadChat(path) {
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    const box = document.getElementById('chatMessages');
    box.innerHTML = '<div style="color:#bbb;text-align:center;padding:6px;font-size:0.65rem;">⏳ Загрузка...</div>';
    chatUnsub = path;
    db.ref(path).orderByChild('timestamp').on('value', snap => {
        box.innerHTML = '';
        if (!snap.exists()) {
            box.innerHTML = '<div style="color:#bbb;text-align:center;padding:6px;font-size:0.65rem;">Сообщений нет</div>';
            return;
        }
        snap.forEach(s => {
            const m = s.val();
            const div = document.createElement('div');
            div.className = 'msg';
            div.innerHTML = `<span class="author">${esc(m.nick || '?')}</span><span class="time">${m.time || ''}</span><div>${esc(m.text || '')}</div>`;
            box.appendChild(div);
        });
        box.scrollTop = box.scrollHeight;
    });
}

window.sendChat = function() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || !CURRENT_ROOM) return;
    db.ref('rooms/' + SITE + '_' + CURRENT_ROOM + '/messages').push({
        nick: USER,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    });
    input.value = '';
};

document.getElementById('chatInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') sendChat();
});

window.closeChat = function() {
    document.getElementById('chatView').classList.remove('active');
    if (chatUnsub) {
        if (typeof chatUnsub === 'string') db.ref(chatUnsub).off('value');
        chatUnsub = null;
    }
    CURRENT_ROOM = null;
    if (document.getElementById('groupsPage').classList.contains('active')) goToGroups();
    else if (document.getElementById('peoplePage').classList.contains('active')) goToPeople();
    else if (document.getElementById('profilePage').classList.contains('active')) goToProfile();
    else goToFeed();
};
