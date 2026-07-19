// ================================================================
// ЛАЙКИ
// ================================================================

window.toggleLike = function(postId, type) {
    if (!USER) { alert('Войдите!'); return; }

    var key = 'lk_' + postId + '_' + USER_UID;
    var liked = localStorage.getItem(key) === '1';
    var path = getPostPath(type);
    var postRef = db.ref('sites/' + SITE + '/' + path + '/' + postId);
    var countEl = document.getElementById('likeCount_' + postId);
    var btn = document.querySelector('.post[data-id="' + postId + '"] .stats button:first-child');

    if (btn) {
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.6';
    }

    postRef.child('likes').transaction(function(currentLikes) {
        var current = currentLikes || 0;
        if (liked) {
            return Math.max(0, current - 1);
        } else {
            return current + 1;
        }
    }, function(error, committed, snapshot) {
        if (btn) {
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = '1';
        }

        if (error) {
            console.error('Ошибка лайка:', error);
            return;
        }

        if (committed) {
            var newValue = snapshot.val() || 0;

            if (countEl) {
                countEl.textContent = newValue;
            }

            if (liked) {
                localStorage.removeItem(key);
                if (btn) btn.classList.remove('liked');
            } else {
                localStorage.setItem(key, '1');
                if (btn) btn.classList.add('liked');
            }
        }
    });
};

window.toggleLikeComment = function(postId, commentId, type) {
    if (!USER) { alert('Войдите!'); return; }

    var path = getPostPath(type);
    var likeRef = db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments/' + commentId + '/likesUsers/' + USER_UID);
    var countEl = document.getElementById('commentLikeCount_' + commentId);
    
    likeRef.once('value', function(snap) {
        var hasLiked = snap.val() === true;
        
        if (hasLiked) {
            likeRef.remove();
            db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments/' + commentId + '/likes').transaction(function(current) {
                return Math.max(0, (current || 0) - 1);
            });
            if (countEl) {
                countEl.textContent = parseInt(countEl.textContent) - 1;
            }
        } else {
            likeRef.set(true);
            db.ref('sites/' + SITE + '/' + path + '/' + postId + '/comments/' + commentId + '/likes').transaction(function(current) {
                return (current || 0) + 1;
            });
            if (countEl) {
                countEl.textContent = parseInt(countEl.textContent) + 1;
            }
        }
    });
};
