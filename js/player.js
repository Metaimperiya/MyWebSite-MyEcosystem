<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>METAIMPERIYA</title>
    <style>
        .player-handle {
            background: #1a1a2e;
            padding: 10px;
            text-align: center;
            cursor: pointer;
            color: white;
            border-radius: 0 0 12px 12px;
            margin: 0 -8px;
            position: sticky;
            top: 48px;
            z-index: 51;
        }
        .player-drawer {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.4s ease;
            background: #1a1a2e;
            margin: 0 -8px;
            padding: 0 8px;
            border-radius: 0 0 16px 16px;
        }
        .player-drawer.open {
            max-height: 500px;
            padding-bottom: 12px;
        }
        .handle-bar {
            width: 50px;
            height: 4px;
            background: #4a4a6a;
            margin: 0 auto 4px;
            border-radius: 4px;
        }
        .handle-label {
            color: #666;
            font-size: 0.45rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .player-content {
            padding: 0 8px 12px;
        }
        .player-track-name {
            color: #fff;
            font-size: 0.85rem;
            text-align: center;
        }
    </style>
</head>
<body>

<div style="max-width:480px;margin:0 auto;background:#f0f2f5;min-height:100vh;">

    <div style="background:#fff;padding:8px 12px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;position:sticky;top:0;z-index:100;">
        <span style="font-weight:700;color:#1877f2;">METAIMPERIYA 🏴‍☠️</span>
        <span>👤 Гость</span>
    </div>

    <!-- РУЧКА -->
    <div class="player-handle" id="playerHandle">
        <div class="handle-bar"></div>
        <div class="handle-label">🎵 ПЛЕЕР</div>
    </div>

    <!-- ПЛЕЕР -->
    <div class="player-drawer" id="playerDrawer">
        <div class="player-content">
            <div class="player-track-name" id="drawerTrackName">Capitulation</div>
            <div style="color:#888;font-size:0.6rem;text-align:center;">METAIMPERIYA</div>
            <div style="text-align:center;padding:8px 0;">
                <button onclick="togglePlay()" style="background:#1877f2;color:#fff;border:none;border-radius:50%;width:40px;height:40px;font-size:1.2rem;cursor:pointer;">▶</button>
            </div>
        </div>
    </div>

    <div style="padding:20px;text-align:center;color:#888;">
        <p>Нажми на ручку "🎵 ПЛЕЕР" — откроется плеер</p>
        <p style="font-size:0.7rem;margin-top:10px;">Если не работает — обнови страницу</p>
    </div>

</div>

<script>
    // ===== ПРОСТОЙ ПЛЕЕР (ВСТРОЕННЫЙ) =====
    const PLAYLIST = [
        { name: 'Capitulation' }
    ];
    let currentTrack = 0;
    let isPlaying = false;
    let audio = null;
    let drawerOpen = false;

    function initAudio() {
        if (!audio) {
            audio = new Audio('https://raw.githubusercontent.com/Metaimperiya/MyWebSite-MyEcosystem/main/music/capitulation.mp3');
            audio.crossOrigin = 'anonymous';
            audio.addEventListener('ended', function() {
                isPlaying = false;
                document.querySelector('#drawerPlayBtn')?.textContent = '▶';
            });
        }
        var nameEl = document.getElementById('drawerTrackName');
        if (nameEl) nameEl.textContent = PLAYLIST[currentTrack].name;
    }

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
            var btn = document.querySelector('#drawerPlayBtn');
            if (btn) btn.textContent = '▶';
        } else {
            audio.play().catch(function(e) { console.log('Ошибка:', e); });
            isPlaying = true;
            var btn = document.querySelector('#drawerPlayBtn');
            if (btn) btn.textContent = '⏸';
        }
    };

    // ===== КЛИК ПО РУЧКЕ =====
    document.addEventListener('DOMContentLoaded', function() {
        var handle = document.getElementById('playerHandle');
        if (handle) {
            handle.addEventListener('click', function() {
                window.toggleDrawer();
            });
        }
        console.log('✅ Плеер загружен!');
    });
</script>

</body>
</html>
