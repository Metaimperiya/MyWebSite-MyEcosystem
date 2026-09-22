/* ================================================================
 * DOSS OS — DATA LAYER
 * ================================================================ */

(function () {
    'use strict';

    var DOSS_ROOT = 'doss';

    function ensureUid() {
        if (typeof USER_UID === 'undefined' || !USER_UID) {
            throw new Error('DOSS: USER_UID не определён — пользователь не авторизован');
        }
        return USER_UID;
    }

    function userRef() {
        return db.ref(DOSS_ROOT + '/users/' + ensureUid());
    }

    function moduleRef(mod) {
        return userRef().child(mod);
    }

    window.DossData = {
        userRef: userRef,

        ref: function (moduleName) {
            if (!moduleName) throw new Error('DOSS: moduleName обязателен');
            return moduleRef(moduleName);
        },

        get: function (moduleName) {
            return moduleRef(moduleName).once('value').then(function (snap) {
                return snap.val();
            });
        },

        set: function (moduleName, value) {
            return moduleRef(moduleName).set(value);
        },

        update: function (moduleName, patch) {
            return moduleRef(moduleName).update(patch);
        },

        push: function (moduleName, value) {
            var ref = moduleRef(moduleName).push();
            return ref.set(value).then(function () { return ref.key; });
        },

        remove: function (moduleName, key) {
            return moduleRef(moduleName).child(key).remove();
        },

        subscribe: function (moduleName, callback) {
            var ref = moduleRef(moduleName);
            var handler = ref.on('value', function (snap) {
                callback(snap.val(), snap);
            });
            return function () { ref.off('value', handler); };
        },

        ensureProfile: function (profile) {
            var ref = userRef();
            return ref.child('settings').once('value').then(function (snap) {
                if (!snap.exists()) {
                    return ref.child('settings').set({
                        theme: 'dark',
                        language: (typeof currentLang !== 'undefined' ? currentLang : 'ru'),
                        createdAt: Date.now(),
                        name: (profile && profile.name) || null
                    });
                }
                return null;
            });
        }
    };

    console.log('✅ DOSS data layer готов');
})();
