// ================================================================
// МУЗЫКАЛЬНЫЙ ПЛЕЕР — ИСПРАВЛЕННАЯ ВЕРСИЯ
// ================================================================

const PLAYLIST = [
    { name: 'Давай замутим', url: 'https://raw.githubusercontent.com/Metaimperiya/MyWebSite-MyEcosystem/main/music/davay-zamutim-chto-my-s-toboy-zamutim.mp3' },
    { name: 'Google Maps накрутка', url: 'https://raw.githubusercontent.com/Metaimperiya/MyWebSite-MyEcosystem/main/music/google-maps-nakrutka.mp3' },
    { name: 'METAIMPERIYA на сервере', url: 'https://raw.githubusercontent.com/Metaimperiya/MyWebSite-MyEcosystem/main/music/metaimperiya-on-the-server-forever.mp3' },
    { name: 'SPA Web Development', url: 'https://raw.githubusercontent.com/Metaimperiya/MyWebSite-MyEcosystem/main/music/spa-web-development.mp3' }
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
        audio.preload = 'auto';
        audio.addEventListener('timeupdate', function() {
            updateDrawerProgress();
        });
        audio.addEventListener('ended', function() {
            playNext();
        });
        audio.addEventListener('error', function(e) {
            console.error('Ошибка аудио:', e);
            isPlaying = false;
            var drawerPlayBtn = document.getElementById('drawerPlayBtn');
            if (drawerPlayBtn) drawerPlayBtn.textContent = '▶';
        });
    }
    var drawerTrackName = document.getElementById('drawerTrackName');
    if (drawerTrackName) drawerTrackName.textContent = PLAYLIST[currentTrack].name;
    updatePlaylistActive();
    updateDrawerProgress();
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
// 2. УПРАВЛЕНИЕ ВОСПРОИЗВЕДЕНИЕМ — ИСПРАВЛЕНО
// ================================================================

window.togglePlay = function() {
    initAudio();
    if (!audio) return;
    
    // Если аудио закончилось или сброшено — пересоздаём
    if (audio.ended || audio.currentTime === audio.duration) {
        audio.currentTime = 0;
        audio.src = PLAYLIST[currentTrack].url;
        audio.load();
    }
    
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
        // Восстанавливаем аудио-контекст если нужно
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
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
                // Пробуем пересоздать аудио
                audio.src = PLAYLIST[currentTrack].url;
                audio.load();
                setTimeout(function() {
                    audio.play().then(function() {
                        isPlaying = true;
                        var drawerPlayBtn = document.getElementById('drawerPlayBtn');
                        if (drawerPlayBtn) drawerPlayBtn.textContent = '⏸';
                    }).catch(function(err) {
                        console.log('Повторная ошибка:', err);
                    });
                }, 200);
            });
    }
};

window.playTrack = function(index) {
    if (index === currentTrack && isPlaying) {
        togglePlay();
        return;
    }
    
    // Останавливаем текущее воспроизведение
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
    
    // Закрываем старый аудио-контекст
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
    
    currentTrack = index;
    
    // Пересоздаём аудио
    if (audio) {
        audio.src = PLAYLIST[currentTrack].url;
        audio.load();
        audio.currentTime = 0;
    } else {
        audio = new Audio(PLAYLIST[currentTrack].url);
        audio.crossOrigin = 'anonymous';
        audio.preload = 'auto';
        audio.addEventListener('timeupdate', function() {
            updateDrawerProgress();
        });
        audio.addEventListener('ended', function() {
            playNext();
        });
        audio.addEventListener('error', function(e) {
            console.error('Ошибка аудио:', e);
            isPlaying = false;
            var drawerPlayBtn = document.getElementById('drawerPlayBtn');
            if (drawerPlayBtn) drawerPlayBtn.textContent = '▶';
        });
    }
    
    var drawerTrackName = document.getElementById('drawerTrackName');
    if (drawerTrackName) drawerTrackName.textContent = PLAYLIST[currentTrack].name;
    updatePlaylistActive();
    updateDrawerProgress();
    
    // Автоматически воспроизводим
    if (isPlaying) {
        audio.play()
            .then(function() {
                isPlaying = true;
                var drawerPlayBtn = document.getElementById('drawerPlayBtn');
                if (drawerPlayBtn) drawerPlayBtn.textContent = '⏸';
            })
            .catch(function(e) {
                console.log('Ошибка автовоспроизведения:', e);
                isPlaying = false;
                var drawerPlayBtn = document.getElementById('drawerPlayBtn');
                if (drawerPlayBtn) drawerPlayBtn.textContent = '▶';
            });
    }
};

window.playNext = function() {
    // Закрываем старый аудио-контекст
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
        audio.load();
        audio.currentTime = 0;
        if (isPlaying) {
            audio.play()
                .then(function() {
                    isPlaying = true;
                })
                .catch(function(e) {
                    console.log('Ошибка:', e);
                    isPlaying = false;
                    var drawerPlayBtn = document.getElementById('drawerPlayBtn');
                    if (drawerPlayBtn) drawerPlayBtn.textContent = '▶';
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
        audio.load();
        audio.currentTime = 0;
        if (isPlaying) {
            audio.play()
                .then(function() {
                    isPlaying = true;
                })
                .catch(function(e) {
                    console.log('Ошибка:', e);
                    isPlaying = false;
                    var drawerPlayBtn = document.getElementById('drawerPlayBtn');
                    if (drawerPlayBtn) drawerPlayBtn.textContent = '▶';
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
    if (!drawer) return;
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
// 6. ЭКВАЛАЙЗЕР
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
// 7. ВИЗУАЛИЗАЦИЯ
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
        if (!audioContext) initEqualizer();
        if (!analyser) return;
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
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    var modeNames = ['Колонки', 'Волна', 'Огонь'];
    ctx.fillText(PLAYLIST[currentTrack].name + ' | ' + modeNames[visualizerMode] + ' (клик для смены)', centerX, height - 20);
    
    visualizerAnimationId = requestAnimationFrame(drawVisualizer);
}

document.addEventListener('DOMContentLoaded', function() {
    var canvasEl = document.getElementById('visualizerCanvas');
    if (canvasEl) {
        canvasEl.addEventListener('click', switchVisualizerMode);
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && visualizerActive) {
        closeVisualizer();
    }
});

window.addEventListener('resize', function() {
    if (canvas && visualizerActive) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});

// ================================================================
// 8. ПРОГРЕСС-БАР (ПЕРЕМОТКА)
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    var progressBar = document.getElementById('drawerProgressBar');
    if (progressBar) {
        progressBar.addEventListener('click', function(e) {
            if (!audio || !audio.duration) return;
            var rect = this.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var percent = x / rect.width;
            audio.currentTime = percent * audio.duration;
            updateDrawerProgress();
        });
    }
});

// ================================================================
// 9. ЗАПУСК
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    initAudio();
});
