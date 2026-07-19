// ================================================================
// РЕПОСТЫ
// ================================================================

window.openRepost = function(postId, type) {
    if (!USER) { alert('Войдите!'); return; }

    document.getElementById('repostModal').classList.add('open');
    document.getElementById('repostPostId').value = postId;
    document.getElementById('repostType').value = type;
    document.getElementById('repostText').value = '';
    document.getElementById('repostText').placeholder = 'Напишите что-нибудь (необязательно)...';
    document.getElementById('repostText').focus();
};

window.closeRepost = function() {
    document.getElementById('repostModal').classList.remove('open');
};

window.submitRepost = function() {
    var postId = document.getElementById('repostPostId').value;
    var type = document.getElementById('repostType').value;
    var comment = document.getElementById('repostText').value.trim();

    if (!postId) { alert('Ошибка: пост не найден'); return; }

    var path = getPostPath(type);

    db.ref('sites/' + SITE + '/' + path + '/' + postId).once('value', function(snap) {
        var original = snap.val();
        if (!original) { alert('Пост удалён'); closeRepost(); return; }

        var repostText = comment || '🔁 Репост';

        db.ref('sites/' + SITE + '/users/' + USER_UID + '/avatarUrl').once('value', function(avatarSnap) {
            var avatarUrl = avatarSnap.val() || null;

            var repostData = {
                author: USER,
                authorUid: USER_UID,
                authorAvatar: avatarUrl,
                text: repostText,
                timestamp: Date.now(),
                likes: 0,
                commentCount: 0,
                reposts: 0,
                hashtags: [],
                marquee: null,
                link: null,
                buttons: [],
                frameSize: 'small',
                edited: false,
                img: null,
                repost: null,
                deleted: null,
                deletedAt: null
            };

            if (pendingImageFile) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    repostData.img = e.target.result;
                    repostData.repost = createRepostObject(original);
                    saveNestedRepost(repostData, postId, type, path);
                };
                reader.readAsDataURL(pendingImageFile);
                return;
            }

            repostData.repost = createRepostObject(original);
            saveNestedRepost(repostData, postId, type, path);
        });
    });
};

function createRepostObject(original) {
    if (original.repost) {
        return {
            author: original.author,
            authorUid: original.authorUid,
            text: original.text || '',
            timestamp: original.timestamp || Date.now(),
            img: original.img || null,
            link: original.link || null,
            buttons: original.buttons || [],
            marquee: original.marquee || null,
            hashtags: original.hashtags || [],
            frameSize: original.frameSize || 'small',
            repost: original.repost
        };
    }

    return {
        author: original.author,
        authorUid: original.authorUid,
        text: original.text || '',
        timestamp: original.timestamp || Date.now(),
        img: original.img || null,
        link: original.link || null,
        buttons: original.buttons || [],
        marquee: original.marquee || null,
        hashtags: original.hashtags || [],
        frameSize: original.frameSize || 'small',
        repost: null
    };
}

function saveNestedRepost(repostData, postId, type, path) {
    var repostRef = db.ref('sites/' + SITE + '/' + path + '/' + postId + '/reposts');
    repostRef.transaction(function(current) {
        return (current || 0) + 1;
    });

    db.ref('sites/' + SITE + '/feed_posts').push(repostData);
    db.ref('sites/' + SITE + '/user_posts/' + USER_UID).push(repostData);

    closeRepost();

    setTimeout(function() {
        if (typeof loadFeed === 'function') loadFeed();
        if (typeof loadProfile === 'function') loadProfile();
    }, 300);
}
