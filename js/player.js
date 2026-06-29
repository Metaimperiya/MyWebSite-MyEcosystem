// ================================================================
// ПЛЕЕР
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

let currentTrack = 0, isPlaying = false, audio = null;

function initAudio() {
    if (!audio) {
        audio = new Audio(PLAYLIST[currentTrack].url);
        audio.crossOrigin = 'anonymous';
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', () => {
            currentTrack = (currentTrack + 1) % PLAYLIST.length;
            audio.src = PLAYLIST[currentTrack].url;
            audio.play().catch(() => {});
            document.getElementById('trackName').textContent = PLAYLIST[currentTrack].name;
            updatePlaylistActive();
            updateProgress();
        });
    }
    document.getElementById('trackName').textContent = PLAYLIST[currentTrack].name;
    updatePlaylistActive();
}

function updateProgress() {
    if (!audio) return;
    document.getElementById('currentTime').textContent = formatTime(audio.currentTime);
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return min + ':' + (sec < 10 ? '0' : '') + sec;
}

function togglePlaylist() {
    document.getElementById('playlistDropdown').classList.toggle('open');
}

function playTrack(index) {
    if (index === currentTrack && isPlaying) { playMusic(); return; }
    currentTrack = index;
    if (audio) {
        audio.src = PLAYLIST[currentTrack].url;
        if (isPlaying) audio.play().catch(() => {});
    } else {
        initAudio();
        playMusic();
    }
    document.getElementById('trackName').textContent = PLAYLIST[currentTrack].name;
    updatePlaylistActive();
}

function updatePlaylistActive() {
    document.querySelectorAll('.playlist-item').forEach((el, i) => {
        el.classList.toggle('active', i === currentTrack);
    });
}

window.playMusic = function() {
    initAudio();
    if (!audio) return;
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        document.getElementById('playBtn').textContent = '▶';
    } else {
        audio.play().catch(e => console.log('Ошибка:', e));
        isPlaying = true;
        document.getElementById('playBtn').textContent = '⏸';
    }
};

initAudio();
