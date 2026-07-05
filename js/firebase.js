// ================================================================
// НАСТРОЙКА FIREBASE
// ================================================================

const FB_CONFIG = {
    apiKey: "AIzaSyDCx2wLK2EZJOrUNoXEdWDlYY0e8cOHhtY",
    authDomain: "myecosystem-e6414.firebaseapp.com",
    databaseURL: "https://myecosystem-e6414-default-rtdb.firebaseio.com",
    projectId: "myecosystem-e6414",
    storageBucket: "myecosystem-e6414.firebasestorage.app",
    messagingSenderId: "426302111033",
    appId: "1:426302111033:web:7b39e7026e94f528a13ce8"
};

// Проверяем, что Firebase SDK загружен
if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    firebase.initializeApp(FB_CONFIG);
    console.log('✅ Firebase инициализирован');
} else {
    console.error('❌ Firebase SDK не загружен! Проверь подключение скриптов.');
    // Пробуем инициализировать через window.firebase
    if (window.firebase && window.firebase.initializeApp) {
        window.firebase.initializeApp(FB_CONFIG);
        console.log('✅ Firebase инициализирован через window');
    }
}

const db = firebase.database();
const auth = firebase.auth();
const storage = firebase.storage();
const provider = new firebase.auth.GoogleAuthProvider();

// ================================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ================================================================

const SITE = (window.location.hostname || 'local').replace(/\./g, '_');

// Админы (можно добавлять UID)
const ADMIN_UIDS = [
    "ayXehcol9FgAQU6tZuup7aSaRoV2",
    "pWB0nGVvVXc4je6466ss7IwBm9G2",
    "ANR62p3qcjOe2ALsdVvJHUNCCV42"
];

let isAdmin = false;
let USER = null;
let USER_UID = null;
let VIEWING_USER = null;
let SAVED_PROFILES = [];
let avatarCache = {};
let chatUnsub = null;
let notifUnsub = null;
let currentTab = 'feed';
let activeStatToggle = null;
let CURRENT_ROOM = null;
let friendListeners = {};
let activeRequests = new Map();
let currentFrameSize = 'small';
let EDITING_ID = null;
let pendingImage = null;
let pendingImageFile = null;

// ================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ================================================================

function esc(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return min + ':' + (sec < 10 ? '0' : '') + sec;
}
