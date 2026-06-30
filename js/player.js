// ================================================================
// ЖЕСТКАЯ ВИЗУАЛИЗАЦИЯ (4 РЕЖИМА)
// ================================================================

let visualizerActive = false;
let visualizerAnimationId = null;
let canvas = null;
let ctx = null;
let visualizerMode = 0;
let particles = [];

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
    
    // Создаём частицы для режима 3 и 4
    particles = [];
    for (var i = 0; i < 300; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 4 + 1,
            speedX: (Math.random() - 0.5) * 2,
            speedY: (Math.random() - 0.5) * 2,
            life: Math.random() * 100 + 50
        });
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
    visualizerMode = (visualizerMode + 1) % 4;
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
    var time = Date.now() / 1000;
    
    // Затухание
    ctx.fillStyle = 'rgba(10, 10, 26, 0.15)';
    ctx.fillRect(0, 0, width, height);
    
    analyser.getByteFrequencyData(dataArray);
    
    // === РЕЖИМ 1: СПИРАЛЬ ===
    if (visualizerMode === 0) {
        var bars = 128;
        var radius = Math.min(width, height) * 0.35;
        var spiralTurns = 3 + Math.sin(time * 0.2) * 1;
        
        for (var i = 0; i < bars; i++) {
            var value = dataArray[i] || 0;
            var percent = value / 255;
            var angle = (i / bars) * Math.PI * 2 * spiralTurns + time * 0.5;
            var r = radius * (i / bars) + percent * 80;
            
            var x = centerX + Math.cos(angle) * r;
            var y = centerY + Math.sin(angle) * r;
            
            var hue = (i / bars) * 360 + time * 30;
            var size = 2 + percent * 8;
            
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'hsl(' + hue + ', 100%, 50%)';
            ctx.fillStyle = 'hsl(' + hue + ', 100%, 60%)';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }
    
    // === РЕЖИМ 2: КВАДРАТЫ ===
    else if (visualizerMode === 1) {
        var gridSize = 12;
        var cellW = width / gridSize;
        var cellH = height / gridSize;
        
        for (var row = 0; row < gridSize; row++) {
            for (var col = 0; col < gridSize; col++) {
                var idx = (row * gridSize + col) % dataArray.length;
                var value = dataArray[idx] || 0;
                var percent = value / 255;
                var size = cellW * 0.5 * (0.3 + percent * 0.7);
                var x = col * cellW + cellW / 2;
                var y = row * cellH + cellH / 2;
                var hue = (idx / (gridSize * gridSize)) * 360 + time * 20;
                var rot = time * 0.5 + percent * 2;
                
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rot);
                ctx.shadowBlur = 15;
                ctx.shadowColor = 'hsl(' + hue + ', 100%, 50%)';
                ctx.fillStyle = 'hsla(' + hue + ', 100%, 60%, ' + (0.6 + percent * 0.4) + ')';
                ctx.fillRect(-size/2, -size/2, size, size);
                ctx.restore();
            }
        }
        ctx.shadowBlur = 0;
    }
    
    // === РЕЖИМ 3: ЗВЁЗДЫ ===
    else if (visualizerMode === 2) {
        var avg = 0;
        for (var i = 0; i < dataArray.length; i++) {
            avg += dataArray[i] || 0;
        }
        avg = avg / dataArray.length;
        var intensity = avg / 255;
        
        // Обновляем частицы
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var angle = Math.atan2(p.y - centerY, p.x - centerX);
            var dist = Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2);
            var wave = Math.sin(dist * 0.02 - time * 2) * intensity * 100;
            
            p.x += Math.cos(angle) * wave * 0.02 + (Math.random() - 0.5) * 0.5;
            p.y += Math.sin(angle) * wave * 0.02 + (Math.random() - 0.5) * 0.5;
            
            // Возвращаем в центр
            p.x += (centerX - p.x) * 0.001;
            p.y += (centerY - p.y) * 0.001;
            
            var hue = (dist * 0.1 + time * 20) % 360;
            var brightness = 40 + intensity * 60;
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'hsl(' + hue + ', 100%, 50%)';
            ctx.fillStyle = 'hsla(' + hue + ', 100%, ' + brightness + '%, ' + (0.5 + intensity * 0.5) + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (0.5 + intensity * 0.5), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }
    
    // === РЕЖИМ 4: ОГОНЬ ===
    else if (visualizerMode === 3) {
        var bars = 64;
        var barWidth = width / bars;
        var avg = 0;
        for (var i = 0; i < dataArray.length; i++) {
            avg += dataArray[i] || 0;
        }
        avg = avg / dataArray.length;
        var intensity = avg / 255;
        
        for (var i = 0; i < bars; i++) {
            var value = dataArray[i] || 0;
            var percent = value / 255;
            var x = i * barWidth;
            var barHeight = percent * height * 0.7;
            var hue = 0 + percent * 60 + time * 10;
            
            var gradient = ctx.createLinearGradient(x, height, x, height - barHeight);
            gradient.addColorStop(0, 'hsl(0, 100%, 30%)');
            gradient.addColorStop(0.3, 'hsl(' + hue + ', 100%, 50%)');
            gradient.addColorStop(0.7, 'hsl(' + (hue + 20) + ', 100%, 70%)');
            gradient.addColorStop(1, 'hsla(' + (hue + 40) + ', 100%, 90%, 0.8)');
            
            ctx.shadowBlur = 30;
            ctx.shadowColor = 'hsl(' + hue + ', 100%, 50%)';
            ctx.fillStyle = gradient;
            ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
            
            // Искры
            if (percent > 0.5) {
                for (var j = 0; j < 5; j++) {
                    var sparkX = x + Math.random() * barWidth;
                    var sparkY = height - barHeight - Math.random() * 20;
                    var sparkSize = Math.random() * 3 + 1;
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = 'hsl(' + (hue + 30) + ', 100%, 70%)';
                    ctx.fillStyle = 'hsla(' + (hue + 30) + ', 100%, 80%, ' + (Math.random() * 0.5 + 0.3) + ')';
                    ctx.beginPath();
                    ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.shadowBlur = 0;
    }
    
    // === ИНФОРМАЦИЯ ВНИЗУ ===
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    var modeNames = ['🌀 Спираль', '🔲 Квадраты', '⭐ Звёзды', '🔥 Огонь'];
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
