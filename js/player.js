// ================================================================
// МУЗЫКАЛЬНЫЙ ПЛЕЕР — ПОЛНАЯ ВЕРСИЯ (С WINAMP-СТИЛЕМ)
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

// ================================================================
// 1. ИНИЦИАЛИЗАЦИЯ
// ================================================================

function initAudio() {
    if (!audio) {
        audio = new Audio(PLAYLIST[currentTrack].url);
        audio.crossOrigin = 'anonymous';
        audio.addEventListener('timeupdate', function() {
            updateProgress();
            updateFullProgress();
        });
        audio.addEventListener('ended', function() {
            playNext();
        });
    }
    document.getElementById('trackName').textContent = PLAYLIST[currentTrack].name;
    document.getElementById('fullTrackName').textContent = PLAYLIST[currentTrack].name;
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

function updateFullProgress() {
    if (!audio) return;
    var current = document.getElementById('currentTimeFull');
    var total = document.getElementById('totalTimeFull');
    var fill = document.getElementById('progressFill');
    
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
        document.getElementById('playBtn').textContent = '▶';
        document.getElementById('playBtnFull').textContent = '▶';
    } else {
        audio.play().catch(function(e) { console.log('Ошибка:', e); });
        isPlaying = true;
        document.getElementById('playBtn').textContent = '⏸';
        document.getElementById('playBtnFull').textContent = '⏸';
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
    document.getElementById('trackName').textContent = PLAYLIST[currentTrack].name;
    document.getElementById('fullTrackName').textContent = PLAYLIST[currentTrack].name;
    updatePlaylistActive();
    updateFullProgress();
};

window.playNext = function() {
    currentTrack = (currentTrack + 1) % PLAYLIST.length;
    if (audio) {
        audio.src = PLAYLIST[currentTrack].url;
        if (isPlaying) audio.play().catch(function() {});
    }
    document.getElementById('trackName').textContent = PLAYLIST[currentTrack].name;
    document.getElementById('fullTrackName').textContent = PLAYLIST[currentTrack].name;
    updatePlaylistActive();
    updateFullProgress();
};

window.playPrev = function() {
    currentTrack = (currentTrack - 1 + PLAYLIST.length) % PLAYLIST.length;
    if (audio) {
        audio.src = PLAYLIST[currentTrack].url;
        if (isPlaying) audio.play().catch(function() {});
    }
    document.getElementById('trackName').textContent = PLAYLIST[currentTrack].name;
    document.getElementById('fullTrackName').textContent = PLAYLIST[currentTrack].name;
    updatePlaylistActive();
    updateFullProgress();
};

// ================================================================
// 4. ПЛЕЙЛИСТ
// ================================================================

window.togglePlaylist = function() {
    document.getElementById('playlistDropdown').classList.toggle('open');
};

function updatePlaylistActive() {
    var items = document.querySelectorAll('.playlist-item');
    items.forEach(function(el, i) {
        if (i === currentTrack) el.classList.add('active');
        else el.classList.remove('active');
    });
}

// ================================================================
// 5. ПОЛНОЭКРАННЫЙ ПЛЕЕР (WINAMP-СТИЛЬ)
// ================================================================

window.toggleFullPlayer = function() {
    var player = document.getElementById('fullPlayer');
    if (!player) return;
    player.classList.toggle('open');
    
    // Обновляем информацию в полном плеере
    document.getElementById('fullTrackName').textContent = PLAYLIST[currentTrack].name;
    updateFullProgress();
    
    // Обновляем кнопку воспроизведения
    var btn = document.getElementById('playBtnFull');
    if (btn) btn.textContent = isPlaying ? '⏸' : '▶';
};

// Закрываем полный плеер по Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        var player = document.getElementById('fullPlayer');
        if (player && player.classList.contains('open')) {
            player.classList.remove('open');
        }
    }
});

// ================================================================
// 6. МЕНЮ НАСТРОЕК (ТРИ ТОЧКИ)
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

// Закрываем меню при клике вне
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
// 7. ЗАПУСК
// ================================================================

initAudio();
