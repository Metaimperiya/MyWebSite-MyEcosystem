// ================================================================
// ПРОФИЛЬ: СТАТУСЫ И ОТЗЫВЫ
// ================================================================

var reputationReviewRef = null;
var profileLevelRef = null;
var profileFunctions = null;
var inlineRatingCache = {};
var inlineStatusCache = {};

function isProfileAdmin() {
    return !!USER_UID && ADMIN_UIDS.includes(USER_UID);
}

function reputationPath(path) {
    return 'sites/' + SITE + '/' + path;
}

function renderProfileBadges(status) {
    var el = document.getElementById('profileBadges');
    if (!el) return;
    var now = Date.now();
    var isPro = !!status.pro && (!status.proExpiresAt || status.proExpiresAt > now);
    el.innerHTML =
        (status.verified ? '<span class="profile-badge verified" title="Проверенный аккаунт" aria-label="Проверенный аккаунт">✓</span>' : '') +
        (isPro ? '<span class="profile-badge pro" title="PRO-аккаунт">PRO</span>' : '');
}

function statusBadgesHtml(status) {
    var isPro = !!status.pro && (!status.proExpiresAt || status.proExpiresAt > Date.now());
    return (status.verified ? '<span class="inline-verified" title="Проверенный аккаунт">✓</span>' : '') +
        (isPro ? '<span class="inline-pro" title="PRO-аккаунт">PRO</span>' : '');
}

function renderInlineStatus(element, status) {
    if (!element) return;
    element.innerHTML = statusBadgesHtml(status);
}

function refreshInlineStatuses(uid, status) {
    inlineStatusCache[uid] = status;
    document.querySelectorAll('[data-profile-status="' + uid + '"]').forEach(function(element) {
        renderInlineStatus(element, status);
    });
}

window.loadInlineProfileStatus = function(uid, element) {
    if (!uid || !element) return;
    if (inlineStatusCache[uid]) return renderInlineStatus(element, inlineStatusCache[uid]);
    db.ref(reputationPath('profile_status/' + uid)).once('value', function(snap) {
        var status = snap.val() || {};
        refreshInlineStatuses(uid, status);
    });
};

window.loadTopProfileStatus = function(uid) {
    var element = document.getElementById('topAvatarStatus');
    if (!element || !uid) return;
    element.setAttribute('data-profile-status', uid);
    window.loadInlineProfileStatus(uid, element);
};

function loadProfileStatus(uid) {
    if (!uid) return;
    db.ref(reputationPath('profile_status/' + uid)).once('value', function(snap) {
        var status = snap.val() || {};
        renderProfileBadges(status);
        refreshInlineStatuses(uid, status);
    });
}

function renderProfileLevel(levelData) {
    var el = document.getElementById('profileLevel');
    if (!el) return;
    var level = Math.max(1, Math.min(86, Number(levelData.level) || 1));
    var experience = Math.max(0, Number(levelData.experience) || 0);
    el.innerHTML = '<span>Уровень <strong>' + level + '</strong></span><small>' + experience + ' опыта</small>';
}

function loadProfileLevel(uid) {
    if (profileLevelRef) profileLevelRef.off('value');
    profileLevelRef = db.ref(reputationPath('profile_levels/' + uid));
    profileLevelRef.on('value', function(snap) { renderProfileLevel(snap.val() || {}); });
}

function getProfileFunctions() {
    if (profileFunctions) return profileFunctions;
    if (!firebase.functions) return null;
    profileFunctions = firebase.functions();
    return profileFunctions;
}

function recordDailyProfileVisit() {
    var functions = getProfileFunctions();
    if (!functions || !USER_UID) return;
    functions.httpsCallable('recordDailyVisit')({ site: SITE }).then(function(result) {
        if (result.data && result.data.added) renderProfileLevel(result.data);
    }).catch(function(error) {
        // Пока функция не опубликована, интерфейс сайта должен продолжать работать.
        console.info('Опыт за посещение пока недоступен:', error.code || error.message);
    });
}

function stars(value) {
    var rounded = Math.round(Number(value) || 0);
    return '<span class="rating-stars" aria-label="Оценка ' + rounded + ' из 5">' +
        [1, 2, 3, 4, 5].map(function(n) { return n <= rounded ? '★' : '☆'; }).join('') +
        '</span>';
}

function ratingDataFromReviews(reviews) {
    var values = Object.keys(reviews || {}).map(function(id) { return reviews[id] || {}; })
        .filter(function(review) { return review.rating >= 1 && review.rating <= 5; });
    var average = values.length ? values.reduce(function(sum, review) { return sum + Number(review.rating); }, 0) / values.length : 0;
    return { average: average, count: values.length };
}

function renderInlineRating(element, data) {
    if (!element) return;
    element.innerHTML = stars(data.average);
    element.title = data.count ? 'Рейтинг ' + data.average.toFixed(1) + ' из 5 (' + data.count + ')' : 'Пока нет отзывов';
    element.setAttribute('aria-label', element.title);
}

function refreshInlineRatings(uid, data) {
    inlineRatingCache[uid] = data;
    document.querySelectorAll('[data-profile-rating="' + uid + '"]').forEach(function(element) {
        renderInlineRating(element, data);
    });
}

window.loadInlineProfileRating = function(uid, element) {
    if (!uid || !element) return;
    if (inlineRatingCache[uid]) return renderInlineRating(element, inlineRatingCache[uid]);
    db.ref(reputationPath('profile_reviews/' + uid)).once('value', function(snap) {
        var data = ratingDataFromReviews(snap.val() || {});
        refreshInlineRatings(uid, data);
    });
};

window.loadTopProfileRating = function(uid) {
    var element = document.getElementById('topAvatarRating');
    if (!element || !uid) return;
    element.setAttribute('data-profile-rating', uid);
    window.loadInlineProfileRating(uid, element);
};

function renderReviews(uid, reviews) {
    var summary = document.getElementById('profileRatingSummary');
    var list = document.getElementById('profileReviewsList');
    var avatarRating = document.getElementById('profileAvatarRating');
    if (!summary || !list) return;
    var values = Object.keys(reviews || {}).map(function(id) {
        var review = reviews[id] || {};
        review.id = id;
        return review;
    }).filter(function(review) { return review.rating >= 1 && review.rating <= 5; });
    values.sort(function(a, b) { return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0); });
    var average = values.length ? values.reduce(function(sum, review) { return sum + Number(review.rating); }, 0) / values.length : 0;
    refreshInlineRatings(uid, { average: average, count: values.length });
    if (avatarRating) {
        avatarRating.innerHTML = stars(average) + (values.length ? '<small>' + average.toFixed(1) + '</small>' : '');
        avatarRating.setAttribute('aria-label', values.length ? 'Рейтинг ' + average.toFixed(1) + ' из 5' : 'Пока нет оценок');
    }
    summary.innerHTML = values.length
        ? '<strong>' + average.toFixed(1) + '</strong> ' + stars(average) + ' <span>(' + values.length + ' ' + pluralReviews(values.length) + ')</span>'
        : '<span>Пока нет отзывов</span>';
    if (!values.length) {
        list.innerHTML = '<div class="profile-review-empty">Будьте первым, кто оставит отзыв.</div>';
        return;
    }
    list.innerHTML = values.map(function(review) {
        var name = esc(review.authorName || 'Пользователь');
        var date = review.updatedAt || review.createdAt;
        var canDelete = isProfileAdmin() || review.authorUid === USER_UID;
        return '<article class="profile-review">' +
            '<div class="profile-review-head"><strong>' + name + '</strong>' + stars(review.rating) + '</div>' +
            '<p>' + esc(review.text || '') + '</p>' +
            '<div class="profile-review-footer">' + (date ? new Date(date).toLocaleDateString() : '') +
            (canDelete ? '<button type="button" onclick="deleteProfileReview(\'' + uid + '\', \'' + review.id + '\')">Удалить</button>' : '') +
            '</div></article>';
    }).join('');
}

function pluralReviews(n) {
    var mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'отзыв';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'отзыва';
    return 'отзывов';
}

function loadProfileReviews(uid) {
    if (reputationReviewRef) reputationReviewRef.off('value');
    reputationReviewRef = db.ref(reputationPath('profile_reviews/' + uid));
    reputationReviewRef.on('value', function(snap) { renderReviews(uid, snap.val() || {}); });
}

window.submitProfileReview = function() {
    var uid = VIEWING_USER || USER_UID;
    var ratingEl = document.querySelector('input[name="profileRating"]:checked');
    var textEl = document.getElementById('profileReviewText');
    var text = textEl ? textEl.value.trim() : '';
    if (!USER_UID) return alert('Войдите, чтобы оставить отзыв.');
    if (!uid || uid === USER_UID) return alert('Нельзя оставить отзыв о собственном профиле.');
    if (!ratingEl) return alert('Выберите оценку от 1 до 5.');
    if (text.length < 3) return alert('Напишите отзыв хотя бы из 3 символов.');
    if (text.length > 1000) return alert('Отзыв не должен быть длиннее 1000 символов.');
    var now = Date.now();
    var ref = db.ref(reputationPath('profile_reviews/' + uid + '/' + USER_UID));
    ref.once('value').then(function(snap) {
        var old = snap.val() || {};
        return ref.set({
            authorUid: USER_UID,
            authorName: USER || 'Пользователь',
            rating: Number(ratingEl.value),
            text: text,
            createdAt: old.createdAt || now,
            updatedAt: now
        });
    }).then(function() {
        textEl.value = '';
        document.querySelectorAll('input[name="profileRating"]').forEach(function(input) { input.checked = false; });
        alert('Отзыв сохранён. Вы можете изменить его, отправив новый.');
    }).catch(function(error) { alert('Не удалось сохранить отзыв: ' + error.message); });
};

window.deleteProfileReview = function(profileUid, reviewId) {
    if (!USER_UID) return;
    if (!isProfileAdmin() && reviewId !== USER_UID) return;
    if (!confirm('Удалить этот отзыв?')) return;
    db.ref(reputationPath('profile_reviews/' + profileUid + '/' + reviewId)).remove()
        .catch(function(error) { alert('Не удалось удалить отзыв: ' + error.message); });
};

window.setProfileStatus = function(uid, field, value) {
    if (!isProfileAdmin()) return alert('Только администратор может менять статусы.');
    var ref = db.ref(reputationPath('profile_status/' + uid));
    ref.once('value').then(function(snap) {
        var current = snap.val() || {};
        current.verified = !!current.verified;
        current.pro = !!current.pro;
        current[field] = value;
        current.updatedAt = Date.now();
        current.updatedBy = USER_UID;
        return ref.set(current);
    })
        .then(function() { loadProfileStatus(uid); })
        .catch(function(error) { alert('Не удалось изменить статус: ' + error.message); });
};

window.setProfilePro = function(uid) {
    if (!isProfileAdmin()) return alert('Только администратор может выдавать PRO.');
    var rawDays = prompt('Срок PRO в днях. Оставьте 0 для бессрочного статуса.', '30');
    if (rawDays === null) return;
    var days = Number(rawDays);
    if (!Number.isInteger(days) || days < 0 || days > 3650) return alert('Введите целое число от 0 до 3650.');
    var ref = db.ref(reputationPath('profile_status/' + uid));
    ref.once('value').then(function(snap) {
        var current = snap.val() || {};
        current.verified = !!current.verified;
        current.pro = true;
        current.proExpiresAt = days ? Date.now() + days * 86400000 : null;
        current.updatedAt = Date.now();
        current.updatedBy = USER_UID;
        return ref.set(current);
    }).then(function() { loadProfileStatus(uid); })
        .catch(function(error) { alert('Не удалось выдать PRO: ' + error.message); });
};

window.adjustProfileExperience = function(uid) {
    if (!isProfileAdmin()) return alert('Только администратор может менять опыт.');
    var raw = prompt('Изменение опыта: положительное число — начислить, отрицательное — списать.', '0');
    if (raw === null) return;
    var delta = Number(raw);
    if (!Number.isInteger(delta) || !delta || delta < -5000 || delta > 5000) return alert('Введите целое число от -5000 до 5000, кроме 0.');
    var reason = prompt('Причина изменения опыта (видна только в журнале администратора):', '') || '';
    var functions = getProfileFunctions();
    if (!functions) return alert('Модуль Firebase Functions не подключён.');
    functions.httpsCallable('adjustProfileExperience')({ site: SITE, uid: uid, delta: delta, reason: reason })
        .then(function(result) { renderProfileLevel(result.data || {}); })
        .catch(function(error) { alert('Не удалось изменить опыт: ' + (error.message || error.code)); });
};

window.setProfileLevel = function(uid) {
    if (!isProfileAdmin()) return alert('Только администратор может менять уровень.');
    var raw = prompt('Укажите уровень от 1 до 86.', '1');
    if (raw === null) return;
    var level = Number(raw);
    if (!Number.isInteger(level) || level < 1 || level > 86) return alert('Введите целое число от 1 до 86.');
    var functions = getProfileFunctions();
    if (!functions) return alert('Модуль Firebase Functions не подключён.');
    functions.httpsCallable('setProfileLevel')({ site: SITE, uid: uid, level: level })
        .then(function(result) { renderProfileLevel(result.data || {}); })
        .catch(function(error) { alert('Не удалось установить уровень: ' + (error.message || error.code)); });
};

window.rebuildProfileExperience = function(uid) {
    if (!isProfileAdmin()) return alert('Только администратор может пересчитать опыт.');
    if (!confirm('Пересчитать опыт из всех существующих постов и комментариев этого пользователя?')) return;
    var functions = getProfileFunctions();
    if (!functions) return alert('Модуль Firebase Functions не подключён.');
    functions.httpsCallable('rebuildProfileExperience')({ site: SITE, uid: uid })
        .then(function(result) { renderProfileLevel(result.data || {}); alert('Уровень пересчитан.'); })
        .catch(function(error) { alert('Не удалось пересчитать опыт: ' + (error.message || error.code)); });
};

function renderReputationPanel(uid) {
    var panel = document.getElementById('profileReputation');
    if (!panel) return;
    var viewingOwn = uid === USER_UID;
    var canReview = !!USER_UID && !viewingOwn;
    panel.hidden = false;
    panel.innerHTML =
        '<section class="profile-rating"><h4>Отзывы и рейтинг</h4><div id="profileRatingSummary" class="profile-rating-summary">Загрузка…</div></section>' +
        (canReview ? '<section class="profile-review-form"><h4>Оставить отзыв</h4><div class="profile-rating-choice" aria-label="Ваша оценка">' +
            [5, 4, 3, 2, 1].map(function(n) { return '<input id="rating' + n + '" type="radio" name="profileRating" value="' + n + '"><label for="rating' + n + '">★</label>'; }).join('') +
            '</div><textarea id="profileReviewText" maxlength="1000" placeholder="Ваш отзыв о профиле"></textarea><button type="button" class="btn-primary" onclick="submitProfileReview()">Опубликовать отзыв</button></section>' : '') +
        '<section class="profile-reviews"><h4>Все отзывы</h4><div id="profileReviewsList"></div></section>';
    if (isProfileAdmin()) {
        var controls = document.createElement('section');
        controls.className = 'profile-status-admin';
        controls.innerHTML = '<h4>Управление статусами</h4><button type="button" onclick="setProfileStatus(\'' + uid + '\',\'verified\',true)">Выдать галочку</button><button type="button" onclick="setProfileStatus(\'' + uid + '\',\'verified\',false)">Снять галочку</button><button type="button" onclick="setProfilePro(\'' + uid + '\')">Выдать PRO</button><button type="button" onclick="setProfileStatus(\'' + uid + '\',\'pro\',false)">Снять PRO</button><button type="button" onclick="setProfileLevel(\'' + uid + '\')">Установить уровень</button><button type="button" onclick="adjustProfileExperience(\'' + uid + '\')">Изменить опыт</button><button type="button" onclick="rebuildProfileExperience(\'' + uid + '\')">Пересчитать уровень</button>';
        panel.appendChild(controls);
    }
    loadProfileReviews(uid);
}

window.loadProfileReputation = function(uid) {
    loadProfileStatus(uid);
    loadProfileLevel(uid);
    renderReputationPanel(uid);
    if (uid === USER_UID) recordDailyProfileVisit();
};
