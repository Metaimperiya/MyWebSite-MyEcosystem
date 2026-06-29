const GROUPS = [
    { id: 'general', name: '🌍 Общий' },
    { id: 'sport', name: '⚽ Спорт' },
    { id: 'games', name: '🎮 Игры' },
    { id: 'movies', name: '🎬 Кино' },
    { id: 'music', name: '🎵 Музыка' },
    { id: 'tech', name: '💻 Технологии' },
    { id: 'food', name: '🍕 Еда' },
    { id: 'travel', name: '✈️ Путешествия' },
    { id: 'fashion', name: '👗 Мода' },
    { id: 'science', name: '🔬 Наука' }
];

function loadGroups() {
    if (!USER_UID) {
        document.getElementById('groupList').innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">Войдите</div>';
        return;
    }
    const el = document.getElementById('groupList');
    el.innerHTML = GROUPS.map(g => {
        db.ref('rooms/' + SITE + '_' + g.id + '/messages').on('value', snap => {
            const el2 = document.querySelector(`#groupList .group-card[data-id="${g.id}"] .count`);
            if (el2) el2.textContent = snap.numChildren();
        });
        return `<div class="group-card" data-id="${g.id}" onclick="openGroup('${g.id}')">
            <div class="icon">${g.name.split(' ')[0]}</div>
            <div class="name">${g.name}</div>
            <div class="count">💬 <span class="count">0</span></div>
        </div>`;
    }).join('');
}

window.openGroup = function(id) {
    if (!USER) { alert('Войдите!'); return; }
    CURRENT_ROOM = id;
    document.getElementById('chatView').classList.add('active');
    setActivePage(null);
    loadChat('rooms/' + SITE + '_' + id + '/messages');
    closeSidebar();
};

window.openCreateRoom = function() {
    document.getElementById('createRoomModal').classList.add('open');
    document.getElementById('roomName').value = '';
};

window.closeCreateRoom = function() {
    document.getElementById('createRoomModal').classList.remove('open');
};

window.doCreateRoom = function() {
    const name = document.getElementById('roomName').value.trim();
    if (!name || name.length < 2) { alert('Минимум 2 символа'); return; }
    GROUPS.push({ id: 'g_' + Date.now(), name: name });
    loadGroups();
    closeCreateRoom();
    alert('✅ Группа создана!');
};
