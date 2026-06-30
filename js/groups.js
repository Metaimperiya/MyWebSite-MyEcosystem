// ================================================================
// ГРУППЫ
// ================================================================

var GROUPS = [
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
    
    var el = document.getElementById('groupList');
    var html = '';
    
    GROUPS.forEach(function(g) {
        db.ref('rooms/' + SITE + '_' + g.id + '/messages').on('value', function(snap) {
            var el2 = document.querySelector('.group-card[data-id="' + g.id + '"] .count');
            if (el2) el2.textContent = snap.numChildren();
        });
        
        html += '<div class="group-card" data-id="' + g.id + '" onclick="openGroup(\'' + g.id + '\')"><div class="icon">' + g.name.split(' ')[0] + '</div><div class="name">' + g.name + '</div><div class="count">💬 <span class="count">0</span></div></div>';
    });
    
    el.innerHTML = html;
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

window.createRoom = function() {
    var name = document.getElementById('roomName').value.trim();
    if (!name || name.length < 2) { alert('Минимум 2 символа'); return; }
    GROUPS.push({ id: 'g_' + Date.now(), name: name });
    loadGroups();
    closeCreateRoom();
    alert('✅ Группа создана!');
};
