// ================================================================
// 7. ВИЗУАЛИЗАЦИЯ НА ВЕСЬ ЭКРАН (НОВЫЕ РЕЖИМЫ)
// ================================================================

let visualizerActive = false;
let visualizerAnimationId = null;
let canvas = null;
let ctx = null;
let visualizerMode = 0;
let particles = [];
let fish = [];
let dnaAngle = 0;

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
    
    // Инициализация частиц
    particles = [];
    for (var i = 0; i < 500; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 1,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            hue: Math.random() * 360
        });
    }
    
    // Инициализация рыбок
    fish = [];
    for (var i = 0; i < 30; i++) {
        fish.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 15 + 5,
            speed: Math.random() * 1 + 0.5,
            angle: Math.random() * Math.PI * 2,
            hue: Math.random() * 60 + 180
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
    visualizerMode = (visualizerMode + 1) % 5;
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
    ctx.fillStyle = 'rgba(10, 10, 26, 0.1)';
    ctx.fillRect(0, 0, width, height);
    
    analyser.getByteFrequencyData(dataArray);
    
    var avg = 0;
    for (var i = 0; i < dataArray.length; i++) {
        avg += dataArray[i] || 0;
    }
    avg = avg / dataArray.length;
    var intensity = avg / 255;
    
    // ============================================================
    // РЕЖИМ 1: АКВАРИУМ
    // ============================================================
    if (visualizerMode === 0) {
        // Вода
        var grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, 'rgba(0, 20, 40, 0.3)');
        grad.addColorStop(0.5, 'rgba(0, 40, 80, 0.2)');
        grad.addColorStop(1, 'rgba(0, 20, 40, 0.3)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        
        // Волны на воде
        for (var i = 0; i < 10; i++) {
            var waveX = (i / 10) * width;
            var waveY = centerY + Math.sin(waveX * 0.01 + time * 2 + i) * (50 + intensity * 100);
            var waveHeight = 5 + intensity * 20;
            ctx.fillStyle = 'rgba(100, 200, 255, 0.05)';
            ctx.beginPath();
            ctx.ellipse(waveX, waveY, 50 + intensity * 100, waveHeight, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Рыбки
        for (var i = 0; i < fish.length; i++) {
            var f = fish[i];
            var idx = Math.floor((i / fish.length) * dataArray.length);
            var val = dataArray[idx] || 0;
            var speed = 0.5 + (val / 255) * 2;
            
            f.x += Math.cos(f.angle) * speed;
            f.y += Math.sin(f.angle) * speed;
            f.angle += (Math.random() - 0.5) * 0.05;
            
            if (f.x < 0 || f.x > width) f.angle = Math.PI - f.angle;
            if (f.y < 0 || f.y > height) f.angle = -f.angle;
            
            var hue = f.hue + val / 5;
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'hsl(' + hue + ', 80%, 50%)';
            ctx.fillStyle = 'hsla(' + hue + ', 80%, 60%, 0.8)';
            ctx.beginPath();
            ctx.ellipse(f.x, f.y, f.size, f.size * 0.6, f.angle, 0, Math.PI * 2);
            ctx.fill();
            
            // Хвост
            ctx.fillStyle = 'hsla(' + (hue + 30) + ', 80%, 50%, 0.6)';
            ctx.beginPath();
            var tailX = f.x - Math.cos(f.angle) * f.size * 0.8;
            var tailY = f.y - Math.sin(f.angle) * f.size * 0.8;
            ctx.moveTo(tailX, tailY);
            ctx.quadraticCurveTo(tailX - f.size * 0.5, tailY - f.size * 0.5, tailX - f.size, tailY);
            ctx.quadraticCurveTo(tailX - f.size * 0.5, tailY + f.size * 0.5, tailX, tailY);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }
    
    // ============================================================
    // РЕЖИМ 2: НЕЙРОСЕТЬ
    // ============================================================
    else if (visualizerMode === 1) {
        var nodes = 40;
        var connections = 80;
        
        // Обновляем частицы
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var val = dataArray[i % dataArray.length] || 0;
            p.x += Math.sin(time + i) * (0.5 + val / 255);
            p.y += Math.cos(time * 0.7 + i * 0.5) * (0.5 + val / 255);
            p.hue = (p.hue + 0.1 + val / 50) % 360;
            
            if (p.x < 0 || p.x > width) p.x = Math.random() * width;
            if (p.y < 0 || p.y > height) p.y = Math.random() * height;
            
            // Рисуем связи между ближайшими частицами
            for (var j = i + 1; j < particles.length; j += 10) {
                var p2 = particles[j];
                var dx = p.x - p2.x;
                var dy = p.y - p2.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200) {
                    var alpha = 1 - dist / 200;
                    ctx.strokeStyle = 'hsla(' + ((p.hue + p2.hue) / 2) + ', 80%, 60%, ' + (alpha * 0.3 * intensity) + ')';
                    ctx.lineWidth = 1 + intensity * 2;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }
        
        // Рисуем сами частицы
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var size = 2 + intensity * 5;
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'hsl(' + p.hue + ', 100%, 50%)';
            ctx.fillStyle = 'hsla(' + p.hue + ', 100%, 70%, 0.8)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }
    
    // ============================================================
    // РЕЖИМ 3: ГАЛАКТИКА
    // ============================================================
    else if (visualizerMode === 2) {
        var rotation = time * 0.1;
        var bars = 120;
        var radius = Math.min(width, height) * 0.3;
        
        // Рисуем спиральные рукава
        for (var i = 0; i < bars; i++) {
            var val = dataArray[i % dataArray.length] || 0;
            var percent = val / 255;
            var angle = (i / bars) * Math.PI * 4 + rotation;
            var r = radius * (0.3 + (i / bars) * 0.7 + percent * 0.2);
            
            var x = centerX + Math.cos(angle) * r;
            var y = centerY + Math.sin(angle) * r;
            var hue = 200 + (i / bars) * 160 + time * 20;
            var size = 2 + percent * 8;
            
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'hsl(' + hue + ', 100%, 50%)';
            ctx.fillStyle = 'hsla(' + hue + ', 100%, 70%, ' + (0.3 + percent * 0.5) + ')';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Ядро галактики
        var grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.3);
        grad.addColorStop(0, 'rgba(255, 255, 255, ' + (0.3 + intensity * 0.3) + ')');
        grad.addColorStop(0.5, 'rgba(100, 200, 255, ' + (0.2 + intensity * 0.2) + ')');
        grad.addColorStop(1, 'rgba(100, 200, 255, 0)');
        ctx.shadowBlur = 50;
        ctx.shadowColor = '#1877f2';
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    // ============================================================
    // РЕЖИМ 4: ДНК
    // ============================================================
    else if (visualizerMode === 3) {
        var bars = 60;
        var spacing = height / bars;
        var amplitude = 100 + intensity * 200;
        dnaAngle += 0.02 + intensity * 0.03;
        
        for (var i = 0; i < bars; i++) {
            var y = i * spacing;
            var val = dataArray[i % dataArray.length] || 0;
            var percent = val / 255;
            var offset = Math.sin(dnaAngle + i * 0.3) * amplitude * (0.5 + percent * 0.5);
            var x1 = centerX + offset;
            var x2 = centerX - offset;
            var size = 3 + percent * 8;
            var hue = 200 + (i / bars) * 160 + time * 30;
            
            // Левая цепь
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'hsl(' + hue + ', 100%, 50%)';
            ctx.fillStyle = 'hsla(' + hue + ', 100%, 70%, 0.8)';
            ctx.beginPath();
            ctx.arc(x1, y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Правая цепь
            ctx.fillStyle = 'hsla(' + (hue + 60) + ', 100%, 70%, 0.8)';
            ctx.beginPath();
            ctx.arc(x2, y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Связи между цепями
            if (i % 2 === 0) {
                ctx.strokeStyle = 'hsla(' + (hue + 30) + ', 80%, 60%, ' + (0.2 + percent * 0.4) + ')';
                ctx.lineWidth = 1 + intensity * 2;
                ctx.beginPath();
                ctx.moveTo(x1, y);
                ctx.lineTo(x2, y);
                ctx.stroke();
            }
        }
        ctx.shadowBlur = 0;
    }
    
    // ============================================================
    // РЕЖИМ 5: РАДУГА
    // ============================================================
    else if (visualizerMode === 4) {
        var bars = 80;
        var barWidth = width / bars;
        
        for (var i = 0; i < bars; i++) {
            var val = dataArray[i % dataArray.length] || 0;
            var percent = val / 255;
            var x = i * barWidth;
            var barHeight = percent * height * 0.8;
            var hue = (i / bars) * 360 + time * 30;
            
            var grad = ctx.createLinearGradient(x, height, x, height - barHeight);
            grad.addColorStop(0, 'hsla(' + hue + ', 100%, 30%, 0.8)');
            grad.addColorStop(0.5, 'hsla(' + (hue + 30) + ', 100%, 60%, 0.9)');
            grad.addColorStop(1, 'hsla(' + (hue + 60) + ', 100%, 90%, 1)');
            
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'hsl(' + hue + ', 100%, 50%)';
            ctx.fillStyle = grad;
            ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
            
            // Блики
            if (percent > 0.5) {
                var sparkX = x + Math.random() * barWidth;
                var sparkY = height - barHeight + Math.random() * barHeight * 0.3;
                ctx.shadowBlur = 10;
                ctx.fillStyle = 'rgba(255, 255, 255, ' + (Math.random() * 0.3 + 0.1) + ')';
                ctx.beginPath();
                ctx.arc(sparkX, sparkY, Math.random() * 3 + 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.shadowBlur = 0;
    }
    
    // === ИНФОРМАЦИЯ ВНИЗУ ===
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    var modeNames = ['🌊 Аквариум', '🧠 Нейросеть', '🌌 Галактика', '🧬 ДНК', '🌈 Радуга'];
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
