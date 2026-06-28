const ROOMS = [
    { id: 'general', name: 'Общий', icon: '🌍' },
    { id: 'sport', name: 'Спорт', icon: '⚽' },
    { id: 'games', name: 'Игры', icon: '🎮' },
    { id: 'movies', name: 'Кино', icon: '🎬' },
    { id: 'music', name: 'Музыка', icon: '🎵' },
    { id: 'tech', name: 'Технологии', icon: '💻' },
    { id: 'food', name: 'Еда', icon: '🍕' },
    { id: 'travel', name: 'Путешествия', icon: '✈️' },
    { id: 'fashion', name: 'Мода', icon: '👗' },
    { id: 'science', name: 'Наука', icon: '🔬' }
];

function loadRooms() {
    if (!USER_UID) return;
    const el = document.getElementById('roomsList');
    if (!el) return;
    let html = '';
    ROOMS.forEach(room => {
        db.ref('sites/' + SITE + '/rooms/' + room.id + '/count').on('value', snap => {
            const count = snap.val() || 0;
            const countEl = document.querySelector(`#room-${room.id} .count`);
            if (countEl) countEl.textContent = count;
        });
        html += `
            <div class="room-card" id="room-${room.id}" onclick="joinRoom('${room.id}')">
                <div class="icon">${room.icon}</div>
                <div class="name">${room.name}</div>
                <div class="count">👥 <span class="count">0</span></div>
            </div>
        `;
    });
    el.innerHTML = html;
}

function joinRoom(roomId) {
    if (!USER_UID) { alert('Войдите!'); return; }
    db.ref('sites/' + SITE + '/room_users/' + roomId + '/' + USER_UID).set({ name: USER, joinedAt: Date.now() });
    db.ref('sites/' + SITE + '/rooms/' + roomId + '/count').transaction(v => (v || 0) + 1);
    alert('✅ Вы вошли в группу!');
    loadRooms();
}
