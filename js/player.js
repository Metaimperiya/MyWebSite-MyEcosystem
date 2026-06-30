// ================================================================
// МУЗЫКАЛЬНЫЙ ПЛЕЕР — ИСПРАВЛЕННАЯ ВЕРСИЯ
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
        audio.play()
            .then(function() {
                isPlaying = true;
                var drawerPlayBtn = document.getElementById('drawerPlayBtn');
                if (drawerPlayBtn) drawerPlayBtn.textContent = '⏸';
            })
            .catch(function(e) {
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
        if (isPlaying) {
            audio.play()
                .then(function() {
                    isPlaying = true;
                })
                .catch(function(e) {
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
    currentTrack = (currentTrack + 1) % PLAYLIST.length;
    if (audio) {
        audio.src = PLAYLIST[currentTrack].url;
        if (isPlaying) {
            audio.play()
                .then(function() {
                    isPlaying = true;
                })
                .catch(function(e) {
                    console.log('Ошибка:', e);
                });
        }
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
        if (isPlaying) {
            audio.play()
                .then(function() {
                    isPlaying = true;
                })
                .catch(function(e) {
                    console.log('Ошибка:', e);
                });
        }
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

// ===== ВЫДВИЖНОЙ ПЛЕЕР =====
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

// ===== СКАЧИВАНИЕ ТРЕКА =====
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

// ===== ЗАПУСК ПОСЛЕ ЗАГРУЗКИ DOM =====
document.addEventListener('DOMContentLoaded', function() {
    initAudio();
});

// ================================================================
// НАСТОЯЩИЙ ЭКВАЛАЙЗЕР (РАБОТАЕТ ОТ МУЗЫКИ)
// ================================================================

let audioContext = null;
let analyser = null;
let dataArray = null;
let eqAnimationId = null;
let eqBars = [];

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
        
        // Находим все полоски эквалайзера
        eqBars = document.querySelectorAll('.eq-bar');
        
        updateEqualizer();
    } catch(e) {
        console.log('Эквалайзер не поддерживается:', e);
    }
}

function updateEqualizer() {
    if (!analyser || !eqBars.length) {
        eqAnimationId = requestAnimationFrame(updateEqualizer);
        return;
    }
    
    analyser.getByteFrequencyData(dataArray);
    
    var step = Math.floor(dataArray.length / eqBars.length);
    var maxHeight = 40; // максимальная высота полоски
    
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

// Перезапускаем эквалайзер при воспроизведении
var oldTogglePlay = window.togglePlay;
window.togglePlay = function() {
    initAudio();
    if (!audio) return;
    
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        var drawerPlayBtn = document.getElementById('drawerPlayBtn');
        if (drawerPlayBtn) drawerPlayBtn.textContent = '▶';
        // Останавливаем эквалайзер
        if (eqAnimationId) {
            cancelAnimationFrame(eqAnimationId);
            eqAnimationId = null;
        }
        // Сбрасываем полоски
        eqBars.forEach(function(bar) {
            bar.style.height = '3px';
        });
    } else {
        // Инициализируем AudioContext при первом воспроизведении
        if (!audioContext) {
            initEqualizer();
        }
        audio.play()
            .then(function() {
                isPlaying = true;
                var drawerPlayBtn = document.getElementById('drawerPlayBtn');
                if (drawerPlayBtn) drawerPlayBtn.textContent = '⏸';
                // Запускаем эквалайзер
                if (!eqAnimationId) {
                    updateEqualizer();
                }
            })
            .catch(function(e) {
                console.log('Ошибка воспроизведения:', e);
            });
    }
};

// Обновляем при переключении треков
var oldPlayTrack = window.playTrack;
window.playTrack = function(index) {
    if (index === currentTrack && isPlaying) {
        togglePlay();
        return;
    }
    
    currentTrack = index;
    if (audio) {
        audio.src = PLAYLIST[currentTrack].url;
        // Пересоздаём эквалайзер для нового трека
        if (audioContext) {
            audioContext.close();
            audioContext = null;
            analyser = null;
            if (eqAnimationId) {
                cancelAnimationFrame(eqAnimationId);
                eqAnimationId = null;
            }
            // Сбрасываем полоски
            eqBars.forEach(function(bar) {
                bar.style.height = '3px';
            });
        }
        if (isPlaying) {
            audio.play()
                .then(function() {
                    isPlaying = true;
                    var drawerPlayBtn = document.getElementById('drawerPlayBtn');
                    if (drawerPlayBtn) drawerPlayBtn.textContent = '⏸';
                })
                .catch(function(e) {
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

// Останавливаем эквалайзер при паузе через другие кнопки
var oldPlayNext = window.playNext;
window.playNext = function() {
    // Сбрасываем эквалайзер
    if (audioContext) {
        audioContext.close();
        audioContext = null;
        analyser = null;
        if (eqAnimationId) {
            cancelAnimationFrame(eqAnimationId);
            eqAnimationId = null;
        }
        eqBars.forEach(function(bar) {
            bar.style.height = '3px';
        });
    }
    oldPlayNext();
};

var oldPlayPrev = window.playPrev;
window.playPrev = function() {
    if (audioContext) {
        audioContext.close();
        audioContext = null;
        analyser = null;
        if (eqAnimationId) {
            cancelAnimationFrame(eqAnimationId);
            eqAnimationId = null;
        }
        eqBars.forEach(function(bar) {
            bar.style.height = '3px';
        });
    }
    oldPlayPrev();
};

// ================================================================
// ВИЗУАЛИЗАЦИЯ МУЗЫКИ (НА ВЕСЬ ЭКРАН)
// ================================================================

let visualizerActive = false;
let visualizerAnimationId = null;
let canvas = null;
let ctx = null;

function openVisualizer() {
    var overlay = document.getElementById('visualizerOverlay');
    if (!overlay) return;
    
    overlay.style.display = 'flex';
    overlay.classList.add('active');
    
    canvas = document.getElementById('visualizerCanvas');
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx = canvas.getContext('2d');
    
    visualizerActive = true;
    drawVisualizer();
}

function closeVisualizer() {
    var overlay = document.getElementById('visualizerOverlay');
    if (!overlay) return;
    
    overlay.style.display = 'none';
    overlay.classList.remove('active');
    visualizerActive = false;
    
    if (visualizerAnimationId) {
        cancelAnimationFrame(visualizerAnimationId);
        visualizerAnimationId = null;
    }
}

function drawVisualizer() {
    if (!visualizerActive || !analyser || !ctx) {
        visualizerAnimationId = requestAnimationFrame(drawVisualizer);
        return;
    }
    
    var width = canvas.width;
    var height = canvas.height;
    
    // Очищаем
    ctx.clearRect(0, 0, width, height);
    
    // Получаем данные
    analyser.getByteFrequencyData(dataArray);
    
    // === РИСУЕМ КРУГОВУЮ ВОЛНУ ===
    var centerX = width / 2;
    var centerY = height / 2;
    var radius = Math.min(width, height) * 0.3;
    var bars = 64;
    var barWidth = (Math.PI * 2) / bars;
    
    for (var i = 0; i < bars; i++) {
        var value = dataArray[i] || 0;
        var percent = value / 255;
        var barHeight = percent * radius * 0.6;
        
        var angle = (i / bars) * Math.PI * 2;
        var x1 = centerX + Math.cos(angle) * radius;
        var y1 = centerY + Math.sin(angle) * radius;
        var x2 = centerX + Math.cos(angle) * (radius + barHeight);
        var y2 = centerY + Math.sin(angle) * (radius + barHeight);
        
        var hue = (i / bars) * 360 + Date.now() / 50;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'hsl(' + hue + ', 100%, 60%)';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'hsl(' + hue + ', 100%, 60%)';
        ctx.stroke();
    }
    
    // === ДОБАВЛЯЕМ ЦЕНТРАЛЬНЫЙ СВЕТ ===
    var gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.5);
    gradient.addColorStop(0, 'rgba(24, 119, 242, 0.2)');
    gradient.addColorStop(1, 'rgba(24, 119, 242, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // === НАЗВАНИЕ ТРЕКА ===
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(PLAYLIST[currentTrack].name, centerX, height - 30);
    
    visualizerAnimationId = requestAnimationFrame(drawVisualizer);
}

// Обработка ресайза
window.addEventListener('resize', function() {
    if (canvas && visualizerActive) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});

// Закрытие по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && visualizerActive) {
        closeVisualizer();
    }
});
