(function() {
    'use strict';

    var discussionId = 'metaimperiya_cpm2_landing_discussion';
    var kinds = ['like', 'dislike'];

    function reactionRef() {
        var key = window.getPostSocialKey ? window.getPostSocialKey(discussionId, 'feed', '') : encodeURIComponent('feed_' + discussionId);
        return db.ref('sites/' + SITE + '/post_reactions/' + key);
    }

    function updateReactionCounts(card) {
        if (!USER_UID) return;
        reactionRef().once('value').then(function(snapshot) {
            if (!card.isConnected) return;
            var reactions = snapshot.val() || {};
            var counts = { like: 0, dislike: 0 };
            Object.keys(reactions).forEach(function(uid) {
                if (kinds.indexOf(reactions[uid]) !== -1) counts[reactions[uid]]++;
            });
            kinds.forEach(function(kind) {
                var button = card.querySelector('[data-landing-reaction="' + kind + '"]');
                if (!button) return;
                button.querySelector('span').textContent = counts[kind];
                button.classList.toggle('is-selected', reactions[USER_UID] === kind);
            });
        }).catch(function(error) {
            var state = card.querySelector('.cpm2-landing-reaction-state');
            if (state) state.textContent = 'Войдите, чтобы увидеть реакции.';
            console.warn('Не удалось загрузить реакции обсуждения:', error);
        });
    }

    window.toggleCpm2LandingReaction = function(kind) {
        if (kinds.indexOf(kind) === -1) return;
        if (!USER_UID) { if (window.openLoginModal) window.openLoginModal(); return; }
        var button = document.querySelector('#cpm2LandingDiscussion [data-landing-reaction="' + kind + '"]');
        if (button) button.disabled = true;
        reactionRef().child(USER_UID).transaction(function(current) {
            return current === kind ? null : kind;
        }).then(function() {
            var card = document.querySelector('#cpm2LandingDiscussion .cpm2-landing-post');
            if (card) updateReactionCounts(card);
        }).catch(function(error) {
            alert('Не удалось сохранить реакцию: ' + (error.message || 'ошибка доступа'));
        }).finally(function() { if (button) button.disabled = false; });
    };

    window.renderCpm2LandingDiscussion = function() {
        var target = document.getElementById('cpm2LandingDiscussion');
        if (!target) return;
        target.innerHTML = '<article class="card post cpm2-landing-post" data-id="' + discussionId + '" data-type="feed">' +
            '<div class="author"><span class="post-author-avatar"><span class="avatar-wrap"><span class="letter">M</span></span></span><span class="name">METAIMPERIYA</span><span class="time">ОБСУЖДЕНИЕ</span></div>' +
            '<div class="post-content">Что для тебя главное в сообществе CPM2? Расскажи в комментариях: кого ищешь для игры, какой автомобиль хочешь обменять или какую идею для сообщества стоит обсудить.</div>' +
            '<div class="stats"><button type="button" data-landing-reaction="like" onclick="toggleCpm2LandingReaction(\'like\')" aria-label="Нравится">👍 <span>0</span></button><button type="button" data-landing-reaction="dislike" onclick="toggleCpm2LandingReaction(\'dislike\')" aria-label="Не нравится">👎 <span>0</span></button><button type="button" onclick="if(window.checkAccess())window.toggleComments(\'' + discussionId + '\',\'feed\')">💬 <span id="commentCount_' + discussionId + '">0</span></button></div>' +
            '<div class="cpm2-landing-reaction-state" aria-live="polite"></div>' +
            '<div class="comments-wrapper" id="commentsWrapper_' + discussionId + '" style="display:none"><div class="comments"><div class="comments-body"><div class="comments-list"><div id="commentsContainer_' + discussionId + '"></div></div></div></div></div>' +
            '<div class="comment-input-wrap"><input type="text" id="commentInput_' + discussionId + '" maxlength="1000" placeholder="Написать комментарий…" onkeydown="if(event.key===\'Enter\')submitComment(\'' + discussionId + '\',\'feed\')"><button type="button" onclick="if(window.checkAccess())submitComment(\'' + discussionId + '\',\'feed\')" aria-label="Отправить комментарий">→</button></div>' +
            '</article>';
        var card = target.querySelector('.cpm2-landing-post');
        if (card) updateReactionCounts(card);
    };

    window.refreshCpm2LandingReactions = function() {
        var card = document.querySelector('#cpm2LandingDiscussion .cpm2-landing-post');
        if (card) updateReactionCounts(card);
    };
})();
