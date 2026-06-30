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
let drawerOpen = false;
let audioContext = null;
let analyser = null;
let dataArray = null;
let eqAnimationId = null;
let eqBars = [];

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

function updatePlaylistActive() {
    var items = document.querySelectorAll('.playlist-item');
    items.forEach(function(el, i) {
        if (i === currentTrack) el.classList.add('active');
        else el.classList.remove('active');
    });
}

function initEqualizer() {
    if (!audio) return;
    if (audioContext) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        var source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        eqBars = document.querySelectorAll('.eq-bar');
        updateEqualizer();
    } catch(e) {
        console.log('Эквалайзер не поддерживается:', e);
    }
}

function updateEqualizer() {
    if (!analyser || !eqBars || !eqBars.length) {
        eqAnimationId = requestAnimationFrame(updateEqualizer);
        return;
    }
    analyser.getByteFrequencyData(dataArray);
    var step = Math.floor(dataArray.length / eqBars.length);
    var maxHeight = 40;
    for (var i = 0; i < eqBars.length; i++) {
        var value = 0;
        for (var j = 0; j < step; j++) {
            value += dataArray[i * step + j] || 0;
        }
        value = value / step;
        var percent = (value / 255) * 100;
        var height = Math.max(3, (percent / 100) * maxHeight);
        eqBars[i].style.height = height + 'px';
    }
    eqAnimationId = requestAnimationFrame(updateEqualizer);
}

// ===== УПРАВЛЕНИЕ =====
window.toggleDrawer = function() {
    var drawer = document.getElementById('playerDrawer');
    if (!drawer) return;
    drawer.classList.toggle('open');
    drawerOpen = drawer.classList.contains('open');
    if (drawerOpen) {
        initAudio();
    }
};

window.togglePlay = function() {
    initAudio();
    if (!audio) return;
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        var drawerPlayBtn = document.getElementById('drawerPlayBtn');
        if (drawerPlayBtn) drawerPlayBtn.textContent = '▶';
        if (eqAnimationId) {
            cancelAnimationFrame(eqAnimationId);
            eqAnimationId = null;
        }
        if (eqBars && eqBars.length) {
            eqBars.forEach(function(bar) {
                bar.style.height = '3px';
            });
        }
    } else {
        if (!audioContext) {
            initEqualizer();
        }
        audio.play().then(function() {
            isPlaying = true;
            var drawerPlayBtn = document.getElementById('drawerPlayBtn');
            if (drawerPlayBtn) drawerPlayBtn.textContent = '⏸';
            if (!eqAnimationId) {
                updateEqualizer();
            }
        }).catch(function(e) {
            console.log('Ошибка воспроизведения:', e);
        });
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
        if (audioContext) {
            audioContext.close();
            audioContext = null;
            analyser = null;
            if (eqAnimationId) {
                cancelAnimationFrame(eqAnimationId);
                eqAnimationId = null;
            }
            if (eqBars && eqBars.length) {
                eqBars.forEach(function(bar) {
                    bar.style.height = '3px';
                });
            }
        }
        if (isPlaying) {
            audio.play().then(function() {
                isPlaying = true;
                var drawerPlayBtn = document.getElementById('drawerPlayBtn');
                if (drawerPlayBtn) drawerPlayBtn.textContent = '⏸';
            }).catch(function(e) {
                console.log('Ошибка:', e);
            });
        }
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
    if (audioContext) {
        audioContext.close();
        audioContext = null;
        analyser = null;
        if (eqAnimationId) {
            cancelAnimationFrame(eqAnimationId);
            eqAnimationId = null;
        }
        if (eqBars && eqBars.length) {
            eqBars.forEach(function(bar) {
                bar.style.height = '3px';
            });
        }
    }
    currentTrack = (currentTrack + 1) % PLAYLIST.length;
    if (audio) {
        audio.src = PLAYLIST[currentTrack].url;
        if (isPlaying) {
            audio.play().catch(function(e) { console.log('Ошибка:', e); });
        }
    }
    var drawerTrackName = document.getElementById('drawerTrackName');
    if (drawerTrackName) drawerTrackName.textContent = PLAYLIST[currentTrack].name;
    updatePlaylistActive();
    updateDrawerProgress();
};

window.playPrev = function() {
    if (audioContext) {
        audioContext.close();
        audioContext = null;
        analyser = null;
        if (eqAnimationId) {
            cancelAnimationFrame(eqAnimationId);
            eqAnimationId = null;
        }
        if (eqBars && eqBars.length) {
            eqBars.forEach(function(bar) {
                bar.style.height = '3px';
            });
        }
    }
    currentTrack = (currentTrack - 1 + PLAYLIST.length) % PLAYLIST.length;
    if (audio) {
        audio.src = PLAYLIST[currentTrack].url;
        if (isPlaying) {
            audio.play().catch(function(e) { console.log('Ошибка:', e); });
        }
    }
    var drawerTrackName = document.getElementById('drawerTrackName');
    if (drawerTrackName) drawerTrackName.textContent = PLAYLIST[currentTrack].name;
    updatePlaylistActive();
    updateDrawerProgress();
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

window.openVisualizer = function() {
    alert('🎨 Визуализация будет позже!');
};

// ===== КЛИК ПО ПРОГРЕСС-БАРУ =====
document.addEventListener('DOMContentLoaded', function() {
    var progressBar = document.getElementById('drawerProgressBar');
    if (progressBar) {
        progressBar.addEventListener('click', function(e) {
            if (!audio || !audio.duration) return;
            var rect = this.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var percent = x / rect.width;
            var newTime = percent * audio.duration;
            audio.currentTime = newTime;
            updateDrawerProgress();
        });
    }
});

console.log('🎵 METAIMPERIYA PLAYER ЗАГРУЖЕН!');
