// ================================================================
// ПЛЕЕР + ВИЗУАЛИЗАТОР (5 РЕЖИМОВ)
// ================================================================

var currentTrack = 0;
var playlist = [
    { name: 'Давай замутим', file: 'music/davay-zamutim-chto-my-s-toboy-zamutim.mp3' },
    { name: 'Google Maps накрутка', file: 'music/google-maps-nakrutka.mp3' },
    { name: 'SPA Web Development', file: 'music/spa-web-development.mp3' }
];

var audio = new Audio();
var isPlaying = false;
var audioContext = null;
var analyser = null;
var dataArray = null;

// ===== РЕЖИМЫ ВИЗУАЛИЗАЦИИ =====
var visualModes = ['bars', 'circles', 'squares', 'wave', 'color'];
var currentMode = 0;

// ===== ВОСПРОИЗВЕДЕНИЕ =====
window.playTrack = function(index) {
    if (index < 0 || index >= playlist.length) return;
    currentTrack = index;
    var track = playlist[index];
    audio.src = track.file;
    audio.load();
    audio.play().then(function() {
        isPlaying = true;
        updatePlayerUI();
        initAudioContext();
    }).catch(function(err) {
        console.error('❌ Ошибка воспроизведения:', err);
    });
};

window.togglePlay = function() {
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
    } else {
        if (audio.src) {
            audio.play().then(function() {
                isPlaying = true;
                initAudioContext();
            }).catch(function(err) {
                console.error('❌ Ошибка:', err);
                if (playlist[currentTrack]) {
                    audio.src = playlist[currentTrack].file;
                    audio.load();
                    audio.play();
                    isPlaying = true;
                    initAudioContext();
                }
            });
        } else {
            playTrack(0);
        }
    }
    updatePlayerUI();
};

window.playNext = function() {
    var next = (currentTrack + 1) % playlist.length;
    playTrack(next);
};

window.playPrev = function() {
    var prev = (currentTrack - 1 + playlist.length) % playlist.length;
    playTrack(prev);
};

window.toggleDrawerPlaylist = function() {
    var playlistEl = document.getElementById('drawerPlaylist');
    if (playlistEl) {
        playlistEl.style.display = playlistEl.style.display === 'none' ? 'block' : 'none';
    }
};

window.downloadCurrentTrack = function() {
    var track = playlist[currentTrack];
    if (track) {
        var a = document.createElement('a');
        a.href = track.file;
        a.download = track.name + '.mp3';
        a.click();
    }
};

// ===== ВИЗУАЛИЗАТОР =====
var visualizerRunning = false;
var animId = null;

function initAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            var source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        } catch(e) {
            console.warn('⚠️ AudioContext не инициализирован:', e);
        }
    }
}

window.openVisualizer = function() {
    var overlay = document.getElementById('visualizerOverlay');
    if (!overlay) return;
    
    if (!audioContext) {
        initAudioContext();
    }
    
    overlay.style.display = 'flex';
    overlay.classList.add('active');
    visualizerRunning = true;
    currentMode = 0;
    drawVisualizer();
};

window.closeVisualizer = function() {
    var overlay = document.getElementById('visualizerOverlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.classList.remove('active');
    visualizerRunning = false;
    if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
    }
};

// ===== ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ (КЛИК ПО ЭКРАНУ) =====
document.addEventListener('click', function(e) {
    var overlay = document.getElementById('visualizerOverlay');
    if (!overlay) return;
    if (!overlay.classList.contains('active')) return;
    
    // Не переключаем, если кликнули по кнопке закрытия
    if (e.target.closest('.visualizer-close')) return;
    
    currentMode = (currentMode + 1) % visualModes.length;
    console.log('🎨 Режим:', visualModes[currentMode]);
});

function drawVisualizer() {
    if (!visualizerRunning) return;
    
    var canvas = document.getElementById('visualizerCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    
    var width = canvas.width;
    var height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // ПОЛУЧАЕМ ДАННЫЕ ЗВУКА
    var hasData = false;
    if (analyser && dataArray) {
        try {
            analyser.getByteFrequencyData(dataArray);
            hasData = true;
        } catch(e) {}
    }
    
    var mode = visualModes[currentMode];
    
    switch(mode) {
        case 'bars': drawBars(ctx, width, height, hasData); break;
        case 'circles': drawCircles(ctx, width, height, hasData); break;
        case 'squares': drawSquares(ctx, width, height, hasData); break;
        case 'wave': drawWave(ctx, width, height, hasData); break;
        case 'color': drawColor(ctx, width, height, hasData); break;
        default: drawBars(ctx, width, height, hasData);
    }
    
    animId = requestAnimationFrame(drawVisualizer);
}

// ===== РЕЖИМ 1: ПОЛОСЫ =====
function drawBars(ctx, width, height, hasData) {
    var bars = 64;
    var barWidth = width / bars * 0.8;
    var gap = width / bars * 0.2;
    
    for (var i = 0; i < bars; i++) {
        var value = hasData && dataArray && i < dataArray.length ? dataArray[i] : Math.random() * 255;
        var percent = Math.min(value / 255, 1);
        var barHeight = percent * height * 0.85;
        var x = i * (barWidth + gap) + gap;
        var y = height - barHeight;
        
        var hue = (i / bars) * 300 + 200 + (Date.now() / 5000) * 10;
        ctx.fillStyle = 'hsl(' + hue + ', 100%, 60%)';
        ctx.shadowColor = 'hsl(' + hue + ', 100%, 60%)';
        ctx.shadowBlur = 15;
        ctx.fillRect(x, y, barWidth, barHeight);
    }
}

// ===== РЕЖИМ 2: КРУГИ =====
function drawCircles(ctx, width, height, hasData) {
    var cx = width / 2;
    var cy = height / 2;
    var maxRadius = Math.min(width, height) / 2 - 20;
    var rings = 20;
    
    for (var i = 0; i < rings; i++) {
        var value = hasData && dataArray && i < dataArray.length ? dataArray[i] : Math.random() * 255;
        var percent = Math.min(value / 255, 1);
        var radius = (i / rings) * maxRadius + 10;
        var alpha = 0.2 + percent * 0.8;
        
        var hue = (i / rings) * 300 + 200 + (Date.now() / 3000) * 20;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'hsla(' + hue + ', 100%, 60%, ' + alpha + ')';
        ctx.shadowColor = 'hsla(' + hue + ', 100%, 60%, 0.5)';
        ctx.shadowBlur = 20;
        ctx.lineWidth = 2 + percent * 4;
        ctx.stroke();
    }
}

// ===== РЕЖИМ 3: КВАДРАТЫ =====
function drawSquares(ctx, width, height, hasData) {
    var cx = width / 2;
    var cy = height / 2;
    var maxSize = Math.min(width, height) / 2 - 20;
    var squares = 16;
    var time = Date.now() / 1000;
    
    for (var i = 0; i < squares; i++) {
        var value = hasData && dataArray && i < dataArray.length ? dataArray[i] : Math.random() * 255;
        var percent = Math.min(value / 255, 1);
        var size = (i / squares) * maxSize + 10;
        var angle = time * (0.5 + i * 0.02) + i * 0.5;
        
        var hue = (i / squares) * 300 + 200 + time * 20;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.shadowColor = 'hsl(' + hue + ', 100%, 60%)';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = 'hsl(' + hue + ', 100%, 60%)';
        ctx.lineWidth = 2 + percent * 3;
        ctx.strokeRect(-size/2, -size/2, size, size);
        ctx.restore();
    }
}

// ===== РЕЖИМ 4: ВОЛНА =====
function drawWave(ctx, width, height, hasData) {
    var time = Date.now() / 1000;
    var points = 200;
    var amplitude = height * 0.4;
    var frequency = 0.02;
    
    ctx.beginPath();
    for (var i = 0; i < points; i++) {
        var x = (i / points) * width;
        var value = hasData && dataArray && i < dataArray.length ? dataArray[i] : Math.random() * 255;
        var percent = Math.min(value / 255, 1);
        var y = height / 2 + Math.sin(x * frequency + time * 2) * amplitude * (0.5 + percent * 0.5);
        
        var hue = (i / points) * 300 + 200 + time * 20;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'hsl(' + hue + ', 100%, 60%)';
        ctx.shadowColor = 'hsl(' + hue + ', 100%, 60%)';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 3 + percent * 3;
    }
    ctx.stroke();
}

// ===== РЕЖИМ 5: ЦВЕТОВАЯ МУЗЫКА =====
function drawColor(ctx, width, height, hasData) {
    var time = Date.now() / 1000;
    var bars = 80;
    var barWidth = width / bars * 0.9;
    var gap = width / bars * 0.1;
    
    var hue = (time * 30) % 360;
    var hue2 = (time * 30 + 120) % 360;
    var hue3 = (time * 30 + 240) % 360;
    
    for (var i = 0; i < bars; i++) {
        var value = hasData && dataArray && i < dataArray.length ? dataArray[i] : Math.random() * 255;
        var percent = Math.min(value / 255, 1);
        var barHeight = percent * height * 0.85;
        var x = i * (barWidth + gap) + gap;
        var y = height - barHeight;
        
        var shift = Math.sin(time * 2 + i * 0.1) * 0.5 + 0.5;
        var barHue = (hue + shift * 60 + i * 0.5) % 360;
        
        ctx.fillStyle = 'hsl(' + barHue + ', 100%, 60%)';
        ctx.shadowColor = 'hsl(' + barHue + ', 100%, 60%)';
        ctx.shadowBlur = 10;
        ctx.fillRect(x, y, barWidth, barHeight);
    }
}

// ===== ОБНОВЛЕНИЕ UI =====
function updatePlayerUI() {
    var trackName = document.getElementById('drawerTrackName');
    var playBtn = document.getElementById('drawerPlayBtn');
    var playlistItems = document.querySelectorAll('#drawerPlaylist .playlist-item');
    
    if (trackName && playlist[currentTrack]) {
        trackName.textContent = playlist[currentTrack].name;
    }
    if (playBtn) {
        playBtn.textContent = isPlaying ? '⏸' : '▶';
    }
    
    playlistItems.forEach(function(item, index) {
        item.classList.toggle('active', index === currentTrack);
    });
}

// ===== ПРОГРЕСС-БАР =====
audio.addEventListener('timeupdate', function() {
    var progress = document.getElementById('drawerProgressFill');
    var currentTime = document.getElementById('drawerCurrentTime');
    var totalTime = document.getElementById('drawerTotalTime');
    
    if (progress && audio.duration) {
        progress.style.width = (audio.currentTime / audio.duration * 100) + '%';
    }
    if (currentTime) {
        currentTime.textContent = formatTime(audio.currentTime);
    }
    if (totalTime && audio.duration) {
        totalTime.textContent = formatTime(audio.duration);
    }
});

audio.addEventListener('ended', function() {
    isPlaying = false;
    updatePlayerUI();
});

// ===== ВЫДВИЖЕНИЕ ПЛЕЕРА =====
window.toggleDrawer = function() {
    var drawer = document.getElementById('playerDrawer');
    var handle = document.getElementById('playerHandle');
    if (!drawer) return;
    drawer.classList.toggle('open');
    if (handle) {
        var label = handle.querySelector('.handle-label');
        if (label) {
            label.textContent = drawer.classList.contains('open') ? '🎵 СВЕРНУТЬ' : '🎵 ПЛЕЕР';
        }
    }
};

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    if (playlist.length > 0) {
        audio.src = playlist[0].file;
        audio.load();
        updatePlayerUI();
        console.log('✅ Плеер загружен! Треки:', playlist.map(t => t.name).join(', '));
    }
});
