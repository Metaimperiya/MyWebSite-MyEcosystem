// ================================================================
// МУЗЫКАЛЬНЫЙ ПЛЕЕР
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

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    var min = Math.floor(seconds / 60);
    var sec = Math.floor(seconds % 60);
    return min + ':' + (sec < 10 ? '0' : '') + sec;
}

function initAudio() {
    if (!audio) {
        audio = new Audio(PLAYLIST[currentTrack].url);
        audio.crossOrigin = 'anonymous';
        audio.addEventListener('timeupdate', function() {
            updateDrawerProgress();
        });
        audio.addEventListener('ended', function() {
            playNext();
        });
    }
    var drawerTrackName = document.getElementById('drawerTrackName');
    if (drawerTrackName) drawerTrackName.textContent = PLAYLIST[currentTrack].name;
    updatePlaylistActive();
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

window.togglePlay = function() {
    initAudio();
    if (!audio) return;
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        var drawerPlayBtn = document.getElementById('drawerPlayBtn');
        if (drawerPlayBtn) drawerPlayBtn.textContent = '▶';
    } else {
        audio.play().catch(function(e) { console.log('Ошибка:', e); });
        isPlaying = true;
        var drawerPlayBtn = document.getElementById('drawerPlayBtn');
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
    var drawerTrackName = document.getElementById('drawerTrackName');
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
    var drawerTrackName = document.getElementById('drawerTrackName');
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
    var drawerTrackName = document.getElementById('drawerTrackName');
    if (drawerTrackName) drawerTrackName.textContent = PLAYLIST[currentTrack].name;
    updatePlaylistActive();
    updateDrawerProgress();
};

function updatePlaylistActive() {
    var items = document.querySelectorAll('.playlist-item');
    items.forEach(function(el, i) {
        if (i === currentTrack) el.classList.add('active');
        else el.classList.remove('active');
    });
}

// ===== ВЫДВИЖНОЙ ПЛЕЕР — ГЛАВНАЯ ФУНКЦИЯ! =====
window.toggleDrawer = function() {
    var drawer = document.getElementById('playerDrawer');
    if (!drawer) {
        console.log('Плеер не найден!');
        return;
    }
    drawer.classList.toggle('open');
    if (drawer.classList.contains('open')) {
        updateDrawerProgress();
    }
};

window.toggleDrawerPlaylist = function() {
    var playlist = document.getElementById('drawerPlaylist');
    if (playlist) {
        playlist.style.display = playlist.style.display === 'none' ? 'block' : 'none';
    }
};

window.downloadCurrentTrack = function() {
    if (!PLAYLIST[currentTrack]) return;
    var track = PLAYLIST[currentTrack];
    var link = document.createElement('a');
    link.href = track.url;
    link.download = track.name + '.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ===== МЕНЮ НАСТРОЕК =====
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

initAudio();
