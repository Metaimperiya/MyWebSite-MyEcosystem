// ================================================================
// FIREBASE — НАСТРОЙКА
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

firebase.initializeApp(FB_CONFIG);
const db = firebase.database();
const auth = firebase.auth();
const storage = firebase.storage();
const provider = new firebase.auth.GoogleAuthProvider();

const SITE = (window.location.hostname || 'local').replace(/\./g, '_');
