// ================================================================
// МУЗЫКАЛЬНЫЙ ПЛЕЕР — ПОЛНАЯ ВЕРСИЯ
// ================================================================

const PLAYLIST = [
    { name: 'Capitulation', url: 'https://raw.githubusercontent.com/Metaimperiya/MyWebSite-MyEcosystem/main/music/capitulation.mp3' },
    { name: 'Clean Victory', url: 'https://raw.githubusercontent.com/Metaimperiya/MyWebSite-MyEcosystem/main/music/clean_victory.mp3' },
    { name: 'Covenant of Change', url: 'https://raw.githubusercontent.com/Metaimperiya/MyWebSite-MyEcosystem/main/music/covenant_of_change.mp3' },
    { name: 'Dreams in the Wind', url: 'https://raw.githubusercontent.com/Metaimperiya/MyWebSite-MyEcosystem/main/music/dreams_in_the_wind.mp3' },
    { name: 'Memory Like Dust', url: 'https://raw.githubusercontent.com/Metaimperiya/MyWebSite-MyEcosystem/main/music/memory_like_dust_path_like_fire.mp3' },
    { name: 'Nobody', url: 'https://raw.githubusercontent.com/Metaimperiya/MyWebSite-MyEcosystem/main/music/nobody.mp3' },
    { name: 'Touch of Choice', url: 'https://raw.githubusercontent.com/Metaimperiya/MyWebSite-MyEcosystem/main/music/touch_of_choice.mp3' },
    { name: 'You Are Not in the Game', url: 'https://raw.githubusercontent.com/Metaimperiya/MyWebSite-MyEcosystem/main/music/you_are_not_in_the_game.mp3' },
    { name: 'You Can\'t See Me', url: 'https://raw.githubusercontent.com/Metaimperiya/MyWebSite-MyEcosystem/main/music/you_cant_see_me.mp3' }
];

let currentTrack = 0;
let isPlaying = false;
let audio = null;
let drawerOpen = false;
let isDragging = false;
let drawerStartY = 0;

// ================================================================
// 1. ИНИЦИАЛИЗАЦИЯ
// ================================================================

function initAudio() {
    if (!audio) {
        audio = new Audio(PLAYLIST[currentTrack].url);
        audio.crossOrigin = 'anonymous';
        audio.addEventListener('timeupdate', function() {
            updateProgress();
            updateDrawerProgress();
        });
        audio.addEventListener('ended', function() {
            playNext();
        });
    }
    
    // Проверяем, что элементы существуют
    var trackName = document.getElementById('trackName');
    var drawerTrackName = document.getElementById('drawerTrackName');
    if (trackName) trackName.textContent = PLAYLIST[currentTrack].name;
    if (drawerTrackName) drawerTrackName.textContent = PLAYLIST[currentTrack].name;
    updatePlaylistActive();
}

// ================================================================
// 2. ОБНОВЛЕНИЕ ПРОГРЕССА
// ================================================================

function updateProgress() {
    if (!audio) return;
    var current = document.getElementById('currentTime');
    if (current) current.textContent = formatTime(audio.currentTime);
}

function updateDrawerProgress() {
    if (!audio) return;
    var current = document.getElementById('drawerCurrentTime');
    var total = document.getElementById('drawerTotalTime');
    var fill = document.getElementById('drawerProgressFill');
    
    if (current) current.textContent = formatTime(audio.currentTime);
    if (total) total.textContent = formatTime(audio.duration || 0);
    if (fill) {
        var percent = audio.duration ? (audio.currentTime / audio.duration * 100) : 0;
        fill.style.width = percent + '%';
    }
}

// ================================================================
// 3. УПРАВЛЕНИЕ ВОСПРОИЗВЕДЕНИЕМ
// ================================================================

window.togglePlay = function() {
    initAudio();
    if (!audio) return;
    
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        var playBtn = document.getElementById('playBtn');
        var drawerPlayBtn = document.getElementById('drawerPlayBtn');
        if (playBtn) playBtn.textContent = '▶';
        if (drawerPlayBtn) drawerPlayBtn.textContent = '▶';
    } else {
        audio.play().catch(function(e) { console.log('Ошибка:', e); });
        isPlaying = true;
        var playBtn = document.getElementById('playBtn');
        var drawerPlayBtn = document.getElementById('drawerPlayBtn');
        if (playBtn) playBtn.textContent = '⏸';
        if (drawerPlayBtn) drawerPlayBtn.textContent = '⏸';
    }
};

window.playTrack = function(index) {
    if (index === currentTrack && isPlaying) {
        togglePlay();
        return;
    }
    
    currentTrack = index;
    if (audio) {
        audio.src = PLAYLIST[currentTrack].url;
        if (isPlaying) audio.play().catch(function() {});
    } else {
        initAudio();
        togglePlay();
    }
    
    var trackName = document.getElementById('trackName');
    var drawerTrackName = document.getElementById('drawerTrackName');
    if (trackName) trackName.textContent = PLAYLIST[currentTrack].name;
    if (drawerTrackName) drawerTrackName.textContent = PLAYLIST[currentTrack].name;
    updatePlaylistActive();
    updateDrawerProgress();
};

window.playNext = function() {
    currentTrack = (currentTrack + 1) % PLAYLIST.length;
    if (audio) {
        audio.src = PLAYLIST[currentTrack].url;
        if (isPlaying) audio.play().catch(function() {});
    }
    var trackName = document.getElementById('trackName');
    var drawerTrackName = document.getElementById('drawerTrackName');
    if (trackName) trackName.textContent = PLAYLIST[currentTrack].name;
    if (drawerTrackName) drawerTrackName.textContent = PLAYLIST[currentTrack].name;
    updatePlaylistActive();
    updateDrawerProgress();
};

window.playPrev = function() {
    currentTrack = (currentTrack - 1 + PLAYLIST.length) % PLAYLIST.length;
    if (audio) {
        audio.src = PLAYLIST[currentTrack].url;
        if (isPlaying) audio.play().catch(function() {});
    }
    var trackName = document.getElementById('trackName');
    var drawerTrackName = document.getElementById('drawerTrackName');
    if (trackName) trackName.textContent = PLAYLIST[currentTrack].name;
    if (drawerTrackName) drawerTrackName.textContent = PLAYLIST[currentTrack].name;
    updatePlaylistActive();
    updateDrawerProgress();
};

// ================================================================
// 4. ПЛЕЙЛИСТ
// ================================================================

function updatePlaylistActive() {
    var items = document.querySelectorAll('.playlist-item');
    items.forEach(function(el, i) {
        if (i === currentTrack) el.classList.add('active');
        else el.classList.remove('active');
    });
}

// ================================================================
// 5. ВЫДВИЖНОЙ ПЛЕЕР (СВЕРХУ)
// ================================================================

window.toggleDrawer = function() {
    var drawer = document.getElementById('playerDrawer');
    if (!drawer) return;
    drawerOpen = !drawerOpen;
    drawer.classList.toggle('open', drawerOpen);
    if (drawerOpen) {
        updateDrawerProgress();
    }
};

window.toggleDrawerPlaylist = function() {
    var playlist = document.getElementById('drawerPlaylist');
    if (playlist) {
        playlist.style.display = playlist.style.display === 'none' ? 'block' : 'none';
    }
};

// ================================================================
// 6. ПЕРЕТАСКИВАНИЕ ПЛЕЕРА
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    var handle = document.getElementById('playerHandle');
    var drawer = document.getElementById('playerDrawer');

    if (handle && drawer) {
        handle.addEventListener('mousedown', function(e) {
            isDragging = true;
            drawerStartY = e.clientY;
            drawer.style.transition = 'none';
            e.preventDefault();
        });

        handle.addEventListener('touchstart', function(e) {
            isDragging = true;
            drawerStartY = e.touches[0].clientY;
            drawer.style.transition = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            var deltaY = e.clientY - drawerStartY;
            var drawerHeight = drawer.offsetHeight;
            var offset = -drawerHeight + deltaY;
            if (offset > 0) offset = 0;
            if (offset < -drawerHeight) offset = -drawerHeight;
            drawer.style.transform = 'translateY(' + offset + 'px)';
        });

        document.addEventListener('touchmove', function(e) {
            if (!isDragging) return;
            var deltaY = e.touches[0].clientY - drawerStartY;
            var drawerHeight = drawer.offsetHeight;
            var offset = -drawerHeight + deltaY;
            if (offset > 0) offset = 0;
            if (offset < -drawerHeight) offset = -drawerHeight;
            drawer.style.transform = 'translateY(' + offset + 'px)';
        });

        document.addEventListener('mouseup', function() {
            if (!isDragging) return;
            isDragging = false;
            drawer.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            
            var drawerHeight = drawer.offsetHeight;
            var offset = parseFloat(drawer.style.transform.replace('translateY(', '').replace('px)', '')) || -drawerHeight;
            var percentOpen = ((drawerHeight + offset) / drawerHeight) * 100;
            
            if (percentOpen > 40) {
                drawerOpen = true;
                drawer.style.transform = 'translateY(0)';
                drawer.classList.add('open');
            } else {
                drawerOpen = false;
                drawer.style.transform = 'translateY(-100%)';
                drawer.classList.remove('open');
            }
        });

        document.addEventListener('touchend', function() {
            if (!isDragging) return;
            isDragging = false;
            drawer.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            
            var drawerHeight = drawer.offsetHeight;
            var offset = parseFloat(drawer.style.transform.replace('translateY(', '').replace('px)', '')) || -drawerHeight;
            var percentOpen = ((drawerHeight + offset) / drawerHeight) * 100;
            
            if (percentOpen > 40) {
                drawerOpen = true;
                drawer.style.transform = 'translateY(0)';
                drawer.classList.add('open');
            } else {
                drawerOpen = false;
                drawer.style.transform = 'translateY(-100%)';
                drawer.classList.remove('open');
            }
        });
    }
});

// ================================================================
// 7. МЕНЮ НАСТРОЕК (ТРИ ТОЧКИ)
// ================================================================

window.toggleSettingsMenu = function() {
    var dropdown = document.getElementById('settingsDropdown');
    if (!dropdown) return;
    dropdown.classList.toggle('open');
};

window.closeSettingsMenu = function() {
    var dropdown = document.getElementById('settingsDropdown');
    if (dropdown) dropdown.classList.remove('open');
};

document.addEventListener('click', function(e) {
    var dropdown = document.getElementById('settingsDropdown');
    var dots = document.querySelector('.menu-dots');
    if (dropdown && dots) {
        if (!dropdown.contains(e.target) && !dots.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    }
});

// ================================================================
// 8. ЗАПУСК
// ================================================================

initAudio();
