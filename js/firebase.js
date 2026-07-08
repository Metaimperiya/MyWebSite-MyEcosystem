// ================================================================
// FIREBASE ИНИЦИАЛИЗАЦИЯ — ИСПРАВЛЕННЫЙ API КЛЮЧ
// ================================================================

const firebaseConfig = {
    apiKey: "AIzaSyCgVLnz4l6wHwSbKv3G5vZ5XZVjQvPcXt0",
    authDomain: "metaimperiya-5f020.firebaseapp.com",
    databaseURL: "https://metaimperiya-5f020-default-rtdb.firebaseio.com",
    projectId: "metaimperiya-5f020",
    storageBucket: "metaimperiya-5f020.firebasestorage.app",
    messagingSenderId: "529665265108",
    appId: "1:529665265108:web:653f0a530a0712a2c95790",
    measurementId: "G-DJXJT4Z93S"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

const db = firebase.database();
const auth = firebase.auth();
const storage = firebase.storage();
const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const SITE = 'metaimperiya';

let USER = null;
let USER_UID = null;
let isAdmin = false;
let VIEWING_USER = null;
let SAVED_PROFILES = [];
let avatarCache = {};
let currentLang = 'ru';
let notifUnsub = null;
let chatUnsub = null;
let CURRENT_ROOM = null;
let EDITING_ID = null;

// ================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ================================================================

function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ================================================================
// СТАТУС ДРУЗЕЙ
// ================================================================

function getFriendStatusRealtime(myUid, targetUid, callback) {
    if (!myUid || !targetUid) { callback('none'); return; }
    if (myUid === targetUid) { callback('self'); return; }
    
    var friendRef = db.ref('sites/' + SITE + '/friends/' + myUid + '/' + targetUid);
    var requestRef = db.ref('sites/' + SITE + '/friend_requests/' + myUid + '/' + targetUid);
    var receivedRef = db.ref('sites/' + SITE + '/friend_requests/' + targetUid + '/' + myUid);
    
    friendRef.once('value', function(fSnap) {
        if (fSnap.val() === true) {
            localStorage.setItem('fs_' + myUid + '_' + targetUid, 'friend');
            callback('friend');
            return;
        }
        
        requestRef.once('value', function(rSnap) {
            if (rSnap.val() === true) {
                localStorage.setItem('fs_' + myUid + '_' + targetUid, 'pending_sent');
                callback('pending_sent');
                return;
            }
            
            receivedRef.once('value', function(recSnap) {
                if (recSnap.val() === true) {
                    localStorage.setItem('fs_' + myUid + '_' + targetUid, 'pending_received');
                    callback('pending_received');
                    return;
                }
                
                localStorage.removeItem('fs_' + myUid + '_' + targetUid);
                callback('none');
            });
        });
    });
}

// ================================================================
// ДРУЗЬЯ
// ================================================================

function sendFriendRequest(targetUid) {
    if (!USER_UID || targetUid === USER_UID) return;
    
    db.ref('sites/' + SITE + '/friend_requests/' + targetUid + '/' + USER_UID).set(true);
    sendNotification(targetUid, {
        type: 'friend_request',
        from: USER_UID,
        text: USER + ' хочет добавить вас в друзья',
        timestamp: Date.now()
    });
    updateFriendButton(targetUid);
}

function cancelFriendRequest(targetUid) {
    if (!USER_UID) return;
    db.ref('sites/' + SITE + '/friend_requests/' + targetUid + '/' + USER_UID).remove();
    updateFriendButton(targetUid);
}

function acceptFriendRequest(fromUid) {
    if (!USER_UID) return;
    
    db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + fromUid).set(true);
    db.ref('sites/' + SITE + '/friends/' + fromUid + '/' + USER_UID).set(true);
    db.ref('sites/' + SITE + '/friend_requests/' + USER_UID + '/' + fromUid).remove();
    db.ref('sites/' + SITE + '/friend_requests/' + fromUid + '/' + USER_UID).remove();
    localStorage.setItem('fs_' + USER_UID + '_' + fromUid, 'friend');
    
    sendNotification(fromUid, {
        type: 'friend_accepted',
        from: USER_UID,
        text: USER + ' принял(а) ваш запрос в друзья',
        timestamp: Date.now()
    });
    
    updateFriendButton(fromUid);
    loadNotifications();
}

function declineFriendRequest(fromUid) {
    if (!USER_UID) return;
    db.ref('sites/' + SITE + '/friend_requests/' + USER_UID + '/' + fromUid).remove();
    db.ref('sites/' + SITE + '/friend_requests/' + fromUid + '/' + USER_UID).remove();
    updateFriendButton(fromUid);
}

function removeFriend(targetUid) {
    if (!USER_UID || !confirm('Удалить из друзей?')) return;
    
    db.ref('sites/' + SITE + '/friends/' + USER_UID + '/' + targetUid).remove();
    db.ref('sites/' + SITE + '/friends/' + targetUid + '/' + USER_UID).remove();
    localStorage.removeItem('fs_' + USER_UID + '_' + targetUid);
    updateFriendButton(targetUid);
}

// ================================================================
// УВЕДОМЛЕНИЯ
// ================================================================

function sendNotification(targetUid, data) {
    if (!USER_UID || !targetUid || targetUid === USER_UID) return;
    var ref = db.ref('sites/' + SITE + '/notifications/' + targetUid).push();
    ref.set({
        ...data,
        fromName: USER,
        fromUid: USER_UID,
        read: false,
        timestamp: Date.now()
    });
}

// ================================================================
// ЭКСПОРТ
// ================================================================

window.getFriendStatusRealtime = getFriendStatusRealtime;
window.sendFriendRequest = sendFriendRequest;
window.cancelFriendRequest = cancelFriendRequest;
window.acceptFriendRequest = acceptFriendRequest;
window.declineFriendRequest = declineFriendRequest;
window.removeFriend = removeFriend;
window.sendNotification = sendNotification;
window.esc = esc;
