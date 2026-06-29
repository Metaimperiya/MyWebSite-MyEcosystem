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

const ADMIN_UIDS = [
    "ayXehcol9FgAQU6tZuup7aSaRoV2",
    "pWB0nGVvVXc4je6466ss7IwBm9G2",
    "ANR62p3qcjOe2ALsdVvJHUNCCV42"
];

let isAdmin = false;
let USER = null;
let USER_UID = null;
let SAVED_PROFILES = [];
let avatarCache = null;
let chatUnsub = null;
let notifUnsub = null;
let currentTab = 'feed';
let viewingProfileUid = null;
let activeStatToggle = null;
let profilePrivacy = { hideFriends: false };
let CURRENT_ROOM = null;
let friendListeners = {};
let activeRequests = new Map();
