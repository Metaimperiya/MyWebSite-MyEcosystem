// ================================================================
// ЗНАКОМСТВА: АНКЕТЫ И ПОИСК ПО СТРАНЕ/ГОРОДУ
// ================================================================
var datingProfiles = {};
var datingBlocked = {};
var datingCountryItems = [];
var datingPhotoPreviewUrl = null;
var datingCurrentPhotoUrl = '';

var DATING_COUNTRY_CODES = ('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' ');

function datingEscape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(char) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
}

function datingCountries() {
    if (datingCountryItems.length) return datingCountryItems;
    var names = new Intl.DisplayNames(['ru'], { type: 'region' });
    datingCountryItems = DATING_COUNTRY_CODES.map(function(code) {
        var name = names.of(code);
        return { code: code, name: name && name !== code ? name : code };
    }).sort(function(a, b) { return a.name.localeCompare(b.name, 'ru'); });
    return datingCountryItems;
}

function datingCountryCode(name) {
    var value = String(name || '').trim().normalize('NFC').replace(/\s+/g, ' ').toLocaleLowerCase('ru');
    var aliases = { 'україна': 'UA', ukraine: 'UA', usa: 'US', 'united states': 'US', 'united kingdom': 'GB', britain: 'GB' };
    if (aliases[value]) value = aliases[value].toLocaleLowerCase('ru');
    var found = datingCountries().find(function(country) {
        return country.name.trim().normalize('NFC').replace(/\s+/g, ' ').toLocaleLowerCase('ru') === value || country.code.toLocaleLowerCase('ru') === value;
    });
    return found || null;
}

function datingCountryName(code) {
    var found = datingCountries().find(function(country) { return country.code === code; });
    return found ? found.name : '';
}

function datingSafeImage(url) {
    if (!url) return '';
    try {
        var parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
    } catch (error) { return ''; }
}

function datingPhotoSource(value) {
    var safeUrl = datingSafeImage(value);
    if (safeUrl) return safeUrl;
    value = String(value || '');
    return value.length <= 400000 && /^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : '';
}

function datingBlobToDataUrl(blob) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function() { resolve(String(reader.result || '')); };
        reader.onerror = function() { reject(new Error('Не удалось прочитать подготовленное фото.')); };
        reader.readAsDataURL(blob);
    });
}

function datingLoadImage(file) {
    if (typeof createImageBitmap === 'function') {
        return createImageBitmap(file).catch(function() { return datingLoadImageElement(file); });
    }
    return datingLoadImageElement(file);
}

function datingLoadImageElement(file) {
    return new Promise(function(resolve, reject) {
        var image = new Image();
        var objectUrl = URL.createObjectURL(file);
        image.onload = function() {
            URL.revokeObjectURL(objectUrl);
            resolve({ width: image.naturalWidth, height: image.naturalHeight, close: function() {} });
        };
        image.onerror = function() {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Не удалось открыть выбранное изображение.'));
        };
        image.src = objectUrl;
    });
}

function datingCompressPhoto(file) {
    return datingLoadImage(file).then(function(bitmap) {
        var canvas = document.createElement('canvas');
        var scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
        var width = Math.max(1, Math.round(bitmap.width * scale));
        var height = Math.max(1, Math.round(bitmap.height * scale));
        var quality = 0.82;
        var attempts = 0;
        function encode() {
            canvas.width = width;
            canvas.height = height;
            var context = canvas.getContext('2d');
            context.drawImage(bitmap, 0, 0, width, height);
            return new Promise(function(resolve, reject) {
                canvas.toBlob(function(blob) {
                    if (!blob) { reject(new Error('Не удалось сжать фотографию. Попробуй другое изображение.')); return; }
                    if (blob.size <= 220 * 1024) { bitmap.close(); resolve(blob); return; }
                    attempts++;
                    if (attempts >= 8 || width <= 360) {
                        bitmap.close();
                        reject(new Error('Фото слишком большое даже после сжатия. Выбери другое изображение.'));
                        return;
                    }
                    width = Math.max(360, Math.round(width * 0.8));
                    height = Math.max(1, Math.round(height * 0.8));
                    quality = Math.max(0.56, quality - 0.04);
                    encode().then(resolve, reject);
                }, 'image/webp', quality);
            });
        }
        return encode();
    });
}

function setupDatingCountries() {
    var list = document.getElementById('datingCountryOptions');
    if (list) list.innerHTML = datingCountries().map(function(country) { return '<option value="' + datingEscape(country.name) + '"></option>'; }).join('');
}

var DATING_CITY_SUGGESTIONS = {
    UA: ['Киев', 'Харьков', 'Одесса', 'Днепр', 'Львов', 'Запорожье', 'Винница', 'Полтава', 'Черкассы', 'Чернигов', 'Сумы', 'Житомир', 'Ровно', 'Луцк', 'Ужгород', 'Ивано-Франковск', 'Тернополь', 'Кропивницкий', 'Николаев', 'Херсон', 'Кременчуг', 'Белая Церковь'],
    PL: ['Варшава', 'Краков', 'Вроцлав', 'Познань', 'Гданьск', 'Лодзь'],
    DE: ['Берлин', 'Гамбург', 'Мюнхен', 'Кёльн', 'Франкфурт-на-Майне'],
    US: ['Нью-Йорк', 'Лос-Анджелес', 'Чикаго', 'Хьюстон', 'Майами', 'Сан-Франциско'],
    CA: ['Торонто', 'Монреаль', 'Ванкувер', 'Оттава', 'Калгари'],
    GB: ['Лондон', 'Манчестер', 'Бирмингем', 'Ливерпуль', 'Глазго'],
    FR: ['Париж', 'Марсель', 'Лион', 'Тулуза', 'Ницца'],
    ES: ['Мадрид', 'Барселона', 'Валенсия', 'Севилья', 'Малага'],
    IT: ['Рим', 'Милан', 'Неаполь', 'Турин', 'Флоренция'],
    TR: ['Стамбул', 'Анкара', 'Измир', 'Анталья'],
    RU: ['Москва', 'Санкт-Петербург', 'Казань', 'Екатеринбург', 'Новосибирск']
};

function updateDatingCityOptions() {
    var countryField = document.getElementById('datingCountry');
    var options = document.getElementById('datingCityOptions');
    if (!countryField || !options) return;
    var country = datingCountryCode(countryField.value);
    var cities = country ? (DATING_CITY_SUGGESTIONS[country.code] || []) : [];
    options.innerHTML = cities.map(function(city) { return '<option value="' + datingEscape(city) + '"></option>'; }).join('');
}

window.loadDating = function() {
    var grid = document.getElementById('datingGrid');
    if (!grid) return;
    setupDatingCountries();
    if (!USER_UID) { grid.innerHTML = '<div class="dating-empty">Войди, чтобы смотреть анкеты и создавать свою.</div>'; return; }
    grid.innerHTML = '<div class="dating-empty">Загружаем анкеты…</div>';
    Promise.all([
        db.ref('sites/' + SITE + '/dating_profiles').once('value'),
        db.ref('sites/' + SITE + '/blocks/' + USER_UID).once('value'),
        db.ref('sites/' + SITE + '/dating_private_profiles/' + USER_UID).once('value')
    ]).then(function(snapshots) {
        datingProfiles = snapshots[0].val() || {};
        datingBlocked = snapshots[1].val() || {};
        var ownProfile = snapshots[2].val();
        if (ownProfile) datingProfiles[USER_UID] = ownProfile;
        renderDatingProfiles();
    }).catch(function(error) {
        console.error('Не удалось загрузить анкеты:', error);
        grid.innerHTML = '<div class="dating-empty">Не удалось загрузить анкеты. Проверь правила Firebase.</div>';
    });
};

function datingGenderMatches(seeking, gender) {
    if (!seeking || seeking === 'Всех') return true;
    if (seeking === 'Парней') return gender === 'Парень';
    if (seeking === 'Девушек') return gender === 'Девушка';
    return false;
}

function datingIsMutualMatch(candidate) {
    var own = datingProfiles[USER_UID];
    if (!own) return true;
    return datingGenderMatches(own.seeking, candidate.gender) && datingGenderMatches(candidate.seeking, own.gender);
}

function renderDatingProfiles() {
    var grid = document.getElementById('datingGrid');
    if (!grid) return;
    var countryText = (document.getElementById('datingCountryFilter').value || '').trim().toLocaleLowerCase('ru');
    var selectedCountry = datingCountryCode(countryText);
    var cityText = (document.getElementById('datingCityFilter').value || '').trim().toLocaleLowerCase('ru');
    var goal = document.getElementById('datingGoalFilter').value;
    var profiles = Object.keys(datingProfiles).map(function(uid) { return Object.assign({ uid: uid }, datingProfiles[uid] || {}); })
        .filter(function(profile) {
            if (profile.uid === USER_UID || profile.isActive !== true || datingBlocked[profile.uid]) return false;
            if (!datingIsMutualMatch(profile)) return false;
            if (selectedCountry && profile.countryCode !== selectedCountry.code) return false;
            if (countryText && !selectedCountry && !(profile.country || '').toLocaleLowerCase('ru').includes(countryText)) return false;
            if (cityText && !(profile.city || '').toLocaleLowerCase('ru').includes(cityText)) return false;
            if (goal && profile.goal !== goal) return false;
            return true;
        }).sort(function(a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
    var ownProfile = datingProfiles[USER_UID];
    var ownCard = ownProfile ? '<button type="button" class="dating-card dating-own-card" data-dating-own><span class="dating-own-badge">МОЯ АНКЕТА</span><span class="dating-card-photo">' + (datingPhotoSource(ownProfile.photoUrl) ? '<img src="' + datingEscape(datingPhotoSource(ownProfile.photoUrl)) + '" alt="">' : '<span>' + datingEscape(Array.from(ownProfile.name || '?')[0]) + '</span>') + '</span><span class="dating-card-name">' + datingEscape(ownProfile.name || 'Моя анкета') + '</span><span class="dating-card-meta">' + datingEscape(ownProfile.city || '') + (ownProfile.country ? ', ' + datingEscape(ownProfile.country) : '') + '</span><span class="dating-card-goal">' + datingEscape(ownProfile.goal || '') + '</span><span class="dating-own-edit">Редактировать анкету →</span></button>' : '';
    grid.innerHTML = ownCard + (profiles.length ? profiles.map(function(profile) {
        var image = datingPhotoSource(profile.photoUrl);
        return '<button type="button" class="dating-card" data-dating-profile="' + datingEscape(profile.uid) + '"><span class="dating-card-photo">' + (image ? '<img src="' + datingEscape(image) + '" alt="">' : '<span>' + datingEscape(Array.from(profile.name || '?')[0]) + '</span>') + '</span><span class="dating-card-name">' + datingEscape(profile.name) + '</span><span class="dating-card-meta">' + datingEscape(profile.gender) + ' · ' + datingEscape(profile.city) + ', ' + datingEscape(profile.country) + '</span><span class="dating-card-goal">' + datingEscape(profile.goal) + '</span>' + (profile.bio ? '<span class="dating-card-bio">' + datingEscape(profile.bio) + '</span>' : '') + '</button>';
    }).join('') : '<div class="dating-empty"><span>💗</span><strong>Пока нет подходящих анкет</strong><p>Попробуй изменить фильтры или загляни позже.</p></div>');
    var label = document.getElementById('datingResultsLabel');
    if (label) label.textContent = profiles.length + (profiles.length === 1 ? ' анкета' : profiles.length > 1 && profiles.length < 5 ? ' анкеты' : ' анкет');
    grid.querySelectorAll('[data-dating-profile]').forEach(function(card) {
        card.addEventListener('click', function() { openDatingDetail(card.getAttribute('data-dating-profile')); });
    });
    var ownCardButton = grid.querySelector('[data-dating-own]');
    if (ownCardButton) ownCardButton.addEventListener('click', openDatingProfileModal);
    var create = document.getElementById('datingCreateButton');
    if (create) create.textContent = ownProfile ? '✎ Редактировать анкету' : '＋ Создать анкету';
}

window.openDatingProfileModal = function() {
    var profile = datingProfiles[USER_UID] || {};
    document.getElementById('datingName').value = profile.name || USER || '';
    document.getElementById('datingGender').value = profile.gender || '';
    document.getElementById('datingSeeking').value = profile.seeking || '';
    document.getElementById('datingCountry').value = profile.country || '';
    document.getElementById('datingCity').value = profile.city || '';
    document.getElementById('datingGoal').value = profile.goal || '';
    var savedPhoto = datingPhotoSource(profile.photoUrl);
    datingCurrentPhotoUrl = savedPhoto;
    document.getElementById('datingPhotoUrl').value = datingSafeImage(savedPhoto) || '';
    document.getElementById('datingBio').value = profile.bio || '';
    document.getElementById('datingActive').checked = profile.isActive !== false;
    document.getElementById('datingAdultConfirmed').checked = profile.ageConfirmed === true;
    document.getElementById('datingError').textContent = '';
    document.getElementById('datingUploadStatus').textContent = '';
    document.getElementById('datingPhotoInput').value = '';
    renderDatingPhotoPreview(savedPhoto);
    updateDatingCityOptions();
    document.getElementById('datingProfileModal').classList.add('open');
};

function renderDatingPhotoPreview(url) {
    var container = document.getElementById('datingPhotoPreview');
    if (!container) return;
    container.replaceChildren();
    url = datingPhotoSource(url);
    if (!url) { container.hidden = true; return; }
    var image = document.createElement('img');
    image.src = url;
    image.alt = 'Предпросмотр фотографии анкеты';
    container.appendChild(image);
    container.hidden = false;
}

window.closeDatingProfileModal = function() {
    document.getElementById('datingProfileModal').classList.remove('open');
    if (datingPhotoPreviewUrl) URL.revokeObjectURL(datingPhotoPreviewUrl);
    datingPhotoPreviewUrl = null;
};

window.saveDatingProfile = function() {
    var error = document.getElementById('datingError');
    var saveButton = document.getElementById('datingSaveButton');
    var uploadStatus = document.getElementById('datingUploadStatus');
    var name = document.getElementById('datingName').value.trim();
    var gender = document.getElementById('datingGender').value;
    var seeking = document.getElementById('datingSeeking').value;
    var country = datingCountryCode(document.getElementById('datingCountry').value);
    var city = document.getElementById('datingCity').value.trim();
    var goal = document.getElementById('datingGoal').value;
    var photoUrlInput = document.getElementById('datingPhotoUrl').value.trim();
    var photoUrl = datingSafeImage(photoUrlInput) || datingCurrentPhotoUrl;
    var photoFile = document.getElementById('datingPhotoInput').files[0];
    var bio = document.getElementById('datingBio').value.trim();
    var ageConfirmed = document.getElementById('datingAdultConfirmed').checked;
    var isActive = document.getElementById('datingActive').checked;
    error.textContent = '';
    if (!USER_UID) { error.textContent = 'Войди в аккаунт, чтобы сохранить анкету.'; return; }
    var missingFields = [];
    if (!name) missingFields.push({ label: 'имя', id: 'datingName' });
    if (!gender) missingFields.push({ label: 'кто ты', id: 'datingGender' });
    if (!seeking) missingFields.push({ label: 'кого ищешь', id: 'datingSeeking' });
    if (!document.getElementById('datingCountry').value.trim()) missingFields.push({ label: 'страна', id: 'datingCountry' });
    if (!city) missingFields.push({ label: 'город', id: 'datingCity' });
    if (!goal) missingFields.push({ label: 'цель знакомства', id: 'datingGoal' });
    if (missingFields.length) {
        error.textContent = 'Заполни: ' + missingFields.map(function(field) { return field.label; }).join(', ') + '.';
        document.getElementById(missingFields[0].id).focus();
        return;
    }
    if (!country) {
        error.textContent = 'Не удалось распознать страну «' + document.getElementById('datingCountry').value.trim() + '». Выбери её из подсказок или введи название страны.';
        document.getElementById('datingCountry').focus();
        return;
    }
    if (!ageConfirmed) { error.textContent = 'Для раздела знакомств нужно подтвердить, что тебе исполнилось 18 лет.'; return; }
    if (!photoFile && !datingPhotoSource(photoUrl)) { error.textContent = 'Добавь фотографию по ссылке или выбери файл с устройства. Без фото анкету сохранить и опубликовать нельзя.'; document.getElementById('datingPhotoUrl').focus(); return; }
    if (photoUrlInput && !datingSafeImage(photoUrlInput) && !photoFile) { error.textContent = 'Укажи прямую ссылку на фото с https:// или http://.'; return; }
    if (photoFile && (!photoFile.type.match(/^image\//i) || photoFile.size >= 5 * 1024 * 1024)) { error.textContent = 'Выбери изображение размером меньше 5 МБ.'; return; }
    var profile = {
        name: name, gender: gender, seeking: seeking, countryCode: country.code, country: country.name,
        city: city, goal: goal, bio: bio, photoUrl: photoFile ? '' : (datingPhotoSource(photoUrl) || ''),
        ageConfirmed: true, isActive: isActive, feedPublished: isActive, updatedAt: Date.now()
    };
    saveButton.disabled = true;
    if (uploadStatus) uploadStatus.textContent = photoFile ? 'Подготавливаю фото для сохранения…' : 'Сохраняю анкету…';
    saveButton.textContent = photoFile ? 'Подготавливаю фото…' : 'Сохраняю…';
    var photoPromise = Promise.resolve(profile.photoUrl);
    if (photoFile) {
        photoPromise = datingCompressPhoto(photoFile).then(datingBlobToDataUrl);
    }
    photoPromise.then(function(url) {
        profile.photoUrl = url;
        if (uploadStatus) uploadStatus.textContent = photoFile ? 'Фото сжато. Сохраняю его вместе с анкетой…' : 'Сохраняю анкету…';
        saveButton.textContent = 'Сохраняю анкету…';
        var previousProfile = datingProfiles[USER_UID] || {};
        var feedPostId = profile.isActive ? (previousProfile.feedPostId || db.ref('sites/' + SITE + '/feed_posts').push().key) : previousProfile.feedPostId;
        if (feedPostId) profile.feedPostId = feedPostId;
        var updates = {};
        updates['sites/' + SITE + '/dating_private_profiles/' + USER_UID] = profile;
        updates['sites/' + SITE + '/dating_profiles/' + USER_UID] = profile.isActive ? profile : null;
        if (!profile.isActive && feedPostId) {
            updates['sites/' + SITE + '/feed_posts/' + feedPostId] = null;
            updates['sites/' + SITE + '/user_posts/' + USER_UID + '/' + feedPostId] = null;
            return db.ref().update(updates);
        }
        if (!profile.isActive || !feedPostId) return db.ref().update(updates);
        return db.ref('sites/' + SITE + '/feed_posts/' + feedPostId).once('value').then(function(snapshot) {
            var oldPost = snapshot.val() || {};
            var now = Date.now();
            var feedPost = Object.assign({}, oldPost, {
                author: USER || 'Пользователь', authorUid: USER_UID,
                text: oldPost.text || '', timestamp: oldPost.timestamp || now,
                likes: oldPost.likes || 0, commentCount: oldPost.commentCount || 0, reposts: oldPost.reposts || 0,
                hashtags: oldPost.hashtags || [], media: oldPost.media || [], repost: oldPost.repost || null,
                sharedEntity: {
                    kind: 'dating', id: USER_UID, title: profile.name + ' · ' + profile.goal,
                    description: profile.gender + ' · ищет: ' + profile.seeking + ' · ' + profile.city + ', ' + profile.country + (profile.bio ? ' · ' + profile.bio : ''),
                    image: datingPhotoSource(profile.photoUrl) || ''
                },
                deleted: null, deletedAt: null
            });
            updates['sites/' + SITE + '/feed_posts/' + feedPostId] = feedPost;
            updates['sites/' + SITE + '/user_posts/' + USER_UID + '/' + feedPostId] = feedPost;
            return db.ref().update(updates);
        });
    }).then(function() {
        datingProfiles[USER_UID] = profile;
        datingCurrentPhotoUrl = profile.photoUrl;
        window.closeDatingProfileModal();
        renderDatingProfiles();
        if (typeof window.loadFeed === 'function') window.loadFeed();
    }).catch(function(saveError) {
        console.error('Не удалось сохранить анкету знакомств:', saveError);
        error.textContent = saveError.code === 'PERMISSION_DENIED' || saveError.code === 'permission_denied'
            ? 'Firebase запретил запись фото или анкеты. Проверь опубликованные Database Rules.'
            : 'Не удалось сохранить анкету. ' + (saveError.message || 'Проверь подключение и попробуй ещё раз.');
    }).finally(function() {
        saveButton.disabled = false;
        saveButton.textContent = 'Сохранить анкету';
    });
};

function openDatingDetail(uid) {
    var profile = datingProfiles[uid];
    if (!profile) return;
    var image = datingPhotoSource(profile.photoUrl);
    var detail = document.getElementById('datingDetailContent');
    detail.innerHTML = '<div class="dating-detail-head">' + (image ? '<img src="' + datingEscape(image) + '" alt="">' : '<div class="dating-detail-initial">' + datingEscape(Array.from(profile.name || '?')[0]) + '</div>') + '<div><span class="dating-kicker">АНКЕТА · 18+</span><h2>' + datingEscape(profile.name) + '</h2><p>' + datingEscape(profile.gender) + ' · ищет: ' + datingEscape(profile.seeking) + '</p><p>📍 ' + datingEscape(profile.city) + ', ' + datingEscape(profile.country) + '</p></div></div><div class="dating-detail-goal">' + datingEscape(profile.goal) + '</div><p class="dating-detail-bio">' + datingEscape(profile.bio || 'Описание пока не добавлено.').replace(/\n/g, '<br>') + '</p><div class="dating-detail-actions"><button type="button" class="dating-primary" data-message-profile="' + datingEscape(uid) + '">Открыть профиль</button><button type="button" class="dating-secondary" data-report-profile="' + datingEscape(uid) + '">Пожаловаться</button><button type="button" class="dating-secondary dating-block" data-block-profile="' + datingEscape(uid) + '">Заблокировать</button></div>';
    document.getElementById('datingDetailModal').classList.add('open');
    detail.querySelector('[data-message-profile]').onclick = function() { closeDatingDetail(); if (typeof viewUserProfile === 'function') viewUserProfile(uid); };
    detail.querySelector('[data-report-profile]').onclick = function() { reportDatingProfile(uid); };
    detail.querySelector('[data-block-profile]').onclick = function() {
        blockDatingProfile(uid);
    };
}

function blockDatingProfile(uid) {
    if (!USER_UID || !uid || uid === USER_UID || !confirm('Заблокировать пользователя? Он исчезнет из списка знакомств.')) return;
    var updates = {};
    updates['sites/' + SITE + '/blocks/' + USER_UID + '/' + uid] = { blockedAt: Date.now() };
    updates['sites/' + SITE + '/friends/' + USER_UID + '/' + uid] = null;
    updates['sites/' + SITE + '/friends/' + uid + '/' + USER_UID] = null;
    updates['sites/' + SITE + '/friend_requests/' + USER_UID + '/' + uid] = null;
    updates['sites/' + SITE + '/friend_requests/' + uid + '/' + USER_UID] = null;
    updates['sites/' + SITE + '/subscriptions/' + USER_UID + '/' + uid] = null;
    updates['sites/' + SITE + '/subscribers/' + uid + '/' + USER_UID] = null;
    db.ref().update(updates).then(function() {
        datingBlocked[uid] = true;
        closeDatingDetail();
        renderDatingProfiles();
    }).catch(function(error) {
        console.error('Не удалось заблокировать анкету:', error);
        alert('Не удалось заблокировать пользователя.');
    });
}

function reportDatingProfile(uid) {
    var reason = prompt('Почему ты хочешь пожаловаться? Кратко опиши причину:');
    if (!reason || reason.trim().length < 3) return;
    var report = { reporterUid: USER_UID, reportedUid: uid, reason: reason.trim().slice(0, 500), createdAt: Date.now(), status: 'new' };
    db.ref('sites/' + SITE + '/dating_reports').push(report).then(function() { alert('Жалоба отправлена модераторам. Спасибо.'); }).catch(function(error) {
        console.error('Не удалось отправить жалобу:', error);
        alert('Не удалось отправить жалобу. Проверь Database Rules.');
    });
}

window.closeDatingDetail = function() { document.getElementById('datingDetailModal').classList.remove('open'); };

['datingCountryFilter', 'datingCityFilter', 'datingGoalFilter'].forEach(function(id) {
    var filter = document.getElementById(id);
    if (filter) filter.addEventListener('input', renderDatingProfiles);
    if (filter && filter.tagName === 'SELECT') filter.addEventListener('change', renderDatingProfiles);
});
var datingPhotoUrlInput = document.getElementById('datingPhotoUrl');
if (datingPhotoUrlInput) datingPhotoUrlInput.addEventListener('input', function() {
    var fileInput = document.getElementById('datingPhotoInput');
    if (fileInput) fileInput.value = '';
    datingCurrentPhotoUrl = datingSafeImage(datingPhotoUrlInput.value.trim());
    if (datingPhotoPreviewUrl) URL.revokeObjectURL(datingPhotoPreviewUrl);
    datingPhotoPreviewUrl = null;
    renderDatingPhotoPreview(datingPhotoUrlInput.value.trim());
    var uploadStatus = document.getElementById('datingUploadStatus');
    if (uploadStatus) uploadStatus.textContent = datingPhotoUrlInput.value.trim() ? 'Фото по ссылке выбрано.' : '';
});
var datingCountryInput = document.getElementById('datingCountry');
if (datingCountryInput) datingCountryInput.addEventListener('input', updateDatingCityOptions);
var datingPhotoInput = document.getElementById('datingPhotoInput');
if (datingPhotoInput) datingPhotoInput.addEventListener('change', function() {
    var file = datingPhotoInput.files && datingPhotoInput.files[0];
    if (!file) return;
    var error = document.getElementById('datingError');
    if (!file.type.match(/^image\//i) || file.size >= 5 * 1024 * 1024) {
        error.textContent = !file.type.match(/^image\//i) ? 'Выбери файл изображения.' : 'Размер фото должен быть меньше 5 МБ.';
        datingPhotoInput.value = '';
        return;
    }
    error.textContent = '';
    datingCurrentPhotoUrl = '';
    var uploadStatus = document.getElementById('datingUploadStatus');
    if (uploadStatus) uploadStatus.textContent = 'Фото выбрано. Сжатие начнётся при сохранении анкеты.';
    document.getElementById('datingPhotoUrl').value = '';
    if (datingPhotoPreviewUrl) URL.revokeObjectURL(datingPhotoPreviewUrl);
    datingPhotoPreviewUrl = URL.createObjectURL(file);
    renderDatingPhotoPreview(datingPhotoPreviewUrl);
});
