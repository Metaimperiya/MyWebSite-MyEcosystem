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
// 1. ОСНОВНЫЕ ФУНКЦИИ
// ================================================================

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

// ================================================================
// 2. УПРАВЛЕНИЕ ВОСПРОИЗВЕДЕНИЕМ
// ================================================================

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
        if (eqBars && eqBars.length) {
            eqBars.forEach(function(bar) {
                bar.style.height = '3px';
            });
        }
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
                if (!eqAnimationId) {
                    updateEqualizer();
                }
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
        // Пересоздаём эквалайзер для нового трека
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

// ================================================================
// 3. ВЫДВИЖНОЙ ПЛЕЕР
// ================================================================

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

// ================================================================
// 4. СКАЧИВАНИЕ ТРЕКА
// ================================================================

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

// ================================================================
// 5. МЕНЮ НАСТРОЕК
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
// 6. НАСТОЯЩИЙ ЭКВАЛАЙЗЕР (ПОЛОСКИ В ПЛЕЕРЕ)
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

// ================================================================
// 7. ВИЗУАЛИЗАЦИЯ НА ВЕСЬ ЭКРАН
// ================================================================

let visualizerActive = false;
let visualizerAnimationId = null;
let canvas = null;
let ctx = null;
let visualizerMode = 0;

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
    
    if (!analyser || !dataArray) {
        console.log('Анализатор не инициализирован');
        return;
    }
    
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

function switchVisualizerMode() {
    visualizerMode = (visualizerMode + 1) % 3;
}

function drawVisualizer() {
    if (!visualizerActive || !analyser || !ctx || !dataArray) {
        visualizerAnimationId = requestAnimationFrame(drawVisualizer);
        return;
    }
    
    var width = canvas.width;
    var height = canvas.height;
    var centerX = width / 2;
    var centerY = height / 2;
    
    // Затухание
    ctx.fillStyle = 'rgba(10, 10, 26, 0.2)';
    ctx.fillRect(0, 0, width, height);
    
    analyser.getByteFrequencyData(dataArray);
    var bars = 64;
    var avg = 0;
    for (var i = 0; i < dataArray.length; i++) {
        avg += dataArray[i] || 0;
    }
    avg = avg / dataArray.length;
    var intensity = avg / 255;
    
    if (visualizerMode === 0) {
        // === РЕЖИМ 1: КОЛОНКИ ===
        var barWidth = (width / bars) * 0.8;
        var gap = (width / bars) * 0.2;
        
        for (var i = 0; i < bars; i++) {
            var value = dataArray[i] || 0;
            var percent = value / 255;
            var barHeight = percent * height * 0.7;
            var x = i * (barWidth + gap);
            var hue = (i / bars) * 360 + Date.now() / 30;
            
            var gradient = ctx.createLinearGradient(x, height, x, height - barHeight);
            gradient.addColorStop(0, 'hsl(' + hue + ', 100%, 30%)');
            gradient.addColorStop(0.5, 'hsl(' + hue + ', 100%, 60%)');
            gradient.addColorStop(1, 'hsl(' + hue + ', 100%, 90%)');
            
            ctx.fillStyle = gradient;
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'hsl(' + hue + ', 100%, 50%)';
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        }
        ctx.shadowBlur = 0;
    } 
    else if (visualizerMode === 1) {
        // === РЕЖИМ 2: ВОЛНА ===
        var step = Math.floor(dataArray.length / bars);
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        
        for (var i = 0; i < bars; i++) {
            var val = 0;
            for (var j = 0; j < step; j++) {
                val += dataArray[i * step + j] || 0;
            }
            val = val / step;
            var percent = (val / 255) * 0.8;
            var y = centerY + Math.sin(i * 0.1 + Date.now() / 1000) * 20 - percent * height * 0.35;
            var x = (i / bars) * width;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(width, centerY);
        ctx.closePath();
        
        var grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, '#ff6b6b');
        grad.addColorStop(0.25, '#feca57');
        grad.addColorStop(0.5, '#48dbfb');
        grad.addColorStop(0.75, '#ff9ff3');
        grad.addColorStop(1, '#ff6b6b');
        
        ctx.fillStyle = grad;
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#1877f2';
        ctx.fill();
        ctx.shadowBlur = 0;
    } 
    else if (visualizerMode === 2) {
        // === РЕЖИМ 3: ЧАСТИЦЫ/ОГОНЬ ===
        var particleCount = 200;
        var radius = Math.min(width, height) * 0.3;
        
        for (var i = 0; i < particleCount; i++) {
            var angle = Math.random() * Math.PI * 2;
            var r = Math.random() * (intensity * 200 + 50);
            var x = centerX + Math.cos(angle) * r;
            var y = centerY + Math.sin(angle) * r;
            var size = Math.random() * (intensity * 6 + 2);
            var hue = (angle / (Math.PI * 2)) * 360 + Date.now() / 50;
            
            ctx.fillStyle = 'hsla(' + hue + ', 100%, 60%, ' + (intensity * 0.8 + 0.2) + ')';
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'hsl(' + hue + ', 100%, 50%)';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        
        var grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, intensity * 150 + 50);
        grad.addColorStop(0, 'rgba(24, 119, 242, ' + (intensity * 0.5) + ')');
        grad.addColorStop(1, 'rgba(24, 119, 242, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, intensity * 150 + 50, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Информация внизу
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    var modeNames = ['Колонки', 'Волна', 'Огонь'];
    ctx.fillText(PLAYLIST[currentTrack].name + ' | ' + modeNames[visualizerMode] + ' (клик для смены)', centerX, height - 20);
    
    visualizerAnimationId = requestAnimationFrame(drawVisualizer);
}

// Переключение режима по клику
document.addEventListener('DOMContentLoaded', function() {
    var canvasEl = document.getElementById('visualizerCanvas');
    if (canvasEl) {
        canvasEl.addEventListener('click', switchVisualizerMode);
    }
});

// Закрытие по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && visualizerActive) {
        closeVisualizer();
    }
});

// Ресайз
window.addEventListener('resize', function() {
    if (canvas && visualizerActive) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});

// ================================================================
// 8. ЗАПУСК
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    initAudio();
});
